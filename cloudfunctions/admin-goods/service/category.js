/**
 * admin-goods/service/category.js
 *
 * 分类管理 CRUD
 */

const { db, response } = require('layer-base')
const { query, execute } = db

async function list() {
  const rows = await query('SELECT * FROM litemall_category WHERE deleted = 0 AND pid = 0 ORDER BY sort_order ASC')
  return response.okList(rows)
}

async function l1() {
  const rows = await query('SELECT id, name FROM litemall_category WHERE deleted = 0 AND pid = 0 ORDER BY sort_order ASC')
  return response.ok(rows.map(r => ({ value: r.id, label: r.name })))
}

async function read(data) {
  const { id } = data
  if (!id) return response.badArgument()
  const rows = await query('SELECT * FROM litemall_category WHERE id = ? AND deleted = 0', [id])
  if (rows.length === 0) return response.badArgumentValue()
  return response.ok(rows[0])
}

async function create(data) {
  const { name, keywords, desc, icon_url, pic_url, level, pid, sort_order } = data
  if (!name || !level) return response.badArgument()
  if (level !== 'L1' && level !== 'L2') return response.badArgument()

  const result = await execute(
    'INSERT INTO litemall_category (name, keywords, `desc`, icon_url, pic_url, level, pid, sort_order, add_time, update_time, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)',
    [name, keywords || '', desc || '', icon_url || '', pic_url || '', level, pid || 0, sort_order || 100]
  )
  return response.ok({ id: result.insertId })
}

async function update(data) {
  const { id, name, keywords, desc, icon_url, pic_url, level, pid, sort_order } = data
  if (!id) return response.badArgument()
  const sets = []
  const params = []
  if (name !== undefined) { sets.push('name = ?'); params.push(name) }
  if (keywords !== undefined) { sets.push('keywords = ?'); params.push(keywords) }
  if (desc !== undefined) { sets.push('`desc` = ?'); params.push(desc) }
  if (icon_url !== undefined) { sets.push('icon_url = ?'); params.push(icon_url) }
  if (pic_url !== undefined) { sets.push('pic_url = ?'); params.push(pic_url) }
  if (level !== undefined) { sets.push('level = ?'); params.push(level) }
  if (pid !== undefined) { sets.push('pid = ?'); params.push(pid) }
  if (sort_order !== undefined) { sets.push('sort_order = ?'); params.push(sort_order) }
  sets.push('update_time = NOW()')
  params.push(id)
  await execute(`UPDATE litemall_category SET ${sets.join(', ')} WHERE id = ? AND deleted = 0`, params)
  return response.ok()
}

async function deleteFn(data) {
  const { id } = data
  if (!id) return response.badArgument()
  await execute('UPDATE litemall_category SET deleted = 1 WHERE id = ? AND deleted = 0', [id])
  return response.ok()
}

module.exports = { list, l1, read, create, update, delete: deleteFn }
