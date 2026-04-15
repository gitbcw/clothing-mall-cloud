/**
 * wx-manager-system 云函数 — 小程序管理端系统配置
 *
 * 接口：systemConfigList, systemConfigUpdate
 */

const { response } = require('layer-base')
const { wxAuth } = require('layer-auth')
const { managerAuth } = require('layer-auth')

const { systemConfigList, systemConfigUpdate } = require('./service/config')

const routes = {
  systemConfigList,
  systemConfigUpdate,
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
    console.error(`[wx-manager-system] action=${action} error:`, err)
    return response.serious()
  }
}
