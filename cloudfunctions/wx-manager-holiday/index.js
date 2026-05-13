/**
 * wx-manager-holiday 云函数 — 小程序管理端节日活动管理
 *
 * 复用 admin-clothing/service/holiday.js 的业务逻辑
 * 使用 wxAuth + managerAuth 认证（小程序管理端认证链）
 */

const { response } = require('layer-base')
const { wxAuth } = require('layer-auth')
const { managerAuth } = require('layer-auth')

const {
  list, read, create, update, delete: holidayDelete, enable, goods, goodsUpdate
} = require('./service/holiday')

const routes = {
  holidayList: list,
  holidayRead: read,
  holidayCreate: create,
  holidayUpdate: update,
  holidayDelete: holidayDelete,
  holidayEnable: enable,
  holidayGoods: goods,
  holidayGoodsUpdate: goodsUpdate,
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
    console.error(`[wx-manager-holiday] action=${action} error:`, err)
    return response.serious()
  }
}
