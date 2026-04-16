var util = require('../../../utils/util.js');
var api = require('../../../config/api.js');
var tracker = require('../../../utils/tracker.js');

Page({
  data: {
    orderId: 0,
    orderInfo: {},
    orderGoods: [],
    expressInfo: {},
    flag: false,
    handleOption: {},
    pickupStore: null,
    defaultImage: '/static/images/fallback-image.svg',
    latestTrace: '',
    aftersaleStatusText: '',
    aftersaleStatusColor: '#FF8096',
    aftersaleStatus: 0,
    aftersaleStatusColumns: ['可申请', '已申请，待审核', '审核通过，待补发', '换货已发货', '审核不通过，已拒绝', '已取消', '换货完成']
  },
  onLoad: function(options) {
    // 页面初始化 options为页面跳转所带来的参数
    this.setData({
      orderId: options.id
    });
    this.getOrderDetail();
  },
  onPullDownRefresh() {
    wx.showNavigationBarLoading() //在标题栏中显示加载
    this.getOrderDetail();
    wx.hideNavigationBarLoading() //完成停止加载
    wx.stopPullDownRefresh() //停止下拉刷新
  },
  expandDetail: function() {
    let that = this;
    this.setData({
      flag: !that.data.flag
    })
  },
  goLogistics: function() {
    wx.navigateTo({
      url: '/pages/ucenter/logistics/logistics?orderId=' + this.data.orderId
    });
  },
  getOrderDetail: function() {
    wx.showLoading({
      title: '加载中',
    });

    setTimeout(function() {
      wx.hideLoading()
    }, 2000);

    let that = this;
    util.request(api.OrderDetail, {
      orderId: that.data.orderId
    }).then(function(res) {
      if (res.errno === 0) {
        console.log(res.data);
        const orderInfo = res.data.orderInfo;
        const expressInfo = res.data.expressInfo || [];

        // 提取最新一条物流轨迹摘要
        var latestTrace = '';
        if (Array.isArray(expressInfo) && expressInfo.length > 0) {
          latestTrace = expressInfo[0].AcceptStation || '';
        }

        // 如果是自提订单，获取门店信息
        if (orderInfo.deliveryType === 'pickup' && orderInfo.pickupStoreId) {
          that.getPickupStore(orderInfo.pickupStoreId);
        }

        // 已发货订单自动查询物流
        if (orderInfo.expNo && orderInfo.deliveryType !== 'pickup') {
          that.queryExpress();
        }

        that.setData({
          orderInfo: res.data.orderInfo,
          latestTrace: latestTrace,
          orderGoods: res.data.orderGoods.map(function(goods) {
            // 格式化规格显示：优先 size，否则将 specifications 数组拼接
            var specStr = '';
            if (goods.size) {
              specStr = goods.size;
            } else if (Array.isArray(goods.specifications) && goods.specifications.length > 0) {
              specStr = goods.specifications.join(' / ');
            }
            goods.specificationsStr = specStr;
            return goods;
          }),
          handleOption: res.data.orderInfo.handleOption,
          expressInfo: expressInfo
        });
        // 设置售后状态文字和颜色
        var aftersaleStatus = res.data.orderInfo.aftersaleStatus;
        if (aftersaleStatus > 0) {
          var columns = that.data.aftersaleStatusColumns;
          var statusColorMap = {
            1: '#FF8096',  // 已申请，待审核 - 品牌粉
            2: '#FF9F43',  // 审核通过，待补发 - 橙色
            3: '#54A9FF',  // 换货已发货 - 蓝色
            4: '#FF5252',  // 审核不通过，已拒绝 - 红色
            5: '#999999',  // 已取消 - 灰色
            6: '#52C41A'  // 换货完成 - 绿色
          };
          that.setData({
            aftersaleStatus: aftersaleStatus,
            aftersaleStatusText: columns[aftersaleStatus] || '处理中',
            aftersaleStatusColor: statusColorMap[aftersaleStatus] || '#FF8096'
          });
        }
      }

      wx.hideLoading();
    });
  },
  // “去付款”按钮点击效果
  payOrder: function() {
    let that = this;
    util.request(api.OrderPrepay, {
      orderId: that.data.orderId
    }, 'POST').then(function(res) {
      if (res.errno === 0) {
        // 模拟支付：后端已标记已付
        if (res.data && res.data.mockPay) {
          util.redirect('/pages/order/order');
          return;
        }
        // 真实微信支付
        const payParam = res.data;
        console.log("支付过程开始");
        wx.requestPayment({
          'timeStamp': payParam.timeStamp,
          'nonceStr': payParam.nonceStr,
          'package': payParam.packageValue,
          'signType': payParam.signType,
          'paySign': payParam.paySign,
          'success': function(res) {
            console.log("支付过程成功");
            util.redirect('/pages/order/order');
          },
          'fail': function(res) {
            console.log("支付过程失败");
            util.showErrorToast('支付失败');
          },
          'complete': function(res) {
            console.log("支付过程结束")
          }
        });
      } else {
        util.showErrorToast(res.errmsg || '拉起支付失败');
      }
    }).catch(function() {
      util.showErrorToast('网络错误');
    });
  },
  // “取消订单”点击效果
  cancelOrder: function() {
    let that = this;
    let orderInfo = that.data.orderInfo;

    wx.showModal({
      title: '',
      content: '确定要取消此订单？',
      success: function(res) {
        if (res.confirm) {
          util.request(api.OrderCancel, {
            orderId: orderInfo.id
          }, 'POST').then(function(res) {
            if (res.errno === 0) {
              wx.showToast({
                title: '取消订单成功'
              });
              util.redirect('/pages/order/order');
            } else {
              util.showErrorToast(res.errmsg);
            }
          });
        }
      }
    });
  },
  // “取消订单并退款”点击效果
  refundOrder: function() {
    let that = this;
    let orderInfo = that.data.orderInfo;

    wx.showModal({
      title: '',
      content: '确定要取消此订单？',
      success: function(res) {
        if (res.confirm) {
          util.request(api.OrderRefund, {
            orderId: orderInfo.id
          }, 'POST').then(function(res) {
            if (res.errno === 0) {
              wx.showToast({
                title: '取消订单成功'
              });
              util.redirect('/pages/order/order');
            } else {
              util.showErrorToast(res.errmsg);
            }
          });
        }
      }
    });
  },
  // “删除”点击效果
  deleteOrder: function() {
    let that = this;
    let orderInfo = that.data.orderInfo;

    wx.showModal({
      title: '',
      content: '确定要删除此订单？',
      success: function(res) {
        if (res.confirm) {
          util.request(api.OrderDelete, {
            orderId: orderInfo.id
          }, 'POST').then(function(res) {
            if (res.errno === 0) {
              wx.showToast({
                title: '删除订单成功'
              });
              util.redirect('/pages/order/order');
            } else {
              util.showErrorToast(res.errmsg);
            }
          });
        }
      }
    });
  },
  // “确认收货”点击效果
  confirmOrder: function() {
    let that = this;
    let orderInfo = that.data.orderInfo;

    wx.showModal({
      title: '',
      content: '确认收货？',
      success: function(res) {
        if (res.confirm) {
          util.request(api.OrderConfirm, {
            orderId: orderInfo.id
          }, 'POST').then(function(res) {
            if (res.errno === 0) {
              wx.showToast({
                title: '确认收货成功！'
              });
              util.redirect('/pages/order/order');
            } else {
              util.showErrorToast(res.errmsg);
            }
          });
        }
      }
    });
  },
  // "申请售后"点击效果
  aftersaleOrder: function () {
    if(this.data.orderInfo.aftersaleStatus === 0){
      util.redirect('/pages/ucenter/aftersale/aftersale?id=' + this.data.orderId );
    }
    else{
      util.redirect('/pages/ucenter/aftersaleDetail/aftersaleDetail?id=' + this.data.orderId);
    }
  },
  // "查看售后详情"点击效果
  goAftersaleDetail: function () {
    util.redirect('/pages/ucenter/aftersaleDetail/aftersaleDetail?id=' + this.data.orderId);
  },
  // "联系客服"点击效果 - 企业微信客服
  contactService: function() {
    // 企业微信客服链接（需后台配置或替换为实际链接）
    // 方式1: 使用 web-view 跳转企业微信客服链接
    // wx.navigateTo({ url: '/pages/webview/webview?url=https://work.weixin.qq.com/kfid/XXXXX' })
    // 方式2: 使用微信客服功能（需在小程序后台配置）
    wx.openCustomerServiceChat({
      extInfo: { url: '' },
      corpId: '',
      success(res) {
        console.log('客服窗口打开成功', res)
      },
      fail(err) {
        console.error('客服窗口打开失败', err)
        wx.showToast({
          title: '请联系在线客服',
          icon: 'none'
        })
      }
    })
  },
  // 查询物流信息
  queryExpress: function() {
    var that = this;
    util.request(api.ExpressQuery, { orderId: that.data.orderId }).then(function(res) {
      if (res.errno === 0 && Array.isArray(res.data.expressInfo)) {
        var traces = res.data.expressInfo;
        var latestTrace = traces.length > 0 ? (traces[0].AcceptStation || '') : '';
        that.setData({
          expressInfo: traces,
          latestTrace: latestTrace
        });
      }
    }).catch(function() {});
  },
  // 商品图片加载失败
  onGoodsImageError: function(e) {
    var index = e.currentTarget.dataset.index;
    var list = this.data.orderGoods || [];
    if (list[index] && list[index].picUrl !== this.data.defaultImage) {
      this.setData({
        ['orderGoods[' + index + '].picUrl']: this.data.defaultImage
      });
    }
  },
  // 获取自提门店信息
  getPickupStore: function(storeId) {
    let that = this;
    util.request(api.ClothingStoreList, {
      id: storeId
    }).then(function(res) {
      if (res.errno === 0 && res.data && res.data.length > 0) {
        that.setData({
          pickupStore: res.data[0]
        });
      }
    });
  },
  onReady: function() {
    // 页面渲染完成
  },
  onShow: function() {
    tracker.trackPageView('订单详情');
  },
  onHide: function() {
    // 页面隐藏
  },
  onUnload: function() {
    // 页面关闭
  }
})
