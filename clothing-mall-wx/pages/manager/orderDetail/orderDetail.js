const util = require('../../../utils/util.js');
const api = require('../../../config/api.js');

Page({
  data: {
    orderId: null,
    order: {},
    goodsList: [],
    loading: true,
    action: '', // ship / verify / refundReject

    // 发货弹窗
    showShipDialog: false,
    shipChannel: '',
    shipSn: '',
    channelOptions: [],
    channelIndex: 0,

    // 核销弹窗
    showVerifyDialog: false,
    inputPickupCode: '',

    // 拒绝退款弹窗
    showRejectDialog: false,
    rejectReason: ''
  },

  onLoad(options) {
    this.setData({
      orderId: options.id,
      action: options.action || ''
    });
    this.getOrderDetail();
    this.loadShippers();
  },

  getOrderDetail() {
    let that = this;
    this.setData({ loading: true });

    util.request(api.ManagerOrderDetail, { orderId: this.data.orderId }).then(function(res) {
      if (res.errno === 0) {
        const data = res.data;
        const order = data.order || data;
        const goodsList = data.goodsList || order.goodsList || [];

        // 订单状态文字
        const statusMap = {
          101: '待付款',
          102: '已取消',
          103: '已取消(系统)',
          104: '已取消(管理员)',
          201: '已付款',
          202: '退款中',
          203: '已退款',
          301: '已发货',
          401: '已收货',
          402: '已收货(系统)',
          501: '待核销',
          502: '已核销'
        };
        order.orderStatusText = statusMap[order.orderStatus] || '未知状态';

        that.setData({
          order: order,
          goodsList: goodsList,
          loading: false
        });

        // 根据 action 自动弹出弹窗
        if (that.data.action === 'ship' && order.orderStatus === 201) {
          that.setData({ showShipDialog: true });
        } else if (that.data.action === 'verify' && order.orderStatus === 501) {
          that.setData({ showVerifyDialog: true });
        } else if (that.data.action === 'refundReject' && order.orderStatus === 202) {
          that.setData({ showRejectDialog: true });
        }
      } else {
        that.setData({ loading: false });
        wx.showToast({ title: '订单不存在', icon: 'none' });
      }
    }).catch(function() {
      that.setData({ loading: false });
    });
  },

  // ========== 发货（201→301） ==========

  handleShip() {
    this.setData({ showShipDialog: true });
  },

  closeShipDialog() {
    this.setData({ showShipDialog: false });
  },

  onChannelChange(e) {
    this.setData({
      channelIndex: e.detail.value,
      shipChannel: this.data.channelOptions[e.detail.value]
    });
  },

  onShipSnInput(e) {
    this.setData({ shipSn: e.detail.value });
  },

  confirmShip() {
    if (!this.data.shipChannel) {
      this.setData({ shipChannel: this.data.channelOptions[0] });
    }
    if (!this.data.shipSn) {
      wx.showToast({ title: '请输入物流单号', icon: 'none' });
      return;
    }

    let that = this;
    util.request(api.ManagerOrderShip, {
      orderId: this.data.orderId,
      shipChannel: this.data.shipChannel,
      shipSn: this.data.shipSn
    }, 'POST').then(function(res) {
      if (res.errno === 0) {
        wx.showToast({ title: '发货成功', icon: 'success' });
        that.setData({ showShipDialog: false });
        that.getOrderDetail();
      } else {
        wx.showToast({ title: res.errmsg || '发货失败', icon: 'none' });
      }
    });
  },

  loadShippers() {
    let that = this;
    util.request(api.ManagerShippers, {}, 'GET').then(function(res) {
      if (res.errno === 0) {
        that.setData({ channelOptions: res.data });
      }
    });
  },

  // ========== 取消订单 ==========

  handleCancel() {
    let that = this;
    wx.showModal({
      title: '确认',
      content: '确认取消该订单？已付款订单将自动退款。',
      success(res) {
        if (res.confirm) {
          util.request(api.ManagerOrderCancel, { orderId: that.data.orderId }, 'POST').then(function(res) {
            if (res.errno === 0) {
              wx.showToast({ title: '已取消', icon: 'success' });
              that.getOrderDetail();
            } else {
              wx.showToast({ title: res.errmsg || '操作失败', icon: 'none' });
            }
          });
        }
      }
    });
  },

  // ========== 核销（501→502） ==========

  handleVerify() {
    this.setData({ showVerifyDialog: true });
  },

  closeVerifyDialog() {
    this.setData({ showVerifyDialog: false });
  },

  onPickupCodeInput(e) {
    this.setData({ inputPickupCode: e.detail.value });
  },

  confirmVerify() {
    if (!this.data.inputPickupCode) {
      wx.showToast({ title: '请输入取货码', icon: 'none' });
      return;
    }

    let that = this;
    util.request(api.ManagerOrderVerify, {
      orderId: this.data.orderId,
      pickupCode: this.data.inputPickupCode
    }, 'POST').then(function(res) {
      if (res.errno === 0) {
        wx.showToast({ title: '核销成功', icon: 'success' });
        that.setData({ showVerifyDialog: false });
        that.getOrderDetail();
      } else {
        wx.showToast({ title: res.errmsg || '核销失败', icon: 'none' });
      }
    });
  },

  // ========== 同意退款（202→203） ==========

  handleRefundAgree() {
    let that = this;
    wx.showModal({
      title: '确认退款',
      content: '退款金额 ¥' + (this.data.order.actualPrice || 0) + ' 将原路返回',
      success(res) {
        if (res.confirm) {
          util.request(api.ManagerOrderRefundAgree, { orderId: that.data.orderId }, 'POST').then(function(res) {
            if (res.errno === 0) {
              wx.showToast({ title: '退款成功', icon: 'success' });
              that.getOrderDetail();
            } else {
              wx.showToast({ title: res.errmsg || '退款失败', icon: 'none' });
            }
          });
        }
      }
    });
  },

  // ========== 拒绝退款（202→原状态） ==========

  handleRefundReject() {
    this.setData({ showRejectDialog: true });
  },

  closeRejectDialog() {
    this.setData({ showRejectDialog: false });
  },

  onRejectReasonInput(e) {
    this.setData({ rejectReason: e.detail.value });
  },

  confirmReject() {
    if (!this.data.rejectReason) {
      wx.showToast({ title: '请输入拒绝原因', icon: 'none' });
      return;
    }

    let that = this;
    util.request(api.ManagerOrderRefundReject, {
      orderId: this.data.orderId,
      reason: this.data.rejectReason
    }, 'POST').then(function(res) {
      if (res.errno === 0) {
        wx.showToast({ title: '已拒绝退款', icon: 'success' });
        that.setData({ showRejectDialog: false });
        that.getOrderDetail();
      } else {
        wx.showToast({ title: res.errmsg || '操作失败', icon: 'none' });
      }
    });
  }
});
