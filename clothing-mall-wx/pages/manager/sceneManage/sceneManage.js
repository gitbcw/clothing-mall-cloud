var util = require('../../../utils/util.js');
var api = require('../../../config/api.js');

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    sceneList: [],
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
    this.loadScenes();
  },

  loadScenes: function() {
    var that = this;
    that.setData({ loading: true });
    util.request(api.ManagerSceneList, {}, 'GET').then(function(res) {
      that.setData({
        sceneList: res.data || [],
        loading: false
      });
    }).catch(function() {
      that.setData({ loading: false });
    });
  },

  onAddScene: function() {
    var count = this.data.sceneList.length;
    wx.navigateTo({ url: '/pages/manager/sceneEdit/sceneEdit?count=' + count });
  },

  onSceneTap: function(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/manager/sceneEdit/sceneEdit?id=' + id });
  },

  onToggleEnable: function(e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    var enabled = e.currentTarget.dataset.enabled;
    util.request(api.ManagerSceneEnable, {
      id: id,
      enabled: !enabled
    }, 'POST').then(function(res) {
      that.loadScenes();
    });
  },

  onDeleteScene: function(e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定删除该场景？',
      confirmColor: '#E8494A',
      success: function(res) {
        if (res.confirm) {
          util.request(api.ManagerSceneDelete, { id: id }, 'POST').then(function() {
            wx.showToast({ title: '已删除', icon: 'success' });
            that.loadScenes();
          });
        }
      }
    });
  },

  onBack: function() {
    wx.navigateBack();
  }
});
