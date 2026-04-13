/**
 * admin-stat/service/history.js — 搜索历史
 */
const { db, response, paginate } = require('layer-base')
const { query } = db

async function list(data) {
  const { page, limit, offset } = paginate.parsePage({ data })
  const where = ['h.deleted = 0']
  const params = []
  if (data.userId) { where.push('h.user_id = ?'); params.push(data.userId) }
  if (data.keyword) { where.push('h.keyword LIKE ?'); params.push(`%${data.keyword}%`) }
  const whereClause = where.join(' AND ')

  const countRows = await query(`SELECT COUNT(*) AS total FROM litemall_search_history h WHERE ${whereClause}`, params)
  const total = countRows[0] ? countRows[0].total : 0
  const sql = paginate.appendLimit(
    `SELECT h.*, u.nickname FROM litemall_search_history h LEFT JOIN litemall_user u ON h.user_id = u.id WHERE ${whereClause} ORDER BY h.add_time DESC`,
    offset, limit
  )
  const listRows = await query(sql, params)
  return response.okList(listRows, total, page, limit)
}

module.exports = { list }
