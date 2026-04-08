var util = require('../../../utils/util.js');
var api = require('../../../config/api.js');

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    issueList: [],
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
    this.loadIssues();
  },

  onPullDownRefresh: function() {
    this.loadIssues();
  },

  loadIssues: function() {
    var that = this;
    that.setData({ loading: true });
    util.request(api.ManagerIssueList, {
      page: 1,
      limit: 100,
      sort: 'add_time',
      order: 'desc'
    }, 'GET').then(function(res) {
      that.setData({
        issueList: (res.data && res.data.list) || [],
        loading: false
      });
      wx.stopPullDownRefresh();
    }).catch(function() {
      that.setData({ loading: false });
      wx.stopPullDownRefresh();
    });
  },

  onAddIssue: function() {
    wx.navigateTo({ url: '/pages/manager/issueEdit/issueEdit' });
  },

  onIssueTap: function(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/manager/issueEdit/issueEdit?id=' + id });
  },

  onDeleteIssue: function(e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定删除该问题？',
      confirmColor: '#E8494A',
      success: function(res) {
        if (res.confirm) {
          util.request(api.ManagerIssueDelete, { id: id }, 'POST').then(function() {
            wx.showToast({ title: '已删除', icon: 'success' });
            that.loadIssues();
          });
        }
      }
    });
  },

  onBack: function() {
    wx.navigateBack();
  }
});
