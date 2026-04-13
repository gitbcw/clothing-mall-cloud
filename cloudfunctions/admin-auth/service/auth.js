/**
 * admin-auth/service/auth.js
 *
 * 管理后台认证：登录、登出、信息获取、验证码
 */

const { query } = require('layer-base').db
const response = require('layer-base').response
const { adminAuth } = require('layer-auth')

/**
 * 登录
 */
async function login(data) {
  const { username, password } = data
  return adminAuth.login(username, password)
}

/**
 * 登出（云函数无状态，前端清除 token 即可）
 */
async function logout(data, context) {
  return response.ok()
}

/**
 * 获取当前管理员信息 + 角色 + 权限
 */
async function info(data, context) {
  const adminId = context._adminId

  // 查管理员基本信息
  const admins = await query(
    'SELECT id, username, avatar, role_ids FROM litemall_admin WHERE id = ? AND deleted = 0',
    [adminId]
  )
  if (admins.length === 0) return response.unlogin()

  const admin = admins[0]
  const roleIds = admin.role_ids ? JSON.parse(admin.role_ids) : []

  // 查角色列表
  let roles = []
  if (roleIds.length > 0) {
    const placeholders = roleIds.map(() => '?').join(',')
    roles = await query(
      `SELECT id, name, \`desc\`, enabled FROM litemall_role WHERE id IN (${placeholders}) AND deleted = 0`,
      roleIds
    )
  }

  // 查权限列表
  let perms = []
  // 超级管理员（roleIds 包含 1）拥有所有权限
  if (roleIds.includes(1)) {
    perms = ['*']
  } else if (roleIds.length > 0) {
    const placeholders = roleIds.map(() => '?').join(',')
    const permRows = await query(
      `SELECT DISTINCT p.permission
       FROM litemall_permission p
       INNER JOIN litemall_role_permission rp ON p.id = rp.permission_id
       WHERE rp.role_id IN (${placeholders})`,
      roleIds
    )
    perms = permRows.map(r => r.permission)
  }

  return response.ok({
    name: admin.username,
    avatar: admin.avatar,
    roles: roles.map(r => ({ id: r.id, name: r.name, desc: r.desc, enabled: r.enabled })),
    perms,
  })
}

/**
 * 验证码（云函数版：返回 base64 图片）
 * 注意：当前 Java 版已注释掉验证码校验，此处保留接口但返回空操作
 */
async function kaptcha(data) {
  return response.ok({
    // 验证码已禁用，前端不需要校验
    enabled: false,
  })
}

module.exports = { login, logout, info, kaptcha }
