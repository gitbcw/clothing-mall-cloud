/**
 * 小程序管理端认证 — 管理员身份校验
 *
 * 迁移自 Java WxManagerXxxController 中的 hasPermissions() 校验
 *
 * 管理端流程：
 *   OPENID → 查 litemall_user → 检查是否有管理员角色 → 放行/拒绝
 */

const { query } = require('layer-base').db
const response = require('layer-base').response

/**
 * 管理端认证中间件
 *
 * 基于 wxAuthMiddleware 之上，额外检查用户是否为管理员。
 * 管理员判定：litemall_user 的 role_ids 包含管理员角色（在 litemall_admin 表中关联）
 *
 * 用法：
 *   const authResult = await wxAuthMiddleware(event, context)
 *   if (authResult) return authResult
 *   const permResult = await managerAuthMiddleware(event)
 *   if (permResult) return permResult
 *   // 已通过管理端认证
 */
async function managerAuthMiddleware(event) {
  const userId = event._userId
  if (!userId) {
    return response.unlogin()
  }

  // 检查该用户是否为管理员（通过 username 关联 litemall_admin）
  const user = event._user
  if (!user) {
    return response.unauthz()
  }

  // 小程序用户的 username 格式为 wx_{openid前16位}
  // 管理员通过 admin 表的 wx_user_id 字段关联
  const adminRows = await query(
    `SELECT a.id, a.username, a.role_ids, a.avatar
     FROM litemall_admin a
     WHERE a.deleted = 0 AND a.wx_user_id = ?`,
    [userId]
  )

  if (adminRows.length === 0) {
    return response.unauthz()
  }

  const admin = adminRows[0]
  admin.roleIds = admin.role_ids ? JSON.parse(admin.role_ids) : []

  event._adminId = admin.id
  event._admin = admin

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
