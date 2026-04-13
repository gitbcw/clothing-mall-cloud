/**
 * admin-content/service/feedback.js — 反馈列表
 */
const { db, response, paginate } = require('layer-base')
const { query } = db

const SORT_WHITELIST = ['id', 'add_time']
function safeSort(sort, order) {
  const s = SORT_WHITELIST.includes(sort) ? sort : 'add_time'
  const o = order === 'asc' ? 'ASC' : 'DESC'
  return { sort: s, order: o }
}

async function list(data) {
  const { page, limit, offset } = paginate.parsePage({ data })
  const where = ['deleted = 0']
  const params = []
  if (data.userId) { where.push('user_id = ?'); params.push(data.userId) }
  if (data.username) { where.push('username LIKE ?'); params.push(`%${data.username}%`) }
  const whereClause = where.join(' AND ')
  const { sort, order } = safeSort(data.sort, data.order)

  const countRows = await query(`SELECT COUNT(*) AS total FROM litemall_feedback WHERE ${whereClause}`, params)
  const total = countRows[0] ? countRows[0].total : 0
  const sql = paginate.appendLimit(`SELECT * FROM litemall_feedback WHERE ${whereClause} ORDER BY ${sort} ${order}`, offset, limit)
  const listRows = await query(sql, params)

  return response.okList(listRows, total, page, limit)
}

module.exports = { list }
