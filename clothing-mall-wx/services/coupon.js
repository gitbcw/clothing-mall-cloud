/**
 * 优惠券相关 API
 */
const { request } = require('../utils/util.js')
const api = require('../config/api.js')

module.exports = {
  // 获取优惠券列表
  getCouponList(params) {
    return request(api.CouponList, params)
  },

  // 获取我的优惠券
  getMyCouponList(params) {
    return request(api.CouponMyList, params)
  },

  // 获取订单可用优惠券
  getSelectCouponList(params) {
    return request(api.CouponSelectList, params)
  },

  // 领取优惠券
  receiveCoupon(couponId) {
    return request(api.CouponReceive, { couponId }, 'POST')
  },

  // 兑换优惠券
  exchangeCoupon(code) {
    return request(api.CouponExchange, { code }, 'POST')
  }
}
