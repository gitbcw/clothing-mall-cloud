/**
 * admin-goods/service/category.js
 *
 * 分类管理 CRUD
 */

const { db, response } = require('layer-base')
const { query, execute } = db

// 兼容前端 camelCase 和数据库 snake_case
function get(data, snakeKey) {
  const camelKey = snakeKey.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
  return data[snakeKey] !== undefined ? data[snakeKey] : data[camelKey]
}

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
  const name = data.name
  const level = data.level
  if (!name || !level) return response.badArgument()
  if (level !== 'L1' && level !== 'L2') return response.badArgument()

  const keywords = data.keywords || ''
  const desc = data.desc || ''
  const icon_url = get(data, 'icon_url') || ''
  const pic_url = get(data, 'pic_url') || ''
  const pid = data.pid || 0
  const sort_order = get(data, 'sort_order') || 100
  const enabled = data.enabled !== undefined ? data.enabled : 1
  const enable_size = get(data, 'enable_size')
  const enableSizeVal = enable_size !== undefined ? (enable_size ? 1 : 0) : 1

  const result = await execute(
    'INSERT INTO litemall_category (name, keywords, `desc`, icon_url, pic_url, level, pid, sort_order, enabled, enable_size, add_time, update_time, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)',
    [name, keywords, desc, icon_url, pic_url, level, pid, sort_order, enabled, enableSizeVal]
  )
  return response.ok({ id: result.insertId })
}

async function update(data) {
  const { id } = data
  if (!id) return response.badArgument()
  const sets = []
  const params = []

  const fields = [
    ['name', data.name],
    ['keywords', data.keywords],
    ['`desc`', data.desc],
    ['icon_url', get(data, 'icon_url')],
    ['pic_url', get(data, 'pic_url')],
    ['level', data.level],
    ['pid', data.pid],
    ['sort_order', get(data, 'sort_order')],
    ['enabled', data.enabled !== undefined ? (data.enabled ? 1 : 0) : undefined],
    ['enable_size', get(data, 'enable_size') !== undefined ? (get(data, 'enable_size') ? 1 : 0) : undefined],
  ]

  for (const [col, val] of fields) {
    if (val !== undefined) {
      sets.push(`${col} = ?`)
      params.push(val)
    }
  }

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
