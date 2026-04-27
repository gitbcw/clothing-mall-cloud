var util = require('../../../utils/util.js');
var api = require('../../../config/api.js');

var TYPE_TABS = [
  { key: -1, label: '全部' },
  { key: 0, label: '通用' },
  { key: 1, label: '新人' },
  { key: 2, label: '兑换' },
  { key: 4, label: '生日' }
];

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    tabs: TYPE_TABS,
    activeTab: -1,
    couponList: [],
    loading: true,
    page: 1,
    limit: 20,
    total: 0,
    hasMore: true
  },

  onLoad: function() {
    var system = wx.getDeviceInfo().system || '';
    var statusBarHeight = wx.getWindowInfo().statusBarHeight;
    var isIOS = system.indexOf('iOS') > -1;
    this.setData({
      statusBarHeight: statusBarHeight,
      navBarHeight: isIOS ? 44 : 48
    });
    this.loadCoupons();
  },

  loadCoupons: function() {
    var that = this;
    that.setData({ loading: true, page: 1 });
    var params = { page: 1, limit: that.data.limit };
    if (that.data.activeTab >= 0) {
      params.type = that.data.activeTab;
    }
    util.request(api.ManagerCouponList, params, 'GET').then(function(res) {
      var data = res.data || {};
      var list = (data.list || []).map(function(item) {
        if (item.time_type === 0) {
          item.timeText = '领取后' + (item.days || 0) + '天有效';
        } else if (item.start_time && item.end_time) {
          item.timeText = item.start_time.slice(0, 10) + ' ~ ' + item.end_time.slice(0, 10);
        }
        return item;
      });
      that.setData({
        couponList: list,
        total: data.total || 0,
        page: 1,
        hasMore: (data.list || []).length >= that.data.limit,
        loading: false
      });
    }).catch(function() {
      that.setData({ loading: false });
    });
  },

  onReachBottom: function() {
    if (!this.data.hasMore || this.data.loading) return;
    var that = this;
    var nextPage = that.data.page + 1;
    that.setData({ loading: true });
    var params = { page: nextPage, limit: that.data.limit };
    if (that.data.activeTab >= 0) {
      params.type = that.data.activeTab;
    }
    util.request(api.ManagerCouponList, params, 'GET').then(function(res) {
      var data = res.data || {};
      var newList = (data.list || []).map(function(item) {
        if (item.time_type === 0) {
          item.timeText = '领取后' + (item.days || 0) + '天有效';
        } else if (item.start_time && item.end_time) {
          item.timeText = item.start_time.slice(0, 10) + ' ~ ' + item.end_time.slice(0, 10);
        }
        return item;
      });
      that.setData({
        couponList: that.data.couponList.concat(newList),
        page: nextPage,
        hasMore: newList.length >= that.data.limit,
        loading: false
      });
    }).catch(function() {
      that.setData({ loading: false });
    });
  },

  onPullDownRefresh: function() {
    this.loadCoupons();
    wx.stopPullDownRefresh();
  },

  onTabChange: function(e) {
    var key = e.currentTarget.dataset.key;
    this.setData({ activeTab: key });
    this.loadCoupons();
  },

  onAddCoupon: function() {
    wx.navigateTo({ url: '/pages/manager/couponEdit/couponEdit' });
  },

  onEditCoupon: function(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/manager/couponEdit/couponEdit?id=' + id });
  },

  onDeleteCoupon: function(e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定删除该优惠券？',
      confirmColor: '#E8494A',
      success: function(res) {
        if (res.confirm) {
          util.request(api.ManagerCouponDelete, { id: id }, 'POST').then(function() {
            wx.showToast({ title: '已删除', icon: 'success' });
            that.loadCoupons();
          });
        }
      }
    });
  },

  getTypeLabel: function(type) {
    var tab = TYPE_TABS.find(function(t) { return t.key === type; });
    return tab ? tab.label : '未知';
  },

  onBack: function() {
    wx.navigateBack();
  }
});
