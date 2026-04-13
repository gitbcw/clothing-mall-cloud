/**
 * wx-manager-shelf 云函数 — 小程序管理端商品上架
 *
 * 迁移自 WxManagerGoodsController
 * 9 个接口：category, list, detail, edit, publish, unpublish, batchDelete, unpublishAll, create
 */

const { response } = require('layer-base')
const { wxAuth } = require('layer-auth')
const { managerAuth } = require('layer-auth')

const {
  category, list, detail, edit, publish, unpublish, batchDelete, unpublishAll, create,
} = require('./service/goods')

const routes = {
  category, list, detail, edit, publish, unpublish, batchDelete, unpublishAll, create,
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
    console.error(`[wx-manager-shelf] action=${action} error:`, err)
    return response.serious()
  }
}
