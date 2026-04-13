/**
 * wx-manager-wework 云函数 — 小程序管理端企微推送
 *
 * 迁移自 WxManagerWeWorkController
 * 6 个接口：tags, pages, uploadMedia, sendCard, pushGroups, sendMessage
 */

const { response } = require('layer-base')
const { wxAuth } = require('layer-auth')
const { managerAuth } = require('layer-auth')

const {
  tags, pages, uploadMedia, sendCard, pushGroups, sendMessage,
} = require('./service/wework')

const routes = {
  tags, pages, uploadMedia, sendCard, pushGroups, sendMessage,
}

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

  // 管理员权限校验
  const permResult = await managerAuth.managerAuthMiddleware(event)
  if (permResult) return permResult

  context._userId = event._userId
  context._user = event._user
  context._adminId = event._adminId

  try {
    return await handler(data || {}, context)
  } catch (err) {
    console.error(`[wx-manager-wework] action=${action} error:`, err)
    return response.serious()
  }
}
