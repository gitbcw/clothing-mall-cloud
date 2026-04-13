/**
 * Admin 管理员认证 — 用户名/密码登录
 *
 * 迁移自 Java AdminAuthorizingRealm + AdminAuthService
 * 密码使用 BCrypt 哈希（与 Java BCrypt.java 完全兼容）
 */

const bcrypt = require('bcryptjs')
const { query, execute } = require('layer-base').db
const response = require('layer-base').response

// Token 有效期：7 天（毫秒）
const TOKEN_EXPIRE_MS = 7 * 24 * 60 * 60 * 1000

/**
 * 用户名密码登录
 * @param {string} username
 * @param {string} password
 * @param {string} [ip] - 客户端 IP
 * @returns {object} { errno: 0, data: { token, adminInfo } } 或错误
 */
async function login(username, password, ip) {
  if (!username || !password) {
    return response.badArgument()
  }

  // 查询管理员
  const rows = await query(
    'SELECT id, username, avatar, role_ids, deleted FROM litemall_admin WHERE username = ? AND deleted = 0',
    [username]
  )

  if (rows.length === 0) {
    return response.fail(403, '账号不存在')
  }

  const admin = rows[0]

  // 查询密码哈希（单独查询避免泄露到日志）
  const pwdRows = await query(
    'SELECT password FROM litemall_admin WHERE id = ?',
    [admin.id]
  )
  if (pwdRows.length === 0) {
    return response.fail(403, '账号不存在')
  }

  // BCrypt 校验
  const match = bcrypt.compareSync(password, pwdRows[0].password)
  if (!match) {
    return response.fail(403, '密码错误')
  }

  // 更新最后登录时间和 IP
  const now = new Date()
  await execute(
    'UPDATE litemall_admin SET last_login_time = ?, last_login_ip = ? WHERE id = ?',
    [now, ip || '', admin.id]
  )

  // 登录成功，返回管理员信息
  const token = `admin-${admin.id}-${Date.now()}`

  return response.ok({
    token: token,
    adminInfo: {
      id: admin.id,
      username: admin.username,
      avatar: admin.avatar,
      roleIds: admin.role_ids ? JSON.parse(admin.role_ids) : [],
    },
  })
}

/**
 * Admin 认证中间件：检查 token，注入 event._adminId
 *
 * token 格式: admin-{id}-{timestamp}
 * 有效期: 7 天
 *
 * 用法：
 *   const authResult = await adminAuthMiddleware(event)
 *   if (authResult) return authResult
 *   const adminId = event._adminId
 */
async function adminAuthMiddleware(event) {
  const data = event.data || event
  const token = data.token

  if (!token) {
    return response.unlogin()
  }

  // 从 token 提取 adminId 和 timestamp
  const parts = token.split('-')
  if (parts.length < 3 || parts[0] !== 'admin') {
    return response.unlogin()
  }

  const adminId = parseInt(parts[1], 10)
  const timestamp = parseInt(parts[2], 10)

  if (!adminId || !timestamp) {
    return response.unlogin()
  }

  // Token 有效期校验（7 天）
  if (Date.now() - timestamp > TOKEN_EXPIRE_MS) {
    return response.unlogin()
  }

  // 验证管理员存在且未删除
  const rows = await query(
    'SELECT id, username, avatar, role_ids FROM litemall_admin WHERE id = ? AND deleted = 0',
    [adminId]
  )

  if (rows.length === 0) {
    return response.unlogin()
  }

  event._adminId = adminId
  event._admin = rows[0]
  event._admin.roleIds = rows[0].role_ids ? JSON.parse(rows[0].role_ids) : []

  return null
}

/**
 * 权限校验：检查管理员是否拥有指定权限
 * @param {object} admin - 管理员对象（含 roleIds）
 * @param {string} permission - 权限标识
 * @returns {boolean}
 */
async function checkPermission(admin, permission) {
  if (!admin || !admin.roleIds || admin.roleIds.length === 0) {
    return false
  }

  // 超级管理员（roleIds 包含 1）拥有所有权限
  if (admin.roleIds.includes(1)) {
    return true
  }

  // 查询角色对应的权限
  const placeholders = admin.roleIds.map(() => '?').join(',')
  const rows = await query(
    `SELECT id FROM litemall_permission
     WHERE role_id IN (${placeholders}) AND permission = ? AND deleted = 0`,
    [...admin.roleIds, permission]
  )

  return rows.length > 0
}

module.exports = {
  login,
  adminAuthMiddleware,
  checkPermission,
}
