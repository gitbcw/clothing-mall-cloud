/**
 * admin-clothing/service/holiday.js — 节日活动管理
 */
const { db, response } = require('layer-base')
const { query, execute } = db

async function list() {
  const rows = await query('SELECT * FROM clothing_holiday WHERE deleted = 0 ORDER BY sort_order ASC')
  return response.okList(rows, rows.length, 1, rows.length)
}

async function read(data) {
  const { id } = data
  if (!id) return response.badArgument()
  const rows = await query('SELECT * FROM clothing_holiday WHERE id = ? AND deleted = 0', [id])
  if (rows.length === 0) return response.badArgumentValue()
  return response.ok(rows[0])
}

async function create(data) {
  const { name, startDate, endDate, icon, sort_order, enabled } = data
  if (!name || !startDate || !endDate) return response.badArgument()
  if (endDate < startDate) return response.fail(402, '结束日期不能早于开始日期')

  const result = await execute(
    'INSERT INTO clothing_holiday (name, start_date, end_date, icon, sort_order, enabled, add_time, update_time, deleted) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)',
    [name, startDate, endDate, icon || '', sort_order || 0, enabled !== undefined ? (enabled ? 1 : 0) : 1]
  )
  return response.ok({ id: result.insertId })
}

async function update(data) {
  const { id, name, startDate, endDate, icon, sort_order, enabled } = data
  if (!id) return response.badArgument()
  if (startDate && endDate && endDate < startDate) return response.fail(402, '结束日期不能早于开始日期')

  const sets = []
  const params = []
  if (name !== undefined) { sets.push('name = ?'); params.push(name) }
  if (startDate !== undefined) { sets.push('start_date = ?'); params.push(startDate) }
  if (endDate !== undefined) { sets.push('end_date = ?'); params.push(endDate) }
  if (icon !== undefined) { sets.push('icon = ?'); params.push(icon) }
  if (sort_order !== undefined) { sets.push('sort_order = ?'); params.push(sort_order) }
  if (enabled !== undefined) { sets.push('enabled = ?'); params.push(enabled ? 1 : 0) }
  sets.push('update_time = NOW()')
  params.push(id)
  await execute(`UPDATE clothing_holiday SET ${sets.join(', ')} WHERE id = ?`, params)
  return response.ok()
}

async function deleteFn(data) {
  const { id } = data
  if (!id) return response.badArgument()
  await execute('UPDATE clothing_holiday SET deleted = 1 WHERE id = ? AND deleted = 0', [id])
  return response.ok()
}

async function enable(data) {
  const { id, enabled } = data
  if (!id || enabled === undefined) return response.badArgument()
  await execute('UPDATE clothing_holiday SET enabled = ?, update_time = NOW() WHERE id = ? AND deleted = 0', [enabled ? 1 : 0, id])
  return response.ok()
}

async function goods(data) {
  const { holidayId } = data
  if (!holidayId) return response.badArgument()
  const rows = await query('SELECT goods_id FROM clothing_holiday_goods WHERE holiday_id = ? AND deleted = 0', [holidayId])
  return response.ok(rows.map(r => r.goods_id))
}

async function goodsUpdate(data) {
  const { holidayId, goodsIds } = data
  if (!holidayId) return response.badArgument()

  await execute('DELETE FROM clothing_holiday_goods WHERE holiday_id = ?', [holidayId])

  if (Array.isArray(goodsIds) && goodsIds.length > 0) {
    const values = goodsIds.map(gid => `(${holidayId}, ${gid})`).join(',')
    await execute(`INSERT INTO clothing_holiday_goods (holiday_id, goods_id) VALUES ${values}`)
  }

  return response.ok()
}

module.exports = { list, read, create, update, delete: deleteFn, enable, goods, goodsUpdate }
