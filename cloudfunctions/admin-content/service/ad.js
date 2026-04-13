/**
 * admin-content/service/ad.js
 *
 * 广告管理 CRUD
 */

const { db, response, paginate } = require('layer-base')
const { query, execute } = db

const SORT_WHITELIST = ['id', 'name', 'add_time', 'sort_order']
function safeSort(sort, order) {
  const s = SORT_WHITELIST.includes(sort) ? sort : 'add_time'
  const o = order === 'asc' ? 'ASC' : 'DESC'
  return { sort: s, order: o }
}

async function list(data) {
  const { page, limit, offset } = paginate.parsePage({ data })
  const where = ['deleted = 0']
  const params = []
  if (data.name) { where.push('name LIKE ?'); params.push(`%${data.name}%`) }
  if (data.content) { where.push('content LIKE ?'); params.push(`%${data.content}%`) }
  const whereClause = where.join(' AND ')
  const { sort, order } = safeSort(data.sort, data.order)

  const countRows = await query(`SELECT COUNT(*) AS total FROM litemall_ad WHERE ${whereClause}`, params)
  const total = countRows[0] ? countRows[0].total : 0
  const sql = paginate.appendLimit(`SELECT * FROM litemall_ad WHERE ${whereClause} ORDER BY ${sort} ${order}`, offset, limit)
  const listRows = await query(sql, params)

  return response.okList(listRows, total, page, limit)
}

async function create(data) {
  const { name, link, url, position, content, start_time, end_time, enabled, priority, ad_type } = data
  if (!name || !content) return response.badArgument()

  const result = await execute(
    'INSERT INTO litemall_ad (name, link, url, position, content, start_time, end_time, enabled, priority, ad_type, add_time, update_time, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)',
    [name, link || '', url || '', position || 1, content, start_time || null, end_time || null, enabled !== false ? 1 : 0, priority || 1, ad_type || 'normal']
  )
  return response.ok({ id: result.insertId })
}

async function read(data) {
  const { id } = data
  if (!id) return response.badArgument()
  const rows = await query('SELECT * FROM litemall_ad WHERE id = ? AND deleted = 0', [id])
  if (rows.length === 0) return response.badArgumentValue()
  return response.ok(rows[0])
}

async function update(data) {
  const { id, name, link, url, position, content, start_time, end_time, enabled, priority, ad_type } = data
  if (!id) return response.badArgument()
  const sets = []
  const params = []
  if (name !== undefined) { sets.push('name = ?'); params.push(name) }
  if (link !== undefined) { sets.push('link = ?'); params.push(link) }
  if (url !== undefined) { sets.push('url = ?'); params.push(url) }
  if (position !== undefined) { sets.push('position = ?'); params.push(position) }
  if (content !== undefined) { sets.push('content = ?'); params.push(content) }
  if (start_time !== undefined) { sets.push('start_time = ?'); params.push(start_time || null) }
  if (end_time !== undefined) { sets.push('end_time = ?'); params.push(end_time || null) }
  if (enabled !== undefined) { sets.push('enabled = ?'); params.push(enabled ? 1 : 0) }
  if (priority !== undefined) { sets.push('priority = ?'); params.push(priority) }
  if (ad_type !== undefined) { sets.push('ad_type = ?'); params.push(ad_type) }
  sets.push('update_time = NOW()')
  params.push(id)
  await execute(`UPDATE litemall_ad SET ${sets.join(', ')} WHERE id = ? AND deleted = 0`, params)
  return response.ok()
}

async function deleteFn(data) {
  const { id } = data
  if (!id) return response.badArgument()
  await execute('UPDATE litemall_ad SET deleted = 1 WHERE id = ? AND deleted = 0', [id])
  return response.ok()
}

module.exports = { list, create, read, update, delete: deleteFn }
