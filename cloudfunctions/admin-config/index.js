/**
 * admin-config 云函数入口
 *
 * 系统配置管理：mall/express/order/wx/promotion/homeActivity
 * 每个模块提供 list + update 两个接口
 */

const { response } = require('layer-base')
const { adminAuth } = require('layer-auth')

const {
  mallList, mallUpdate,
  expressList, expressUpdate,
  orderList, orderUpdate,
  wxList, wxUpdate,
  promotionList, promotionUpdate,
  homeActivityList, homeActivityUpdate,
} = require('./service/config')

// 本地 checkPermission（layer v4 的版本有 bug）
const { query } = require('layer-base').db
async function checkPermission(admin, permission) {
  if (!admin || !admin.roleIds || admin.roleIds.length === 0) return false
  if (admin.roleIds.includes(1)) return true
  const placeholders = admin.roleIds.map(() => '?').join(',')
  const rows = await query(
    `SELECT id FROM litemall_permission
     WHERE role_id IN (${placeholders}) AND permission = ? AND deleted = 0`,
    [...admin.roleIds, permission]
  )
  return rows.length > 0
}

const routes = {
  // 商场配置
  mallList:         { handler: mallList,         permission: 'admin:config:mall:list' },
  mallUpdate:       { handler: mallUpdate,       permission: 'admin:config:mall:updateConfigs' },

  // 运费配置
  expressList:      { handler: expressList,      permission: 'admin:config:express:list' },
  expressUpdate:    { handler: expressUpdate,    permission: 'admin:config:express:updateConfigs' },

  // 订单配置
  orderList:        { handler: orderList,        permission: 'admin:config:order:list' },
  orderUpdate:      { handler: orderUpdate,      permission: 'admin:config:order:updateConfigs' },

  // 小程序配置
  wxList:           { handler: wxList,           permission: 'admin:config:wx:list' },
  wxUpdate:         { handler: wxUpdate,         permission: 'admin:config:wx:updateConfigs' },

  // 促销配置
  promotionList:    { handler: promotionList,    permission: 'admin:config:promotion:list' },
  promotionUpdate:  { handler: promotionUpdate,  permission: 'admin:config:promotion:updateConfigs' },

  // 首页活动位
  homeActivityList:    { handler: homeActivityList,    permission: 'admin:config:promotion:list' },
  homeActivityUpdate:  { handler: homeActivityUpdate,  permission: 'admin:config:promotion:updateConfigs' },
}

exports.main = async (event, context) => {
  const { action, data } = event

  const route = routes[action]
  if (!route) return response.fail(404, `未知接口: ${action}`)

  // 所有配置接口都需要登录
  const authResult = await adminAuth.adminAuthMiddleware(event)
  if (authResult) return authResult

  if (route.permission) {
    const has = await checkPermission(event._admin, route.permission)
    if (!has) return response.unauthz()
  }

  context._adminId = event._adminId
  context._admin = event._admin

  try {
    return await route.handler(data || {}, context)
  } catch (err) {
    console.error(`[admin-config] action=${action} error:`, err)
    return response.serious()
  }
}
