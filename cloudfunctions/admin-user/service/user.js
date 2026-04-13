/**
 * admin-user/service/user.js — 管理端用户管理
 */
const { db, response, paginate } = require('layer-base')
const { query, execute } = db

async function list(data) {
  const { page, limit, offset } = paginate.parsePage({ data })
  const where = ['deleted = 0']
  const params = []
  if (data.username) { where.push('(username LIKE ? OR nickname LIKE ?)'); params.push(`%${data.username}%`, `%${data.username}%`) }
  if (data.mobile) { where.push('mobile LIKE ?'); params.push(`%${data.mobile}%`) }
  const whereClause = where.join(' AND ')

  const countRows = await query(`SELECT COUNT(*) AS total FROM litemall_user WHERE ${whereClause}`, params)
  const total = countRows[0] ? countRows[0].total : 0
  const sql = paginate.appendLimit(`SELECT id, username, nickname, avatar, gender, birthday, mobile, user_level, status, last_login_time, add_time, update_time FROM litemall_user WHERE ${whereClause} ORDER BY add_time DESC`, offset, limit)
  const listRows = await query(sql, params)
  return response.okList(listRows, total, page, limit)
}

async function detail(data) {
  const { id } = data
  if (!id) return response.badArgument()
  const rows = await query('SELECT * FROM litemall_user WHERE id = ? AND deleted = 0', [id])
  if (rows.length === 0) return response.badArgumentValue()
  return response.ok(rows[0])
}

async function updateFn(data) {
  const { id, nickname, avatar, gender, birthday, mobile, status } = data
  if (!id) return response.badArgument()
  const sets = []
  const params = []
  if (nickname !== undefined) { sets.push('nickname = ?'); params.push(nickname) }
  if (avatar !== undefined) { sets.push('avatar = ?'); params.push(avatar) }
  if (gender !== undefined) { sets.push('gender = ?'); params.push(gender) }
  if (birthday !== undefined) { sets.push('birthday = ?'); params.push(birthday) }
  if (mobile !== undefined) { sets.push('mobile = ?'); params.push(mobile) }
  if (status !== undefined) { sets.push('status = ?'); params.push(status) }
  sets.push('update_time = NOW()')
  params.push(id)
  await execute(`UPDATE litemall_user SET ${sets.join(', ')} WHERE id = ? AND deleted = 0`, params)
  return response.ok()
}

module.exports = { list, detail, update: updateFn }
