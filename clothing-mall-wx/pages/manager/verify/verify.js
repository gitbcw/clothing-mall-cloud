var util = require('../../../utils/util.js');
var api = require('../../../config/api.js');

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    pickupCode: '',
    verifying: false,
    verifyResult: null,
    resultType: '', // 'success' | 'error'
    recentList: []
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

  onInputCode: function(e) {
    this.setData({ pickupCode: e.detail.value.trim() });
  },

  onScanCode: function() {
    var that = this;
    wx.scanCode({
      onlyFromCamera: false,
      scanType: ['qrCode', 'barCode'],
      success: function(res) {
        var code = res.result || '';
        that.setData({ pickupCode: code });
        that.onVerify();
      }
    });
  },

  onVerify: function() {
    var that = this;
    var code = this.data.pickupCode;

    if (!code) {
      wx.showToast({ title: '请输入核销码', icon: 'none' });
      return;
    }

    that.setData({ verifying: true, verifyResult: null, resultType: '' });

    util.request(api.ManagerOrderVerify, {
      pickupCode: code
    }, 'POST').then(function(res) {
      that.setData({ verifying: false });
      if (res.errno === 0) {
        var orderData = res.data || {};
        that.setData({
          verifyResult: orderData,
          resultType: 'success',
          pickupCode: ''
        });
        that.addRecent(orderData);
        wx.showToast({ title: '核销成功', icon: 'success' });
      } else {
        that.setData({
          verifyResult: { errmsg: res.errmsg || '核销失败' },
          resultType: 'error'
        });
        wx.showToast({ title: res.errmsg || '核销失败', icon: 'none' });
      }
    }).catch(function() {
      that.setData({
        verifying: false,
        verifyResult: { errmsg: '网络异常，请重试' },
        resultType: 'error'
      });
    });
  },

  addRecent: function(orderData) {
    var list = this.data.recentList.slice();
    list.unshift({
      orderId: orderData.orderId || '',
      orderSn: orderData.orderSn || '',
      pickupCode: this.data.pickupCode || orderData.pickupCode || '',
      verifyTime: this.formatNow()
    });
    if (list.length > 20) {
      list = list.slice(0, 20);
    }
    this.setData({ recentList: list });
  },

  formatNow: function() {
    var d = new Date();
    var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  },

  onClearResult: function() {
    this.setData({ verifyResult: null, resultType: '' });
  },

  onBack: function() {
    wx.navigateBack();
  }
});
