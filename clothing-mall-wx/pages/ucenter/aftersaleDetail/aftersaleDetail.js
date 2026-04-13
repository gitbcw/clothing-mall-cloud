var util = require('../../../utils/util.js');
var api = require('../../../config/api.js');

Page({
  data: {
    orderId: 0,
    order: {},
    orderGoods: [],
    aftersale: {},
    statusColumns: ['可申请', '已申请，待审核', '审核通过，待补发', '换货已发货', '审核不通过，已拒绝', '已取消', '换货完成'],
    typeColumns: ['同款换货', '换其他商品', '商品有瑕疵', '其他原因'],
    fileList: []
  },
  onLoad: function (options) {
    // 页面初始化 options为页面跳转所带来的参数
    this.setData({
      orderId: options.id
    });
    this.getAftersaleDetail();
  },
  getAftersaleDetail: function () {
    let that = this;
    wx.showLoading({ title: '加载中' });

    util.request(api.AftersaleDetail, {
      orderId: that.data.orderId
    }).then(function (res) {
      wx.hideLoading();
      if (res.errno === 0) {
        var pictures = res.data.aftersale.pictures || [];
        var _fileList = pictures.map(function (v) {
          return { url: v };
        });

        var aftersale = res.data.aftersale;
        if (aftersale.addTime) {
          aftersale.addTime = util.formatTime(new Date(aftersale.addTime));
        }

        that.setData({
          order: res.data.order,
          orderGoods: res.data.orderGoods,
          aftersale: aftersale,
          fileList: _fileList
        });
      } else {
        wx.showToast({ title: res.errmsg || '加载失败', icon: 'none' });
      }
    }).catch(function () {
      wx.hideLoading();
      wx.showToast({ title: '网络异常', icon: 'none' });
    });
  },
  goLogistics: function () {
    var a = this.data.aftersale;
    if (!a || !a.shipSn) return;
    wx.navigateTo({
      url: '/pages/ucenter/logistics/logistics?shipChannel=' + encodeURIComponent(a.shipChannel) + '&shipSn=' + encodeURIComponent(a.shipSn)
    });
  },
  onReady: function () {
    // 页面渲染完成
  },
  onShow: function () {
    // 页面显示
  },
  onHide: function () {
    // 页面隐藏
  },
  onUnload: function () {
    // 页面关闭
  }
})
