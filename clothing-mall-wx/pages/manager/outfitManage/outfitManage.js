var util = require('../../../utils/util.js');
var api = require('../../../config/api.js');

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    outfitList: [],
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
    this.loadOutfits();
  },

  loadOutfits: function() {
    var that = this;
    that.setData({ loading: true });
    util.request(api.ManagerOutfitList, {}, 'GET').then(function(res) {
      that.setData({
        outfitList: res.data || [],
        loading: false
      });
    }).catch(function() {
      that.setData({ loading: false });
    });
  },

  onAddOutfit: function() {
    var count = this.data.outfitList.length;
    wx.navigateTo({ url: '/pages/manager/outfitEdit/outfitEdit?count=' + count });
  },

  onOutfitTap: function(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/manager/outfitEdit/outfitEdit?id=' + id });
  },

  onToggleStatus: function(e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    var status = e.currentTarget.dataset.status;
    util.request(api.ManagerOutfitStatus, {
      id: id,
      status: status === 1 ? 0 : 1
    }, 'POST').then(function() {
      that.loadOutfits();
    });
  },

  onDeleteOutfit: function(e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定删除该穿搭？',
      confirmColor: '#E8494A',
      success: function(res) {
        if (res.confirm) {
          util.request(api.ManagerOutfitDelete, { id: id }, 'POST').then(function() {
            wx.showToast({ title: '已删除', icon: 'success' });
            that.loadOutfits();
          });
        }
      }
    });
  },

  onBack: function() {
    wx.navigateBack();
  }
});
