/**
 * admin-clothing/service/scene.js — 场景标签管理
 */
const { db, response } = require('layer-base')
const { query, execute } = db

// snake_case → camelCase 转换
function toSceneCamel(r) {
  return {
    id: r.id,
    name: r.name,
    icon: r.icon,
    posterUrl: r.poster_url,
    description: r.description,
    sortOrder: r.sort_order,
    enabled: r.enabled,
    addTime: r.add_time,
    updateTime: r.update_time,
  }
}

async function list() {
  const rows = await query('SELECT * FROM clothing_scene WHERE deleted = 0 ORDER BY sort_order ASC')
  return response.okList(rows.map(toSceneCamel), rows.length, 1, rows.length)
}

async function read(data) {
  const { id } = data
  if (!id) return response.badArgument()
  const rows = await query('SELECT * FROM clothing_scene WHERE id = ? AND deleted = 0', [id])
  if (rows.length === 0) return response.badArgumentValue()
  return response.ok(toSceneCamel(rows[0]))
}

async function create(data) {
  const { name, icon, sort_order, enabled } = data
  if (!name) return response.badArgument()

  const existRows = await query('SELECT id FROM clothing_scene WHERE name = ? AND deleted = 0', [name])
  if (existRows.length > 0) return response.fail(402, '场景名称已存在')

  const result = await execute(
    'INSERT INTO clothing_scene (name, description, icon, poster_url, sort_order, enabled, add_time, update_time, deleted) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)',
    [name, data.description || '', icon || '', data.posterUrl || '', sort_order || 0, enabled !== undefined ? (enabled ? 1 : 0) : 1]
  )
  return response.ok({ id: result.insertId })
}

async function update(data) {
  const { id, name, icon, sort_order, enabled } = data
  if (!id) return response.badArgument()

  if (name) {
    const existRows = await query('SELECT id FROM clothing_scene WHERE name = ? AND deleted = 0 AND id != ?', [name, id])
    if (existRows.length > 0) return response.fail(402, '场景名称已存在')
  }

  const sets = []
  const params = []
  if (name !== undefined) { sets.push('name = ?'); params.push(name) }
  if (data.description !== undefined) { sets.push('description = ?'); params.push(data.description) }
  if (icon !== undefined) { sets.push('icon = ?'); params.push(icon) }
  if (data.posterUrl !== undefined) { sets.push('poster_url = ?'); params.push(data.posterUrl) }
  if (sort_order !== undefined) { sets.push('sort_order = ?'); params.push(sort_order) }
  if (enabled !== undefined) { sets.push('enabled = ?'); params.push(enabled ? 1 : 0) }
  sets.push('update_time = NOW()')
  params.push(id)
  await execute(`UPDATE clothing_scene SET ${sets.join(', ')} WHERE id = ?`, params)
  return response.ok()
}

async function deleteFn(data) {
  const { id } = data
  if (!id) return response.badArgument()
  await execute('UPDATE clothing_scene SET deleted = 1 WHERE id = ? AND deleted = 0', [id])
  return response.ok()
}

async function enable(data) {
  const { id, enabled } = data
  if (!id || enabled === undefined) return response.badArgument()
  await execute('UPDATE clothing_scene SET enabled = ?, update_time = NOW() WHERE id = ? AND deleted = 0', [enabled ? 1 : 0, id])
  return response.ok()
}

async function goods(data) {
  const { sceneId } = data
  if (!sceneId) return response.badArgument()
  const rows = await query('SELECT goods_id FROM clothing_scene_goods WHERE scene_id = ? AND deleted = 0', [sceneId])
  return response.ok(rows.map(r => r.goods_id))
}

async function goodsUpdate(data) {
  const { sceneId, goodsIds } = data
  if (!sceneId) return response.badArgument()

  await execute('DELETE FROM clothing_scene_goods WHERE scene_id = ?', [sceneId])

  if (Array.isArray(goodsIds) && goodsIds.length > 0) {
    const values = goodsIds.map(gid => `(${sceneId}, ${gid})`).join(',')
    await execute(`INSERT INTO clothing_scene_goods (scene_id, goods_id) VALUES ${values}`)
  }

  return response.ok()
}

module.exports = { list, read, create, update, delete: deleteFn, enable, goods, goodsUpdate }
