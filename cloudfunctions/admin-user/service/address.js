/**
 * admin-user/service/address.js — 用户地址列表
 */
const { db, response, paginate } = require('layer-base')
const { query } = db

async function list(data) {
  const { page, limit, offset } = paginate.parsePage({ data })
  const where = ['a.deleted = 0']
  const params = []
  if (data.userId) { where.push('a.user_id = ?'); params.push(data.userId) }
  const whereClause = where.join(' AND ')

  const countRows = await query(`SELECT COUNT(*) AS total FROM litemall_address a WHERE ${whereClause}`, params)
  const total = countRows[0] ? countRows[0].total : 0
  const sql = paginate.appendLimit(
    `SELECT a.*, u.username, u.nickname FROM litemall_address a LEFT JOIN litemall_user u ON a.user_id = u.id WHERE ${whereClause} ORDER BY a.add_time DESC`,
    offset, limit
  )
  const listRows = await query(sql, params)
  return response.okList(listRows, total, page, limit)
}

module.exports = { list }
