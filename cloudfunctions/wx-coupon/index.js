/**
 * wx-coupon 云函数 — 小程序商城端优惠券
 *
 * 迁移自 WxCouponController
 * 6 个接口：list, mylist, selectlist, receive, exchange, mylist
 *
 * 调用方式：
 *   wx.cloud.callFunction({
 *     name: 'wx-coupon',
 *     data: { action: 'list', data: { page: 1, limit: 10 } }
 *   })
 */

const { response } = require('layer-base')
const { wxAuth } = require('layer-auth')

const {
  list, mylist, selectlist, receive, exchange,
} = require('./service/coupon')

const routes = {
  list, mylist, selectlist, receive, exchange,
}

// list 是公开接口，其余需要登录
const AUTH_REQUIRED = ['mylist', 'selectlist', 'receive', 'exchange']

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

  // 需要登录的接口
  if (AUTH_REQUIRED.includes(action)) {
    const authResult = await wxAuth.wxAuthMiddleware(event, context)
    if (authResult) return authResult
    context._userId = event._userId
    context._user = event._user
  }

  try {
    return await handler(data || {}, context)
  } catch (err) {
    console.error(`[wx-coupon] action=${action} error:`, err)
    return response.serious()
  }
}
