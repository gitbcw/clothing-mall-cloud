var util = require('../../../utils/util.js');
var api = require('../../../config/api.js');

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    contentType: 'card', // 'card' | 'text'
    tags: [],
    pages: [],
    groups: [],
    form: {
      title: '',
      content: '',
      mediaId: '',
      mediaUrl: '',
      page: '',
      targetGroupIds: [],
      scheduledAt: ''
    },
    scheduledEnabled: false,
    uploading: false,
    sending: false
  },

  onLoad: function() {
    var system = wx.getDeviceInfo().system || '';
    var statusBarHeight = wx.getWindowInfo().statusBarHeight;
    var isIOS = system.indexOf('iOS') > -1;
    this.setData({
      statusBarHeight: statusBarHeight,
      navBarHeight: isIOS ? 44 : 48
    });

    this.loadTags();
    this.loadPages();
    this.loadGroups();
  },

  loadTags: function() {
    var that = this;
    util.request(api.ManagerWeWorkTags, {}, 'GET').then(function(res) {
      that.setData({
        tags: (res.data && res.data.list) || []
      });
    });
  },

  loadPages: function() {
    var that = this;
    util.request(api.ManagerWeWorkPages, {}, 'GET').then(function(res) {
      that.setData({
        pages: (res.data && res.data.list) || []
      });
    });
  },

  loadGroups: function() {
    var that = this;
    util.request(api.ManagerWeWorkPushGroups, {}, 'GET').then(function(res) {
      that.setData({
        groups: (res.data && res.data.list) || []
      });
    });
  },

  onSwitchContentType: function(e) {
    var type = e.currentTarget.dataset.type;
    this.setData({ contentType: type });
  },

  onInputTitle: function(e) {
    this.setData({ 'form.title': e.detail.value });
  },

  onInputContent: function(e) {
    this.setData({ 'form.content': e.detail.value });
  },

  onPageChange: function(e) {
    var index = e.detail.value;
    var pageItem = this.data.pages[index];
    this.setData({ 'form.page': pageItem.path || pageItem.url || '' });
  },

  onChooseImage: function() {
    var that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        var tempFilePath = res.tempFiles[0].tempFilePath;
        that.setData({ uploading: true });
        that.uploadToWeWork(tempFilePath);
      }
    });
  },

  uploadToWeWork: function(filePath) {
    var that = this;
    wx.uploadFile({
      url: api.ManagerWeWorkUploadMedia,
      filePath: filePath,
      name: 'file',
      header: {
        'X-Litemall-Token': wx.getStorageSync('token')
      },
      success: function(res) {
        try {
          var data = JSON.parse(res.data);
          if (data.errno === 0) {
            that.setData({
              'form.mediaId': data.data.mediaId || '',
              'form.mediaUrl': data.data.url || filePath,
              uploading: false
            });
          } else {
            wx.showToast({ title: data.errmsg || '上传失败', icon: 'none' });
            that.setData({ uploading: false });
          }
        } catch (e) {
          wx.showToast({ title: '上传失败', icon: 'none' });
          that.setData({ uploading: false });
        }
      },
      fail: function() {
        wx.showToast({ title: '上传失败', icon: 'none' });
        that.setData({ uploading: false });
      }
    });
  },

  onRemoveImage: function() {
    this.setData({
      'form.mediaId': '',
      'form.mediaUrl': ''
    });
  },

  onToggleGroup: function(e) {
    var groupId = e.currentTarget.dataset.id;
    var selected = this.data.form.targetGroupIds.slice();
    var index = selected.indexOf(groupId);
    if (index > -1) {
      selected.splice(index, 1);
    } else {
      selected.push(groupId);
    }
    this.setData({ 'form.targetGroupIds': selected });
  },

  onToggleScheduled: function() {
    this.setData({ scheduledEnabled: !this.data.scheduledEnabled });
    if (!this.data.scheduledEnabled) {
      this.setData({ 'form.scheduledAt': '' });
    }
  },

  onDateChange: function(e) {
    this.setData({ 'form.scheduledAt': e.detail.value });
  },

  onSend: function() {
    var that = this;
    var form = this.data.form;
    var contentType = this.data.contentType;

    if (contentType === 'card') {
      if (!form.title || !form.title.trim()) {
        wx.showToast({ title: '请输入卡片标题', icon: 'none' });
        return;
      }
    } else {
      if (!form.content || !form.content.trim()) {
        wx.showToast({ title: '请输入消息内容', icon: 'none' });
        return;
      }
    }

    if (that.data.form.targetGroupIds.length === 0) {
      wx.showToast({ title: '请选择推送分组', icon: 'none' });
      return;
    }

    that.setData({ sending: true });

    var requestData = {
      contentType: contentType,
      targetGroupIds: form.targetGroupIds,
      title: form.title || '',
      content: form.content || '',
      mediaId: form.mediaId || '',
      page: form.page || '',
      scheduledAt: that.data.scheduledEnabled ? form.scheduledAt : ''
    };

    util.request(api.ManagerWeWorkSendMessage, requestData, 'POST').then(function(res) {
      that.setData({ sending: false });
      if (res.errno === 0) {
        wx.showToast({ title: '推送成功', icon: 'success' });
        setTimeout(function() {
          wx.navigateBack();
        }, 1200);
      } else {
        wx.showToast({ title: res.errmsg || '推送失败', icon: 'none' });
      }
    }).catch(function() {
      that.setData({ sending: false });
    });
  },

  onBack: function() {
    wx.navigateBack();
  }
});
