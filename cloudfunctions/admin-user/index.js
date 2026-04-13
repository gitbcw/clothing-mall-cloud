/**
 * admin-user 云函数入口
 */
const { response } = require('layer-base')
const { adminAuth } = require('layer-auth')
const { query } = require('layer-base').db

const { list: userList, detail: userDetail, update: userUpdate } = require('./service/user')
const { list: addressList } = require('./service/address')
const { list: collectList } = require('./service/collect')
const { list: footprintList } = require('./service/footprint')

async function checkPermission(admin, permission) {
  if (!admin || !admin.roleIds || admin.roleIds.length === 0) return false
  if (admin.roleIds.includes(1)) return true
  const placeholders = admin.roleIds.map(() => '?').join(',')
  const rows = await query(
    `SELECT id FROM litemall_permission WHERE role_id IN (${placeholders}) AND permission = ? AND deleted = 0`,
    [...admin.roleIds, permission]
  )
  return rows.length > 0
}

const routes = {
  userList: { handler: userList, permission: 'admin:user:list' },
  userDetail: { handler: userDetail, permission: 'admin:user:list' },
  userUpdate: { handler: userUpdate, permission: 'admin:user:list' },
  addressList: { handler: addressList, permission: 'admin:user:list' },
  collectList: { handler: collectList, permission: 'admin:user:list' },
  footprintList: { handler: footprintList, permission: 'admin:user:list' },
}

exports.main = async (event, context) => {
  const { action, data } = event
  const route = routes[action]
  if (!route) return response.fail(404, `未知接口: ${action}`)

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
    console.error(`[admin-user] action=${action} error:`, err)
    return response.serious()
  }
}
