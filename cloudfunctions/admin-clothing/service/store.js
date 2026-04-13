/**
 * admin-clothing/service/store.js — 门店管理 CRUD
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
  if (data.status !== undefined) { where.push('status = ?'); params.push(data.status ? 1 : 0) }
  const whereClause = where.join(' AND ')
  const { sort, order } = safeSort(data.sort, data.order)

  const countRows = await query(`SELECT COUNT(*) AS total FROM clothing_store WHERE ${whereClause}`, params)
  const total = countRows[0] ? countRows[0].total : 0
  const sql = paginate.appendLimit(`SELECT * FROM clothing_store WHERE ${whereClause} ORDER BY ${sort} ${order}`, offset, limit)
  const listRows = await query(sql, params)
  return response.okList(listRows, total, page, limit)
}

async function read(data) {
  const { id } = data
  if (!id) return response.badArgument()
  const rows = await query('SELECT * FROM clothing_store WHERE id = ? AND deleted = 0', [id])
  if (rows.length === 0) return response.badArgumentValue()
  return response.ok(rows[0])
}

async function create(data) {
  const { name, address, phone, businessHours, sort_order, status } = data
  if (!name || !address || !phone) return response.badArgument()
  const result = await execute(
    'INSERT INTO clothing_store (name, address, phone, business_hours, sort_order, status, add_time, update_time, deleted) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)',
    [name, address, phone, businessHours || '', sort_order || 100, status !== undefined ? (status ? 1 : 0) : 1]
  )
  return response.ok({ id: result.insertId })
}

async function update(data) {
  const { id, name, address, phone, businessHours, sort_order, status } = data
  if (!id) return response.badArgument()
  const rows = await query('SELECT id FROM clothing_store WHERE id = ? AND deleted = 0', [id])
  if (rows.length === 0) return response.badArgumentValue()

  const sets = []
  const params = []
  if (name !== undefined) { sets.push('name = ?'); params.push(name) }
  if (address !== undefined) { sets.push('address = ?'); params.push(address) }
  if (phone !== undefined) { sets.push('phone = ?'); params.push(phone) }
  if (businessHours !== undefined) { sets.push('business_hours = ?'); params.push(businessHours) }
  if (sort_order !== undefined) { sets.push('sort_order = ?'); params.push(sort_order) }
  if (status !== undefined) { sets.push('status = ?'); params.push(status ? 1 : 0) }
  sets.push('update_time = NOW()')
  params.push(id)
  await execute(`UPDATE clothing_store SET ${sets.join(', ')} WHERE id = ?`, params)
  return response.ok()
}

async function deleteFn(data) {
  const { id } = data
  if (!id) return response.badArgument()
  await execute('UPDATE clothing_store SET deleted = 1 WHERE id = ? AND deleted = 0', [id])
  return response.ok()
}

async function listAll() {
  const rows = await query('SELECT id, name, address, phone, business_hours, status, sort_order FROM clothing_store WHERE deleted = 0 ORDER BY sort_order ASC')
  return response.okList(rows, rows.length, 1, rows.length)
}

module.exports = { list, read, create, update, delete: deleteFn, all: listAll }
