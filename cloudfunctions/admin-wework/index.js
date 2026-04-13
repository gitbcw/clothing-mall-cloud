/**
 * admin-wework 云函数入口
 */
const { response } = require('layer-base')
const { adminAuth } = require('layer-auth')
const { query } = require('layer-base').db

const { tags, pages, uploadMedia, sendCard, pushGroups, sendMessage } = require('./service/wework')
const { list: pushGroupList, detail: pushGroupDetail, create: pushGroupCreate, update: pushGroupUpdate, delete: pushGroupDelete } = require('./service/push-group')
const { notifyScope } = require('./service/ops')

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

const PUBLIC_ACTIONS = ['weworkPushGroups']

const routes = {
  weworkTags: { handler: tags, permission: 'admin:wework:list' },
  weworkPages: { handler: pages, permission: 'admin:wework:list' },
  weworkUploadMedia: { handler: uploadMedia, permission: 'admin:wework:upload' },
  weworkSendCard: { handler: sendCard, permission: 'admin:wework:send' },
  weworkPushGroups: { handler: pushGroups, permission: null },
  weworkSendMessage: { handler: sendMessage, permission: 'admin:wework:send' },

  pushGroupList: { handler: pushGroupList, permission: 'admin:wework:list' },
  pushGroupDetail: { handler: pushGroupDetail, permission: 'admin:wework:list' },
  pushGroupCreate: { handler: pushGroupCreate, permission: 'admin:wework:list' },
  pushGroupUpdate: { handler: pushGroupUpdate, permission: 'admin:wework:list' },
  pushGroupDelete: { handler: pushGroupDelete, permission: 'admin:wework:list' },

  opsNotifyScope: { handler: notifyScope, permission: 'admin:wework:list' },
}

exports.main = async (event, context) => {
  const { action, data } = event
  const route = routes[action]
  if (!route) return response.fail(404, `未知接口: ${action}`)

  if (!PUBLIC_ACTIONS.includes(action)) {
    const authResult = await adminAuth.adminAuthMiddleware(event)
    if (authResult) return authResult
    if (route.permission) {
      const has = await checkPermission(event._admin, route.permission)
      if (!has) return response.unauthz()
    }
    context._adminId = event._adminId
    context._admin = event._admin
  }

  try {
    return await route.handler(data || {}, context)
  } catch (err) {
    console.error(`[admin-wework] action=${action} error:`, err)
    return response.serious()
  }
}
