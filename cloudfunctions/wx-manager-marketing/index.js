/**
 * wx-manager-marketing 云函数 — 小程序管理端优惠券管理
 *
 * 复用 admin-marketing/service/coupon.js 的业务逻辑
 * 使用 wxAuth + managerAuth 认证（小程序管理端认证链）
 */

const { response } = require('layer-base')
const { wxAuth } = require('layer-auth')
const { managerAuth } = require('layer-auth')

const {
  list, listuser, create, read, update, delete: couponDelete, assign
} = require('./service/coupon')

const routes = {
  couponList: list,
  couponListuser: listuser,
  couponCreate: create,
  couponRead: read,
  couponUpdate: update,
  couponDelete: couponDelete,
  couponAssign: assign,
}

exports.main = async (event, context) => {
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

  // 管理员权限校验
  const permResult = await managerAuth.managerAuthMiddleware(event)
  if (permResult) return permResult

  context._userId = event._userId
  context._user = event._user
  context._adminId = event._adminId

  try {
    return await handler(data || {}, context)
  } catch (err) {
    console.error(`[wx-manager-marketing] action=${action} error:`, err)
    return response.serious()
  }
}
