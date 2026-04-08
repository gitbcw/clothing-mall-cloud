/**
 * 购物车相关 API
 */
const { request } = require('../utils/util.js')
const api = require('../config/api.js')

module.exports = {
  // 获取购物车列表
  getCartList() {
    return request(api.CartList)
  },

  // 添加商品到购物车
  addToCart(data) {
    return request(api.CartAdd, data, 'POST')
  },

  // 立即购买（快速添加）
  fastAddToCart(data) {
    return request(api.CartFastAdd, data, 'POST')
  },

  // 更新购物车商品
  updateCart(data) {
    return request(api.CartUpdate, data, 'POST')
  },

  // 删除购物车商品
  deleteCart(data) {
    return request(api.CartDelete, data, 'POST')
  },

  // 选择/取消选择商品
  checkCart(data) {
    return request(api.CartChecked, data, 'POST')
  },

  // 获取购物车商品数量
  getCartGoodsCount() {
    return request(api.CartGoodsCount)
  },

  // 下单前确认
  checkout(data) {
    return request(api.CartCheckout, data)
  }
}
