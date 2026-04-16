/**
 * admin-clothing/service/guide.js — 导购管理 CRUD
 */
const { db, response, paginate } = require('layer-base')
const { query, execute } = db

const SORT_WHITELIST = ['id', 'name', 'add_time']
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
  if (data.phone) { where.push('phone LIKE ?'); params.push(`%${data.phone}%`) }
  if (data.storeId) { where.push('store_id = ?'); params.push(data.storeId) }
  if (data.status !== undefined) { where.push('status = ?'); params.push(data.status ? 1 : 0) }
  const whereClause = where.join(' AND ')
  const { sort, order } = safeSort(data.sort, data.order)

  const countRows = await query(`SELECT COUNT(*) AS total FROM clothing_guide WHERE ${whereClause}`, params)
  const total = countRows[0] ? countRows[0].total : 0
  const selectFields = `id, name, phone, avatar, store_id AS storeId, qrcode_url AS qrcodeUrl, commission_rate AS commissionRate, status, add_time AS addTime, update_time AS updateTime`
  const sql = paginate.appendLimit(`SELECT ${selectFields} FROM clothing_guide WHERE ${whereClause} ORDER BY ${sort} ${order}`, offset, limit)
  const listRows = await query(sql, params)
  return response.okList(listRows, total, page, limit)
}

async function read(data) {
  const { id } = data
  if (!id) return response.badArgument()
  const rows = await query('SELECT id, name, phone, avatar, store_id AS storeId, qrcode_url AS qrcodeUrl, commission_rate AS commissionRate, status, add_time AS addTime, update_time AS updateTime FROM clothing_guide WHERE id = ? AND deleted = 0', [id])
  if (rows.length === 0) return response.badArgumentValue()
  return response.ok(rows[0])
}

async function create(data) {
  const { name, phone, storeId, avatar, commissionRate, status } = data
  if (!name) return response.badArgument()
  if (!phone) return response.badArgument()
  if (!/^1[3-9]\d{9}$/.test(phone)) return response.badArgument()

  const existRows = await query('SELECT id FROM clothing_guide WHERE phone = ? AND deleted = 0', [phone])
  if (existRows.length > 0) return response.fail(402, '手机号已存在')

  const result = await execute(
    'INSERT INTO clothing_guide (name, phone, store_id, avatar, commission_rate, status, add_time, update_time, deleted) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)',
    [name, phone, storeId || null, avatar || '', commissionRate !== undefined ? commissionRate : 0.01, status !== undefined ? (status ? 1 : 0) : 1]
  )
  return response.ok({ id: result.insertId })
}

async function update(data) {
  const { id, name, phone, storeId, avatar, commissionRate, status } = data
  if (!id) return response.badArgument()

  const rows = await query('SELECT id, phone FROM clothing_guide WHERE id = ? AND deleted = 0', [id])
  if (rows.length === 0) return response.badArgumentValue()

  if (phone && !/^1[3-9]\d{9}$/.test(phone)) return response.badArgument()

  if (phone && phone !== rows[0].phone) {
    const existRows = await query('SELECT id FROM clothing_guide WHERE phone = ? AND deleted = 0 AND id != ?', [phone, id])
    if (existRows.length > 0) return response.fail(402, '手机号已存在')
  }

  const sets = []
  const params = []
  if (name !== undefined) { sets.push('name = ?'); params.push(name) }
  if (phone !== undefined) { sets.push('phone = ?'); params.push(phone) }
  if (storeId !== undefined) { sets.push('store_id = ?'); params.push(storeId) }
  if (avatar !== undefined) { sets.push('avatar = ?'); params.push(avatar) }
  if (commissionRate !== undefined) { sets.push('commission_rate = ?'); params.push(commissionRate) }
  if (status !== undefined) { sets.push('status = ?'); params.push(status ? 1 : 0) }
  sets.push('update_time = NOW()')
  params.push(id)
  await execute(`UPDATE clothing_guide SET ${sets.join(', ')} WHERE id = ?`, params)
  return response.ok()
}

async function deleteFn(data) {
  const { id } = data
  if (!id) return response.badArgument()
  await execute('UPDATE clothing_guide SET deleted = 1 WHERE id = ? AND deleted = 0', [id])
  return response.ok()
}

module.exports = { list, read, create, update, delete: deleteFn }
