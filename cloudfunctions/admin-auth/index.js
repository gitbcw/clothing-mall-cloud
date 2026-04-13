/**
 * admin-auth 云函数入口
 *
 * 管理后台认证体系：登录/登出/信息/管理员CRUD/角色管理/个人设置
 */

const { db, response } = require('layer-base')
const { query } = db
const { adminAuth } = require('layer-auth')

const { login, logout, info, kaptcha } = require('./service/auth')
const { list: adminList, create: adminCreate, read: adminRead, update: adminUpdate, delete: adminDelete } = require('./service/admin')
const { list: roleList, options: roleOptions, read: roleRead, create: roleCreate, update: roleUpdate, delete: roleDelete, getPermissions, updatePermissions } = require('./service/role')
const { password: profilePassword, nnotice, lsnotice, catnotice, bcatnotice, rmnotice, brmnotice } = require('./service/profile')

// 本地 checkPermission（layer v4 版本有 bug，查询了不存在的表）
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

// routes 格式：
//   简写：action: handler（免登录接口）
//   完整：action: { handler, permission }（需权限的接口）
const routes = {
  // auth — 免登录
  login,
  kaptcha,
  info,

  // auth — 需登录但无需特定权限
  logout,

  // admin CRUD
  adminList:       { handler: adminList,       permission: 'admin:admin:list' },
  adminCreate:     { handler: adminCreate,     permission: 'admin:admin:create' },
  adminRead:       { handler: adminRead,       permission: 'admin:admin:read' },
  adminUpdate:     { handler: adminUpdate,     permission: 'admin:admin:update' },
  adminDelete:     { handler: adminDelete,     permission: 'admin:admin:delete' },

  // role CRUD
  roleList:              { handler: roleList,              permission: 'admin:role:list' },
  roleOptions,            // 无权限要求
  roleRead:              { handler: roleRead,              permission: 'admin:role:read' },
  roleCreate:            { handler: roleCreate,            permission: 'admin:role:create' },
  roleUpdate:            { handler: roleUpdate,            permission: 'admin:role:update' },
  roleDelete:            { handler: roleDelete,            permission: 'admin:role:delete' },
  getPermissions:        { handler: getPermissions,        permission: 'admin:role:permission:get' },
  updatePermissions:     { handler: updatePermissions,     permission: 'admin:role:permission:update' },

  // profile — 需登录但无需特定权限
  profilePassword,
  nnotice,
  lsnotice,
  catnotice,
  bcatnotice,
  rmnotice,
  brmnotice,
}

// 免登录白名单
const PUBLIC_ACTIONS = ['login', 'kaptcha']

exports.main = async (event, context) => {
  const { action, data } = event

  const route = routes[action]
  if (!route) return response.fail(404, `未知接口: ${action}`)

  const handler = typeof route === 'function' ? route : route.handler

  // 免登录接口跳过鉴权
  if (!PUBLIC_ACTIONS.includes(action)) {
    const authResult = await adminAuth.adminAuthMiddleware(event)
    if (authResult) return authResult

    // 权限校验（如果有声明）— 使用本地实现
    if (route.permission) {
      const has = await checkPermission(event._admin, route.permission)
      if (!has) return response.unauthz()
    }

    context._adminId = event._adminId
    context._admin = event._admin
  }

  try {
    return await handler(data || {}, context)
  } catch (err) {
    console.error(`[admin-auth] action=${action} error:`, err)
    return response.serious()
  }
}
