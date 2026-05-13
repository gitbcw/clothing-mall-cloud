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

const ACCESSORY_CATEGORY_CONDITION = `(c.id IS NOT NULL AND (c.name = '饰品' OR c.name LIKE '%首饰%' OR c.keywords LIKE '%饰品%' OR c.keywords LIKE '%首饰%'))`

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
    `SELECT s.*, (
       SELECT COUNT(DISTINCT g.id)
       FROM clothing_goods_scene gs
       JOIN litemall_goods g ON g.id = gs.goods_id AND g.deleted = 0
       LEFT JOIN litemall_category c ON c.id = g.category_id AND c.deleted = 0
       WHERE gs.scene_id = s.id AND gs.deleted = 0
         AND NOT (${ACCESSORY_CATEGORY_CONDITION})
     ) AS goods_count
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
    `SELECT g.id, g.name, g.pic_url, g.retail_price, MAX(gs.add_time) AS latest_add_time
     FROM clothing_goods_scene gs
     JOIN litemall_goods g ON g.id = gs.goods_id
     LEFT JOIN litemall_category c ON c.id = g.category_id AND c.deleted = 0
     WHERE gs.scene_id = ? AND gs.deleted = 0 AND g.deleted = 0
       AND NOT (${ACCESSORY_CATEGORY_CONDITION})
     GROUP BY g.id, g.name, g.pic_url, g.retail_price
     ORDER BY latest_add_time DESC`,
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

  // 先获取该场景原来的关联商品ID（用于后续同步 scene_tags）
  const oldRows = await db.query('SELECT goods_id FROM clothing_goods_scene WHERE scene_id = ? AND deleted = 0', [sceneId])
  const oldGoodsIds = oldRows.map(r => r.goods_id)
  const nextGoodsIds = await filterSceneGoodsIds(goodsIds || [])

  const conn = await getConnection()
  try {
    await conn.beginTransaction()

    await conn.query('DELETE FROM clothing_goods_scene WHERE scene_id = ?', [sceneId])

    if (nextGoodsIds.length > 0) {
      for (const goodsId of nextGoodsIds) {
        await conn.query(
          'INSERT IGNORE INTO clothing_goods_scene (scene_id, goods_id, add_time, deleted) VALUES (?, ?, NOW(), 0)',
          [sceneId, goodsId]
        )
      }
    }

    await conn.commit()
  } catch (err) {
    await conn.rollback()
    console.error('[admin-clothing] sceneGoodsUpdate error:', err)
    return response.serious()
  } finally {
    conn.release()
  }

  // 异步同步受影响商品的 scene_tags（不阻塞响应）
  _syncGoodsSceneTags(oldGoodsIds, nextGoodsIds).catch(() => {})

  return response.ok()
}

/**
 * 同步受影响商品的 scene_tags（从关联表反查）
 * 合并新旧商品ID，逐个重算 scene_tags
 */
async function _syncGoodsSceneTags(oldGoodsIds, newGoodsIds) {
  const allIds = [...new Set([...oldGoodsIds, ...newGoodsIds])].filter(Boolean)
  if (allIds.length === 0) return

  for (const goodsId of allIds) {
    try {
      // 查该商品关联的所有场景名称
      const rows = await db.query(
        `SELECT cs.name FROM clothing_goods_scene cgs
         JOIN clothing_scene cs ON cs.id = cgs.scene_id AND cs.deleted = 0
         WHERE cgs.goods_id = ? AND cgs.deleted = 0`,
        [goodsId]
      )
      const tags = rows.map(r => r.name)
      await db.query(
        'UPDATE litemall_goods SET scene_tags = ? WHERE id = ?',
        [tags.length > 0 ? JSON.stringify(tags) : null, goodsId]
      )
    } catch (e) {
      console.error(`[scene] syncGoodsSceneTags goodsId=${goodsId} error:`, e)
    }
  }
}

async function filterSceneGoodsIds(goodsIds) {
  const ids = [...new Set((Array.isArray(goodsIds) ? goodsIds : []).map(id => Number(id)).filter(Boolean))]
  if (ids.length === 0) return []

  const rows = await db.query(
    `SELECT g.id
     FROM litemall_goods g
     LEFT JOIN litemall_category c ON c.id = g.category_id AND c.deleted = 0
     WHERE g.id IN (${ids.map(() => '?').join(',')})
       AND g.deleted = 0
       AND NOT (${ACCESSORY_CATEGORY_CONDITION})`,
    ids
  )
  return rows.map(r => r.id)
}

module.exports = { list, read, create, update, delete: deleteFn, enable, goods, goodsUpdate }
