/**
 * admin-clothing/service/scene.js — 场景标签管理
 *
 * 对齐 wx-manager-content/service/scene.js 逻辑：
 * - 硬删除 + 清理关联表
 * - 列表含 goodsCount
 * - 商品列表返回完整对象
 * - 商品更新使用事务 + 参数化查询
 */
const { db, response } = require('layer-base')
const { query, execute, getConnection } = db

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
    goodsCount: r.goods_count || 0,
    addTime: r.add_time,
    updateTime: r.update_time,
  }
}

async function list() {
  const rows = await db.query(
    `SELECT s.*, (SELECT COUNT(*) FROM clothing_goods_scene gs WHERE gs.scene_id = s.id) AS goods_count
     FROM clothing_scene s ORDER BY s.sort_order ASC`
  )
  return response.ok({ list: rows.map(toSceneCamel) })
}

async function read(data) {
  const { id } = data
  if (!id) return response.badArgument()
  const rows = await query('SELECT * FROM clothing_scene WHERE id = ?', [id])
  if (rows.length === 0) return response.badArgumentValue()
  return response.ok(toSceneCamel(rows[0]))
}

async function create(data) {
  const { name } = data
  if (!name) return response.badArgument()

  const existRows = await query('SELECT id FROM clothing_scene WHERE name = ?', [name])
  if (existRows.length > 0) return response.fail(402, '场景名称已存在')

  const conn = await getConnection()
  try {
    const [result] = await conn.query(
      'INSERT INTO clothing_scene (name, description, icon, poster_url, sort_order, enabled, add_time, update_time) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [name, data.description || '', data.icon || '', data.posterUrl || '', data.sortOrder || 0, data.enabled !== false ? 1 : 0]
    )
    return response.ok({ id: result.insertId })
  } finally {
    conn.release()
  }
}

async function update(data) {
  const { id, name } = data
  if (!id) return response.badArgument()

  const existRows = await query('SELECT id FROM clothing_scene WHERE id = ?', [id])
  if (existRows.length === 0) return response.badArgumentValue()

  if (name) {
    const nameRows = await query('SELECT id FROM clothing_scene WHERE name = ? AND id != ?', [name, id])
    if (nameRows.length > 0) return response.fail(402, '场景名称已存在')
  }

  const sets = []
  const params = []
  if (name !== undefined) { sets.push('name = ?'); params.push(name) }
  if (data.description !== undefined) { sets.push('description = ?'); params.push(data.description) }
  if (data.icon !== undefined) { sets.push('icon = ?'); params.push(data.icon) }
  if (data.posterUrl !== undefined) { sets.push('poster_url = ?'); params.push(data.posterUrl) }
  if (data.sortOrder !== undefined) { sets.push('sort_order = ?'); params.push(data.sortOrder) }
  if (data.enabled !== undefined) { sets.push('enabled = ?'); params.push(data.enabled ? 1 : 0) }

  if (sets.length === 0) return response.ok()

  sets.push('update_time = NOW()')
  params.push(id)
  await execute(`UPDATE clothing_scene SET ${sets.join(', ')} WHERE id = ?`, params)
  return response.ok()
}

// 硬删除：先删关联商品，再删场景（对齐小程序端）
async function deleteFn(data) {
  const { id } = data
  if (!id) return response.badArgument()

  const conn = await getConnection()
  try {
    await conn.query('DELETE FROM clothing_goods_scene WHERE scene_id = ?', [id])
    await conn.query('DELETE FROM clothing_scene WHERE id = ?', [id])
    return response.ok()
  } finally {
    conn.release()
  }
}

async function enable(data) {
  const { id, enabled } = data
  if (!id || enabled === undefined) return response.badArgument()

  const rows = await query('SELECT id FROM clothing_scene WHERE id = ?', [id])
  if (rows.length === 0) return response.badArgumentValue()

  await execute('UPDATE clothing_scene SET enabled = ?, update_time = NOW() WHERE id = ?', [enabled ? 1 : 0, id])
  return response.ok()
}

// 返回完整商品对象（对齐小程序端）
async function goods(data) {
  const { sceneId } = data
  if (!sceneId) return response.badArgument()

  const rows = await query(
    `SELECT g.id, g.name, g.pic_url, g.retail_price
     FROM clothing_goods_scene gs
     JOIN litemall_goods g ON g.id = gs.goods_id
     WHERE gs.scene_id = ? AND g.deleted = 0
     ORDER BY gs.add_time DESC`,
    [sceneId]
  )

  return response.ok(rows.map(r => ({
    id: r.id,
    name: r.name,
    picUrl: r.pic_url,
    retailPrice: r.retail_price,
  })))
}

// 使用事务 + 参数化查询（对齐小程序端）
async function goodsUpdate(data) {
  const { sceneId, goodsIds } = data
  if (!sceneId) return response.badArgument()

  const conn = await getConnection()
  try {
    await conn.beginTransaction()

    await conn.query('DELETE FROM clothing_goods_scene WHERE scene_id = ?', [sceneId])

    if (Array.isArray(goodsIds) && goodsIds.length > 0) {
      for (const goodsId of goodsIds) {
        await conn.query(
          'INSERT INTO clothing_goods_scene (scene_id, goods_id, add_time) VALUES (?, ?, NOW())',
          [sceneId, goodsId]
        )
      }
    }

    await conn.commit()
    return response.ok()
  } catch (err) {
    await conn.rollback()
    console.error('[admin-clothing] sceneGoodsUpdate error:', err)
    return response.serious()
  } finally {
    conn.release()
  }
}

module.exports = { list, read, create, update, delete: deleteFn, enable, goods, goodsUpdate }
