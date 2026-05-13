var api = require("../../../config/api.js");
var util = require("../../../utils/util.js");
var user = require("../../../utils/user.js");

var app = getApp();
Page({
  data: {
    mobile: "",
    code: "",
    countdown: 0,
    agreement: false,
    loginErrorCount: 0,
    statusBarHeight: 20,
    navContentHeight: 48,
    navTotalHeight: 68,
    navTitle: "登录",
  },
  onLoad: function (options) {
    // 页面初始化 options为页面跳转所带来的参数
    // 页面渲染完成
    const { statusBarHeight: sbh } = wx.getWindowInfo();
    const statusBarHeight = sbh || 20;
    const navContentHeight = this.data.navContentHeight;
    const navTotalHeight = statusBarHeight + navContentHeight;
    this.setData({ statusBarHeight, navTotalHeight });
  },
  onReady: function () {},
  onShow: function () {
    // 页面显示
  },
  onHide: function () {
    // 页面隐藏
  },
  onUnload: function () {
    // 页面关闭
    if (this.timer) {
      clearInterval(this.timer);
    }
  },
  bindMobileInput: function (e) {
    this.setData({
      mobile: e.detail.value,
    });
  },
  bindCodeInput: function (e) {
    this.setData({
      code: e.detail.value,
    });
  },
  bindAgreementChange: function (e) {
    this.setData({
      agreement: e.detail.value.length > 0
    });
  },
  goAgreement: function () {
    wx.navigateTo({ url: '/pages/agreement/agreement?type=agreement' });
  },
  goPrivacy: function () {
    util.openPrivacyContract('/pages/agreement/agreement?type=privacy');
  },
  sendCode: function () {
    if (this.data.countdown > 0) return;
    if (!this.data.mobile || this.data.mobile.length !== 11) {
      util.showErrorToast('请输入正确的手机号');
      return;
    }
    
    var that = this;
    util.ensurePrivacyAuthorized({
      message: '发送手机号验证码前，请先阅读并同意小程序用户隐私保护指引。'
    }).then(function() {
      // 模拟发送验证码
      wx.showToast({ title: '发送成功', icon: 'success' });
      that.setData({ countdown: 60 });
      that.timer = setInterval(() => {
        if (that.data.countdown <= 1) {
          clearInterval(that.timer);
          that.setData({ countdown: 0 });
        } else {
          that.setData({ countdown: that.data.countdown - 1 });
        }
      }, 1000);
    }).catch(function() {});
  },
  accountLogin: function () {
    var that = this;

    if (!this.data.agreement) {
      util.showErrorToast('请阅读并同意协议');
      return;
    }

    if (this.data.mobile.length < 1 || this.data.code.length < 1) {
      wx.showModal({
        title: "错误信息",
        content: "请输入手机号和验证码",
        showCancel: false,
      });
      return false;
    }

    util.ensurePrivacyAuthorized({
      message: '手机号登录前，请先阅读并同意小程序用户隐私保护指引。'
    }).then(function() {
      // 这里由于后端可能还是使用 username/password 接口，暂时做映射
      return util.request(api.AuthLoginByAccount, {
        username: that.data.mobile,
        password: that.data.code,
      }, "POST")
    }).then(function (res) {
      if (res.errno == 0) {
        that.setData({
          loginErrorCount: 0,
        });
        app.globalData.hasLogin = true;
        wx.setStorageSync("userInfo", res.data.userInfo);
        wx.setStorageSync("token", res.data.token);
        wx.switchTab({
          url: "/pages/mine/mine",
        });
      } else {
        that.setData({
          loginErrorCount: that.data.loginErrorCount + 1,
        });
        app.globalData.hasLogin = false;
        util.showErrorToast("登录失败");
      }
    }).catch(function (err) {
      that.setData({
        loginErrorCount: that.data.loginErrorCount + 1,
      });
      if (!err || err.errmsg !== 'privacy authorization denied') {
        util.showErrorToast("登录失败");
      }
    });
  },
  clearInput: function (e) {
    switch (e.currentTarget.id) {
      case "clear-mobile":
        this.setData({
          mobile: "",
        });
        break;
    }
  },
  handleBack: function () {
    wx.navigateBack({ delta: 1 });
  },
});
