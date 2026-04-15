var util = require('../../../utils/util.js');
var api = require('../../../config/api.js');

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    uploading: false,
    saving: false,
    form: {
      activityBgImage: ''
    }
  },

  onLoad: function() {
    var system = wx.getDeviceInfo().system || '';
    var statusBarHeight = wx.getWindowInfo().statusBarHeight;
    var isIOS = system.indexOf('iOS') > -1;
    this.setData({
      statusBarHeight: statusBarHeight,
      navBarHeight: isIOS ? 44 : 48
    });
    this.loadConfig();
  },

  loadConfig: function() {
    var that = this;
    util.request(api.ManagerSystemConfigList, { group: 'home' }).then(function(res) {
      if (res.errno === 0) {
        var configs = res.data.configs || {};
        that.setData({
          'form.activityBgImage': configs.litemall_home_activity_bg_image || ''
        });
      }
    });
  },

  onChooseBgImage: function() {
    var that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        var tempFilePath = res.tempFiles[0].tempFilePath;
        that.setData({ uploading: true });
        util.uploadFile(tempFilePath).then(function(url) {
          that.setData({
            'form.activityBgImage': url,
            uploading: false
          });
        }).catch(function() {
          that.setData({ uploading: false });
          wx.showToast({ title: '上传失败', icon: 'none' });
        });
      }
    });
  },

  onRemoveBgImage: function() {
    this.setData({ 'form.activityBgImage': '' });
  },

  onSave: function() {
    var that = this;
    if (that.data.saving) return;

    that.setData({ saving: true });

    util.request(api.ManagerSystemConfigUpdate, {
      group: 'home',
      configs: {
        litemall_home_activity_bg_image: that.data.form.activityBgImage
      }
    }).then(function(res) {
      that.setData({ saving: false });
      if (res.errno === 0) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(function() {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({ title: res.errmsg || '保存失败', icon: 'none' });
      }
    }).catch(function() {
      that.setData({ saving: false });
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  },

  onBack: function() {
    wx.navigateBack();
  }
});
