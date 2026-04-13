/**
 * admin-storage 云函数入口
 *
 * 文件存储管理：list/create/read/update/delete
 */

const { response } = require('layer-base')
const { adminAuth } = require('layer-auth')

const { list, create, read, update, delete: deleteFn } = require('./service/storage')

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
  storageList:   { handler: list,      permission: 'admin:storage:list' },
  storageCreate: { handler: create,    permission: 'admin:storage:create' },
  storageRead:   { handler: read,      permission: 'admin:storage:read' },
  storageUpdate: { handler: update,    permission: 'admin:storage:update' },
  storageDelete: { handler: deleteFn,  permission: 'admin:storage:delete' },
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
    console.error(`[admin-storage] action=${action} error:`, err)
    return response.serious()
  }
}
