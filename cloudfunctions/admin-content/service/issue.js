/**
 * admin-content/service/issue.js — 问题管理 CRUD
 */
const { db, response, paginate } = require('layer-base')
const { query, execute } = db

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
  if (data.question) { where.push('question LIKE ?'); params.push(`%${data.question}%`) }
  const whereClause = where.join(' AND ')
  const { sort, order } = safeSort(data.sort, data.order)

  const countRows = await query(`SELECT COUNT(*) AS total FROM litemall_issue WHERE ${whereClause}`, params)
  const total = countRows[0] ? countRows[0].total : 0
  const sql = paginate.appendLimit(`SELECT * FROM litemall_issue WHERE ${whereClause} ORDER BY ${sort} ${order}`, offset, limit)
  const listRows = await query(sql, params)

  return response.okList(listRows, total, page, limit)
}

async function create(data) {
  const { question, answer } = data
  if (!question || !answer) return response.badArgument()
  const result = await execute(
    'INSERT INTO litemall_issue (question, answer, add_time, update_time, deleted) VALUES (?, ?, NOW(), NOW(), 0)',
    [question, answer]
  )
  return response.ok({ id: result.insertId })
}

async function read(data) {
  const { id } = data
  if (!id) return response.badArgument()
  const rows = await query('SELECT * FROM litemall_issue WHERE id = ? AND deleted = 0', [id])
  if (rows.length === 0) return response.badArgumentValue()
  return response.ok(rows[0])
}

async function update(data) {
  const { id, question, answer } = data
  if (!id) return response.badArgument()
  const sets = []
  const params = []
  if (question !== undefined) { sets.push('question = ?'); params.push(question) }
  if (answer !== undefined) { sets.push('answer = ?'); params.push(answer) }
  sets.push('update_time = NOW()')
  params.push(id)
  await execute(`UPDATE litemall_issue SET ${sets.join(', ')} WHERE id = ? AND deleted = 0`, params)
  return response.ok()
}

async function deleteFn(data) {
  const { id } = data
  if (!id) return response.badArgument()
  await execute('UPDATE litemall_issue SET deleted = 1 WHERE id = ? AND deleted = 0', [id])
  return response.ok()
}

module.exports = { list, create, read, update, delete: deleteFn }
