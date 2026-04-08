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
    if (options.orderId) {
      this.setData({ orderId: options.orderId });
      this.getLogistics();
    }
  },

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
          expName: info.ShipperName || '',
          expNo: info.LogisticCode || '',
          traces: info.Traces || []
        });
      }
    }).catch(function() {
      wx.hideLoading();
      wx.showToast({ title: '获取物流信息失败', icon: 'none' });
    });
  }
});
