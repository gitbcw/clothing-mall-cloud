var util = require('../../../utils/util.js');
var check = require('../../../utils/check.js');
var api = require('../../../config/api.js');

var app = getApp();

Page({
  data: {
    array: ['请选择反馈类型', '商品相关', '功能异常', '优化建议', '其他'],
    index: 0,
    content: '',
    contentLength: 0,
    mobile: '',
    hasPicture: false,
    picUrls: [],
    files: [],
    submitting: false
  },
  chooseImage: function(e) {
    if (this.data.files.length >= 5) {
      util.showErrorToast('只能上传五张图片')
      return false;
    }

    var that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        that.setData({
          files: that.data.files.concat(res.tempFilePaths)
        });
        that.upload(res);
      }
    })
  },
  upload: function(res) {
    var that = this;
    util.uploadFile(res.tempFilePaths[0]).then(function(url) {
      that.data.picUrls.push(url);
      that.setData({
        hasPicture: true,
        picUrls: that.data.picUrls
      });
    });
  },
  previewImage: function(e) {
    wx.previewImage({
      current: e.currentTarget.id, // 当前显示图片的http链接
      urls: this.data.files // 需要预览的图片http链接列表
    })
  },
  bindPickerChange: function(e) {
    this.setData({
      index: e.detail.value
    });
  },
  mobileInput: function(e) {
    this.setData({
      mobile: e.detail.value
    });
  },
  contentInput: function(e) {
    this.setData({
      contentLength: e.detail.cursor,
      content: e.detail.value,
    });
  },
  clearMobile: function(e) {
    this.setData({
      mobile: ''
    });
  },
  submitFeedback: function(e) {
    if (!app.globalData.hasLogin) {
      wx.navigateTo({
        url: "/pages/auth/login/login"
      });
      return false;
    }

    if (this.data.submitting) {
      return false;
    }

    let that = this;
    if (that.data.index == 0) {
      util.showErrorToast('请选择反馈类型');
      return false;
    }

    if (that.data.content == '') {
      util.showErrorToast('请输入反馈内容');
      return false;
    }

    if (that.data.mobile == '') {
      util.showErrorToast('请输入手机号码');
      return false;
    }

    this.setData({
      submitting: true
    });

    wx.showLoading({
      title: '提交中...',
      mask: true,
      success: function() {

      }
    });

    util.request(api.FeedbackAdd, {
      mobile: that.data.mobile,
      feedType: that.data.array[that.data.index],
      content: that.data.content,
      hasPicture: that.data.hasPicture,
      picUrls: that.data.picUrls
    }, 'POST').then(function(res) {
      wx.hideLoading();

      if (res.errno === 0) {
        wx.showToast({
          title: '感谢您的反馈！',
          icon: 'success',
          duration: 2000,
          complete: function() {
            that.setData({
              index: 0,
              content: '',
              contentLength: 0,
              mobile: '',
              hasPicture: false,
              picUrls: [],
              files: [],
              submitting: false
            });
          }
        });
      } else {
        that.setData({
          submitting: false
        });
        util.showErrorToast(res.errmsg);
      }
    }).catch(function() {
      wx.hideLoading();
      that.setData({
        submitting: false
      });
      util.showErrorToast('提交失败');
    });
  },
  onLoad: function(options) {
  },
  onReady: function() {

  },
  onShow: function() {

  },
  onHide: function() {
    // 页面隐藏

  },
  onUnload: function() {
    // 页面关闭
  }
})
