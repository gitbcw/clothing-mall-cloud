/**
 * admin-goods/service/brand.js
 *
 * 品牌管理 CRUD
 */

const { db, response, paginate } = require('layer-base')
const { query, execute } = db

const SORT_WHITELIST = ['id', 'name', 'add_time', 'sort_order']
function safeSort(sort, order) {
  const s = SORT_WHITELIST.includes(sort) ? sort : 'id'
  const o = order === 'asc' ? 'ASC' : 'DESC'
  return { sort: s, order: o }
}

async function list(data) {
  const { page, limit, offset } = paginate.parsePage({ data })
  const where = []
  const params = []
  if (data.name) { where.push('name LIKE ?'); params.push(`%${data.name}%`) }
  if (data.id) { where.push('id = ?'); params.push(data.id) }
  where.push('deleted = 0')
  const whereClause = where.join(' AND ')
  const { sort, order } = safeSort(data.sort, data.order)

  const countRows = await query(`SELECT COUNT(*) AS total FROM litemall_brand WHERE ${whereClause}`, params)
  const total = countRows[0] ? countRows[0].total : 0
  const sql = paginate.appendLimit(`SELECT * FROM litemall_brand WHERE ${whereClause} ORDER BY ${sort} ${order}`, offset, limit)
  const listRows = await query(sql, params)

  return response.okList(listRows, total, page, limit)
}

async function create(data) {
  const { name, desc, pic_url, floor_price, sort_order } = data
  if (!name || !desc) return response.badArgument()

  const result = await execute(
    'INSERT INTO litemall_brand (name, `desc`, pic_url, floor_price, sort_order, add_time, update_time, deleted) VALUES (?, ?, ?, ?, ?, NOW(), NOW(), 0)',
    [name, desc, pic_url || '', floor_price || 0, sort_order || 100]
  )
  return response.ok({ id: result.insertId })
}

async function read(data) {
  const { id } = data
  if (!id) return response.badArgument()
  const rows = await query('SELECT * FROM litemall_brand WHERE id = ? AND deleted = 0', [id])
  if (rows.length === 0) return response.badArgumentValue()
  return response.ok(rows[0])
}

async function update(data) {
  const { id, name, desc, pic_url, floor_price, sort_order } = data
  if (!id) return response.badArgument()
  const sets = []
  const params = []
  if (name !== undefined) { sets.push('name = ?'); params.push(name) }
  if (desc !== undefined) { sets.push('`desc` = ?'); params.push(desc) }
  if (pic_url !== undefined) { sets.push('pic_url = ?'); params.push(pic_url) }
  if (floor_price !== undefined) { sets.push('floor_price = ?'); params.push(floor_price) }
  if (sort_order !== undefined) { sets.push('sort_order = ?'); params.push(sort_order) }
  sets.push('update_time = NOW()')
  params.push(id)
  const result = await execute(`UPDATE litemall_brand SET ${sets.join(', ')} WHERE id = ? AND deleted = 0`, params)
  if (result.affectedRows === 0) return response.updatedDataFailed()
  return response.ok()
}

async function deleteFn(data) {
  const { id } = data
  if (!id) return response.badArgument()
  const result = await execute('UPDATE litemall_brand SET deleted = 1 WHERE id = ? AND deleted = 0', [id])
  if (result.affectedRows === 0) return response.updatedDataFailed()
  return response.ok()
}

module.exports = { list, create, read, update, delete: deleteFn }
