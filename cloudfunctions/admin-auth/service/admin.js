/**
 * admin-auth/service/admin.js
 *
 * 管理员 CRUD
 */

const bcrypt = require('bcryptjs')
const { db, response, paginate } = require('layer-base')
const { query, execute } = db

/**
 * 管理员列表（分页）
 */
async function list(data) {
  const { page, limit, offset } = paginate.parsePage({ data })

  const where = []
  const params = []
  if (data.username) {
    where.push('username LIKE ?')
    params.push(`%${data.username}%`)
  }
  where.push('deleted = 0')
  const whereClause = where.join(' AND ')

  const countRows = await query(
    `SELECT COUNT(*) AS total FROM litemall_admin WHERE ${whereClause}`,
    params
  )
  const total = countRows[0] ? countRows[0].total : 0

  const sql = paginate.appendLimit(
    `SELECT id, username, avatar, role_ids, add_time, update_time, last_login_time, last_login_ip
     FROM litemall_admin WHERE ${whereClause}
     ORDER BY add_time DESC`,
    offset, limit
  )
  const listRows = await query(sql, params)

  listRows.forEach(item => {
    item.roleIds = item.role_ids ? JSON.parse(item.role_ids) : []
  })

  return response.okList(listRows, total, page, limit)
}

/**
 * 创建管理员
 */
async function create(data) {
  const { username, password, avatar, roleIds } = data

  if (!username || !password) {
    return response.badArgument()
  }
  if (password.length < 6) {
    return response.fail(602, '管理员密码不能少于6位')
  }

  if (!/^[a-zA-Z0-9_]{2,20}$/.test(username)) {
    return response.fail(601, '管理员名称不符合规定')
  }

  const exists = await query(
    'SELECT id FROM litemall_admin WHERE username = ? AND deleted = 0',
    [username]
  )
  if (exists.length > 0) {
    return response.fail(602, '管理员已经存在')
  }

  const hashedPassword = bcrypt.hashSync(password, 10)

  const result = await execute(
    'INSERT INTO litemall_admin (username, password, avatar, role_ids, add_time, update_time, deleted) VALUES (?, ?, ?, ?, NOW(), NOW(), 0)',
    [username, hashedPassword, avatar || '', JSON.stringify(roleIds || [])]
  )

  const adminId = result.insertId
  const rows = await query(
    'SELECT id, username, avatar, role_ids, add_time, update_time FROM litemall_admin WHERE id = ? AND deleted = 0',
    [adminId]
  )
  const admin = rows[0]
  if (admin) admin.roleIds = admin.role_ids ? JSON.parse(admin.role_ids) : []

  return response.ok(admin)
}

/**
 * 查看管理员详情
 */
async function read(data) {
  const { id } = data
  if (!id) return response.badArgument()

  const rows = await query(
    'SELECT id, username, avatar, role_ids, add_time, update_time, last_login_time, last_login_ip FROM litemall_admin WHERE id = ? AND deleted = 0',
    [id]
  )
  if (rows.length === 0) return response.badArgumentValue()

  const admin = rows[0]
  admin.roleIds = admin.role_ids ? JSON.parse(admin.role_ids) : []

  return response.ok(admin)
}

/**
 * 更新管理员
 */
async function update(data) {
  const { id, username, avatar, roleIds } = data
  if (!id) return response.badArgument()

  const sets = []
  const params = []
  if (username !== undefined) {
    sets.push('username = ?')
    params.push(username)
  }
  if (avatar !== undefined) {
    sets.push('avatar = ?')
    params.push(avatar)
  }
  if (roleIds !== undefined) {
    sets.push('role_ids = ?')
    params.push(JSON.stringify(roleIds))
  }
  sets.push("update_time = NOW()")

  if (sets.length === 1) return response.ok() // 只有 update_time

  params.push(id)
  const result = await execute(
    `UPDATE litemall_admin SET ${sets.join(', ')} WHERE id = ? AND deleted = 0`,
    params
  )

  if (result.affectedRows === 0) return response.updatedDataFailed()

  return response.ok()
}

/**
 * 删除管理员
 */
async function deleteFn(data, context) {
  const { id } = data
  if (!id) return response.badArgument()

  if (id === context._adminId) {
    return response.fail(604, '管理员不能删除自己')
  }

  const result = await execute(
    'UPDATE litemall_admin SET deleted = 1 WHERE id = ? AND deleted = 0',
    [id]
  )
  if (result.affectedRows === 0) return response.updatedDataFailed()

  return response.ok()
}

module.exports = { list, create, read, update, delete: deleteFn }
