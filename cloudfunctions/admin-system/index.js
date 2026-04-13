/**
 * admin-system 云函数入口
 *
 * 系统管理：操作日志 + 地区管理
 */

const { response } = require('layer-base')
const { adminAuth } = require('layer-auth')

const { list: logList } = require('./service/log')
const { clist: regionClist, list: regionList } = require('./service/region')

// 本地 checkPermission
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
  // 操作日志
  logList: { handler: logList, permission: 'admin:log:list' },

  // 地区管理（无特定权限要求，只需登录）
  regionClist,
  regionList,
}

exports.main = async (event, context) => {
  const { action, data } = event

  const route = routes[action]
  if (!route) return response.fail(404, `未知接口: ${action}`)

  const handler = typeof route === 'function' ? route : route.handler

  // 所有接口都需要登录
  const authResult = await adminAuth.adminAuthMiddleware(event)
  if (authResult) return authResult

  if (route.permission) {
    const has = await checkPermission(event._admin, route.permission)
    if (!has) return response.unauthz()
  }

  context._adminId = event._adminId
  context._admin = event._admin

  try {
    return await handler(data || {}, context)
  } catch (err) {
    console.error(`[admin-system] action=${action} error:`, err)
    return response.serious()
  }
}
