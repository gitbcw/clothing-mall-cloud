/**
 * 小程序管理端认证 — 管理员身份校验
 *
 * 基于 wxAuthMiddleware 之上，检查 litemall_user.role 是否为 owner 或 guide。
 * 与前端 isManager 判断逻辑保持一致。
 */

const response = require('layer-base').response

const MANAGER_ROLES = ['owner', 'guide']

/**
 * 管理端认证中间件
 *
 * 用法：
 *   const authResult = await wxAuthMiddleware(event, context)
 *   if (authResult) return authResult
 *   const permResult = await managerAuthMiddleware(event)
 *   if (permResult) return permResult
 *   // 已通过管理端认证
 */
async function managerAuthMiddleware(event) {
  const user = event._user
  if (!user) {
    return response.unlogin()
  }

  // 基于 litemall_user.role 字段判断，与前端 isManager 逻辑一致
  const role = user.role || 'user'
  if (!MANAGER_ROLES.includes(role)) {
    return response.unauthz()
  }

  // 注入兼容字段（wx-manager-* 的 index.js 会透传到 context）
  event._adminId = user.id
  event._admin = { id: user.id, username: user.username, roleIds: [], role }

  return null
}

/**
 * 管理端权限检查
 * @param {object} admin - event._admin
 * @param {string[]} requiredRoles - 需要的角色 ID 列表
 * @returns {boolean}
 */
function hasRequiredRoles(admin, requiredRoles) {
  if (!admin || !admin.roleIds) return false
  // 超级管理员（roleIds 包含 1）拥有所有权限
  if (admin.roleIds.includes(1)) return true
  return requiredRoles.some(role => admin.roleIds.includes(role))
}

module.exports = {
  managerAuthMiddleware,
  hasRequiredRoles,
}
