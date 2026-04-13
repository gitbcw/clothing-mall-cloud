var util = require('../../../utils/util.js');
var api = require('../../../config/api.js');

Page({
  data: {
    orderId: 0,
    expName: '',
    expNo: '',
    traces: []
  },

  onLoad: function(options) {
    if (options.shipChannel && options.shipSn) {
      // 直接传参模式（售后换货物流等场景）
      this.setData({
        expName: decodeURIComponent(options.shipChannel),
        expNo: decodeURIComponent(options.shipSn)
      });
      this.getLogisticsBySn();
    } else if (options.orderId) {
      this.setData({ orderId: options.orderId });
      this.getLogistics();
    }
  },

  // 通过 orderId 查物流
  getLogistics: function() {
    var that = this;
    wx.showLoading({ title: '加载中' });

    util.request(api.ExpressQuery, {
      orderId: that.data.orderId
    }).then(function(res) {
      wx.hideLoading();
      if (res.errno === 0 && res.data) {
        var info = res.data;
        that.setData({
          expName: info.shipChannel || '',
          expNo: info.shipSn || '',
          traces: info.expressInfo || []
        });
      }
    }).catch(function() {
      wx.hideLoading();
      wx.showToast({ title: '获取物流信息失败', icon: 'none' });
    });
  },

  // 直接通过快递公司+单号查物流（售后场景）
  getLogisticsBySn: function() {
    var that = this;
    wx.showLoading({ title: '加载中' });

    util.request(api.ExpressQuery, {
      shipChannel: that.data.expName,
      shipSn: that.data.expNo
    }).then(function(res) {
      wx.hideLoading();
      if (res.errno === 0 && res.data) {
        var info = res.data;
        that.setData({
          traces: info.expressInfo || []
        });
      }
    }).catch(function() {
      wx.hideLoading();
      wx.showToast({ title: '获取物流信息失败', icon: 'none' });
    });
  }
});
