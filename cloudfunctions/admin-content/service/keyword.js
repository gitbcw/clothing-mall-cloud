/**
 * admin-content/service/keyword.js — 关键词管理 CRUD
 */
const { db, response, paginate } = require('layer-base')
const { query, execute } = db

const SORT_WHITELIST = ['id', 'keyword', 'add_time', 'sort_order']
function safeSort(sort, order) {
  const s = SORT_WHITELIST.includes(sort) ? sort : 'add_time'
  const o = order === 'asc' ? 'ASC' : 'DESC'
  return { sort: s, order: o }
}

async function list(data) {
  const { page, limit, offset } = paginate.parsePage({ data })
  const where = ['deleted = 0']
  const params = []
  if (data.keyword) { where.push('keyword LIKE ?'); params.push(`%${data.keyword}%`) }
  if (data.url) { where.push('url LIKE ?'); params.push(`%${data.url}%`) }
  const whereClause = where.join(' AND ')
  const { sort, order } = safeSort(data.sort, data.order)

  const countRows = await query(`SELECT COUNT(*) AS total FROM litemall_keyword WHERE ${whereClause}`, params)
  const total = countRows[0] ? countRows[0].total : 0
  const sql = paginate.appendLimit(`SELECT * FROM litemall_keyword WHERE ${whereClause} ORDER BY ${sort} ${order}`, offset, limit)
  const listRows = await query(sql, params)

  return response.okList(listRows, total, page, limit)
}

async function create(data) {
  const { keyword, url, is_hot, is_default, sort_order } = data
  if (!keyword) return response.badArgument()
  const result = await execute(
    'INSERT INTO litemall_keyword (keyword, url, is_hot, is_default, sort_order, add_time, update_time, deleted) VALUES (?, ?, ?, ?, ?, NOW(), NOW(), 0)',
    [keyword, url || '', is_hot ? 1 : 0, is_default ? 1 : 0, sort_order || 100]
  )
  return response.ok({ id: result.insertId })
}

async function read(data) {
  const { id } = data
  if (!id) return response.badArgument()
  const rows = await query('SELECT * FROM litemall_keyword WHERE id = ? AND deleted = 0', [id])
  if (rows.length === 0) return response.badArgumentValue()
  return response.ok(rows[0])
}

async function update(data) {
  const { id, keyword, url, is_hot, is_default, sort_order } = data
  if (!id) return response.badArgument()
  const sets = []
  const params = []
  if (keyword !== undefined) { sets.push('keyword = ?'); params.push(keyword) }
  if (url !== undefined) { sets.push('url = ?'); params.push(url) }
  if (is_hot !== undefined) { sets.push('is_hot = ?'); params.push(is_hot ? 1 : 0) }
  if (is_default !== undefined) { sets.push('is_default = ?'); params.push(is_default ? 1 : 0) }
  if (sort_order !== undefined) { sets.push('sort_order = ?'); params.push(sort_order) }
  sets.push('update_time = NOW()')
  params.push(id)
  await execute(`UPDATE litemall_keyword SET ${sets.join(', ')} WHERE id = ? AND deleted = 0`, params)
  return response.ok()
}

async function deleteFn(data) {
  const { id } = data
  if (!id) return response.badArgument()
  await execute('UPDATE litemall_keyword SET deleted = 1 WHERE id = ? AND deleted = 0', [id])
  return response.ok()
}

module.exports = { list, create, read, update, delete: deleteFn }
