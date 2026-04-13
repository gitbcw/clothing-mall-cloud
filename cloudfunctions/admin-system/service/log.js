/**
 * admin-system/service/log.js
 *
 * 操作日志查询
 */

const { db, response, paginate } = require('layer-base')
const { query } = db

const SORT_WHITELIST = ['id', 'admin', 'add_time']

function safeSort(sort, order) {
  const s = SORT_WHITELIST.includes(sort) ? sort : 'id'
  const o = order === 'asc' ? 'ASC' : 'DESC'
  return { sort: s, order: o }
}

/**
 * 操作日志列表（分页）
 */
async function list(data) {
  const { page, limit, offset } = paginate.parsePage({ data })

  const where = []
  const params = []
  if (data.name) {
    where.push('admin LIKE ?')
    params.push(`%${data.name}%`)
  }
  where.push('deleted = 0')
  const whereClause = where.join(' AND ')

  const { sort, order } = safeSort(data.sort, data.order)

  const countRows = await query(
    `SELECT COUNT(*) AS total FROM litemall_log WHERE ${whereClause}`,
    params
  )
  const total = countRows[0] ? countRows[0].total : 0

  const sql = paginate.appendLimit(
    `SELECT * FROM litemall_log WHERE ${whereClause} ORDER BY ${sort} ${order}`,
    offset, limit
  )
  const listRows = await query(sql, params)

  return response.okList(listRows, total, page, limit)
}

module.exports = { list }
