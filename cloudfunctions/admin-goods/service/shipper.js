/**
 * admin-goods/service/shipper.js
 *
 * 物流公司管理
 */

const { db, response } = require('layer-base')
const { query, execute } = db

async function list() {
  const rows = await query('SELECT * FROM litemall_shipper WHERE deleted = 0 ORDER BY sort_order ASC')
  return response.okList(rows)
}

async function create(data) {
  const { code, name, sort_order } = data
  if (!code || !name) return response.badArgument()
  const result = await execute(
    'INSERT INTO litemall_shipper (code, name, sort_order, add_time, update_time, deleted) VALUES (?, ?, ?, NOW(), NOW(), 0)',
    [code, name, sort_order || 100]
  )
  return response.ok({ id: result.insertId })
}

async function read(data) {
  const { id } = data
  if (!id) return response.badArgument()
  const rows = await query('SELECT * FROM litemall_shipper WHERE id = ? AND deleted = 0', [id])
  if (rows.length === 0) return response.badArgumentValue()
  return response.ok(rows[0])
}

async function update(data) {
  const { id, code, name, sort_order } = data
  if (!id) return response.badArgument()
  const sets = []
  const params = []
  if (code !== undefined) { sets.push('code = ?'); params.push(code) }
  if (name !== undefined) { sets.push('name = ?'); params.push(name) }
  if (sort_order !== undefined) { sets.push('sort_order = ?'); params.push(sort_order) }
  sets.push('update_time = NOW()')
  params.push(id)
  await execute(`UPDATE litemall_shipper SET ${sets.join(', ')} WHERE id = ? AND deleted = 0`, params)
  return response.ok()
}

async function deleteFn(data) {
  const { id } = data
  if (!id) return response.badArgument()
  await execute('UPDATE litemall_shipper SET deleted = 1 WHERE id = ? AND deleted = 0', [id])
  return response.ok()
}

async function toggle(data) {
  const { id } = data
  if (!id) return response.badArgument()
  await execute('UPDATE litemall_shipper SET enabled = NOT enabled, update_time = NOW() WHERE id = ? AND deleted = 0', [id])
  return response.ok()
}

module.exports = { list, create, read, update, delete: deleteFn, toggle }
