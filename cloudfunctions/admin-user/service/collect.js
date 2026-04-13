/**
 * admin-user/service/collect.js — 用户收藏列表
 */
const { db, response, paginate } = require('layer-base')
const { query } = db

async function list(data) {
  const { page, limit, offset } = paginate.parsePage({ data })
  const where = ['c.deleted = 0']
  const params = []
  if (data.userId) { where.push('c.user_id = ?'); params.push(data.userId) }
  if (data.type !== undefined) { where.push('c.type_id = ?'); params.push(data.type) }
  const whereClause = where.join(' AND ')

  const countRows = await query(`SELECT COUNT(*) AS total FROM litemall_collect c WHERE ${whereClause}`, params)
  const total = countRows[0] ? countRows[0].total : 0
  const sql = paginate.appendLimit(
    `SELECT c.*, u.nickname FROM litemall_collect c LEFT JOIN litemall_user u ON c.user_id = u.id WHERE ${whereClause} ORDER BY c.add_time DESC`,
    offset, limit
  )
  const listRows = await query(sql, params)
  return response.okList(listRows, total, page, limit)
}

module.exports = { list }
