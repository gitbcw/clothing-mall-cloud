var util = require('../../../utils/util.js');
var api = require('../../../config/api.js');
var homeRefresh = require('../../../utils/home-refresh.js');

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    holidayList: [],
    loading: true
  },

  onLoad: function() {
    var system = wx.getDeviceInfo().system || '';
    var statusBarHeight = wx.getWindowInfo().statusBarHeight;
    var isIOS = system.indexOf('iOS') > -1;
    this.setData({
      statusBarHeight: statusBarHeight,
      navBarHeight: isIOS ? 44 : 48
    });
  },

  onShow: function() {
    this.loadHolidays();
  },

  loadHolidays: function() {
    var that = this;
    that.setData({ loading: true });
    util.request(api.ManagerHolidayList, {}, 'GET').then(function(res) {
      var list = (res.data && res.data.list) || [];
      // 计算状态
      var today = new Date().toISOString().slice(0, 10);
      list.forEach(function(item) {
        if (!item.enabled) {
          item.statusText = '已禁用';
          item.statusType = 'off';
        } else if (item.start_date > today) {
          item.statusText = '未开始';
          item.statusType = 'upcoming';
        } else if (item.end_date < today) {
          item.statusText = '已结束';
          item.statusType = 'ended';
        } else {
          item.statusText = '进行中';
          item.statusType = 'active';
        }
      });
      that.setData({
        holidayList: list,
        loading: false
      });
    }).catch(function() {
      that.setData({ loading: false });
    });
  },

  onAddHoliday: function() {
    wx.navigateTo({ url: '/pages/manager/holidayEdit/holidayEdit' });
  },

  onHolidayTap: function(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/manager/holidayEdit/holidayEdit?id=' + id });
  },

  onToggleEnable: function(e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    var enabled = e.currentTarget.dataset.enabled;
    util.request(api.ManagerHolidayEnable, {
      id: id,
      enabled: !enabled
    }, 'POST').then(function() {
      homeRefresh.markHomeRefreshNeeded();
      that.loadHolidays();
    });
  },

  onDeleteHoliday: function(e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定删除该节日活动？',
      confirmColor: '#E8494A',
      success: function(res) {
        if (res.confirm) {
          util.request(api.ManagerHolidayDelete, { id: id }, 'POST').then(function() {
            wx.showToast({ title: '已删除', icon: 'success' });
            homeRefresh.markHomeRefreshNeeded();
            that.loadHolidays();
          });
        }
      }
    });
  },

  onBack: function() {
    wx.navigateBack();
  }
});
