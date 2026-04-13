/**
 * wx-cart 云函数 — 小程序商城端购物车
 *
 * 迁移自 WxCartController
 * 8 个接口：index, add, fastadd, update, checked, delete, goodscount, clear
 *
 * 调用方式：
 *   wx.cloud.callFunction({
 *     name: 'wx-cart',
 *     data: { action: 'add', data: { goodsId: 123, number: 1, size: 'M' } }
 *   })
 */

const { response } = require('layer-base')
const { wxAuth } = require('layer-auth')

const {
  index, add, fastadd, update, checked, delete: deleteCart, goodscount, clear, checkout,
} = require('./service/cart')

const routes = {
  index, add, fastadd, update, checked, delete: deleteCart, goodscount, clear, checkout,
}

// 所有购物车接口都需要登录
const AUTH_REQUIRED = Object.keys(routes)

exports.main = async (event, context) => {
  // CloudBase 将 OPENID 放在 event.userInfo.openId，注入到 context 供 layer-auth 使用
  const openId = (event.userInfo && event.userInfo.openId) || null
  if (openId && !context.OPENID) {
    context.OPENID = openId
  }

  const { action, data } = event

  const handler = routes[action]
  if (!handler) {
    return response.fail(404, `未知接口: ${action}`)
  }

  // 登录校验
  const authResult = await wxAuth.wxAuthMiddleware(event, context)
  if (authResult) return authResult
  context._userId = event._userId
  context._user = event._user

  try {
    return await handler(data || {}, context)
  } catch (err) {
    console.error(`[wx-cart] action=${action} error:`, err)
    return response.serious()
  }
}
