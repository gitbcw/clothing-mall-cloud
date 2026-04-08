/**
 * 订单相关 API
 */
const { request } = require('../utils/util.js')
const api = require('../config/api.js')

module.exports = {
  // 提交订单
  submitOrder(data) {
    return request(api.OrderSubmit, data, 'POST')
  },

  // 订单预支付
  prepayOrder(orderId) {
    return request(api.OrderPrepay, { orderId }, 'POST')
  },

  // 获取订单列表
  getOrderList(params) {
    return request(api.OrderList, params)
  },

  // 获取订单详情
  getOrderDetail(orderId) {
    return request(api.OrderDetail, { orderId })
  },

  // 取消订单
  cancelOrder(orderId) {
    return request(api.OrderCancel, { orderId }, 'POST')
  },

  // 退款
  refundOrder(orderId) {
    return request(api.OrderRefund, { orderId }, 'POST')
  },

  // 删除订单
  deleteOrder(orderId) {
    return request(api.OrderDelete, { orderId }, 'POST')
  },

  // 确认收货
  confirmOrder(orderId) {
    return request(api.OrderConfirm, { orderId }, 'POST')
  },

  // 获取待评价商品
  getOrderGoods(orderId, goodsId) {
    return request(api.OrderGoods, { orderId, goodsId })
  },

  // 查询物流
  queryExpress(orderId) {
    return request(api.ExpressQuery, { orderId })
  }
}
