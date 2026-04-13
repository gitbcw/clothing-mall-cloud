/**
 * 常见问题接口
 *
 * 迁移自 WxIssueController
 * 接口：list
 */

const { db, response } = require('layer-base')

async function list(data) {
  const question = data.question || ''
  const page = parseInt(data.page) || 1
  const size = Math.max(1, Math.min(100, parseInt(data.size) || 10))
  const sort = data.sort || 'add_time'
  const order = data.order || 'desc'
  const offset = (page - 1) * size

  const allowedSorts = ['add_time']
  const allowedOrders = ['asc', 'desc']
  const safeSort = allowedSorts.includes(sort) ? sort : 'add_time'
  const safeOrder = allowedOrders.includes(order) ? order : 'desc'

  let whereClause = 'deleted = 0'
  const params = []

  if (question) {
    whereClause += ' AND question LIKE ?'
    params.push(`%${question}%`)
  }

  const [rows, countRows] = await Promise.all([
    db.query(
      `SELECT id, question, answer
       FROM litemall_issue
       WHERE ${whereClause}
       ORDER BY \`${safeSort}\` ${safeOrder} LIMIT ${offset}, ${size}`,
      params
    ),
    db.query(
      `SELECT COUNT(*) as total FROM litemall_issue WHERE ${whereClause}`,
      params
    ),
  ])

  return response.ok({
    list: rows,
    total: countRows[0].total,
    page,
    limit: size,
  })
}

module.exports = { list }
