/**
 * 管理端场景接口
 *
 * 迁移自 WxManagerSceneController
 * 接口：sceneList, sceneRead, sceneCreate, sceneUpdate, sceneDelete, sceneEnable, sceneGoods, sceneGoodsUpdate
 *
 * 删除策略：硬删除（启用/禁用控制展示，删除即彻底移除并释放名称）
 */

const { db, response } = require('layer-base')

const ACCESSORY_CATEGORY_CONDITION = `(c.id IS NOT NULL AND (c.name = '饰品' OR c.name LIKE '%首饰%' OR c.keywords LIKE '%饰品%' OR c.keywords LIKE '%首饰%'))`

// ==================== 场景列表 ====================

async function sceneList() {
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
  return response.ok(rows.map(r => ({
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
  })))
}

// ==================== 场景详情 ====================

async function sceneRead(data) {
  const { id } = data
  if (!id) return response.badArgument()

  const rows = await db.query(
    `SELECT * FROM clothing_scene WHERE id = ? LIMIT 1`,
    [id]
  )
  if (rows.length === 0) return response.badArgumentValue()

  const r = rows[0]
  return response.ok({
    id: r.id,
    name: r.name,
    icon: r.icon,
    posterUrl: r.poster_url,
    description: r.description,
    sortOrder: r.sort_order,
    enabled: r.enabled,
    addTime: r.add_time,
    updateTime: r.update_time,
  })
}

// ==================== 创建场景 ====================

async function sceneCreate(data) {
  const { name } = data
  if (!name) return response.fail(401, '场景名称不能为空')

  // 检查名称唯一
  const existRows = await db.query(
    `SELECT id FROM clothing_scene WHERE name = ? LIMIT 1`,
    [name]
  )
  if (existRows.length > 0) return response.fail(401, '场景名称已存在')

  const conn = await db.getConnection()
  try {
    const [result] = await conn.query(
      `INSERT INTO clothing_scene (name, description, icon, poster_url, sort_order, enabled, add_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [name, data.description || '', data.icon || '', data.posterUrl || '', data.sortOrder || 0, data.enabled !== false ? 1 : 0]
    )
    return response.ok({ id: result.insertId })
  } finally {
    conn.release()
  }
}

// ==================== 更新场景 ====================

async function sceneUpdate(data) {
  const { id, name } = data
  if (!id) return response.badArgument()

  const existRows = await db.query(
    `SELECT id FROM clothing_scene WHERE id = ? LIMIT 1`,
    [id]
  )
  if (existRows.length === 0) return response.badArgumentValue()

  if (name) {
    const nameRows = await db.query(
      `SELECT id FROM clothing_scene WHERE name = ? AND id != ? LIMIT 1`,
      [name, id]
    )
    if (nameRows.length > 0) return response.fail(401, '场景名称已存在')
  }

  const updates = []
  const params = []

  if (name !== undefined) { updates.push('name = ?'); params.push(name) }
  if (data.description !== undefined) { updates.push('description = ?'); params.push(data.description) }
  if (data.posterUrl !== undefined) { updates.push('poster_url = ?'); params.push(data.posterUrl) }
  if (data.sortOrder !== undefined) { updates.push('sort_order = ?'); params.push(data.sortOrder) }
  if (data.enabled !== undefined) { updates.push('enabled = ?'); params.push(data.enabled ? 1 : 0) }

  if (updates.length === 0) return response.ok()

  updates.push('update_time = NOW()')
  params.push(id)

  await db.query(
    `UPDATE clothing_scene SET ${updates.join(', ')} WHERE id = ?`,
    params
  )

  return response.ok()
}

// ==================== 删除场景（硬删除） ====================

async function sceneDelete(data) {
  const { id } = data
  if (!id) return response.badArgument()

  const conn = await db.getConnection()
  try {
    // 先删关联商品
    await conn.query(
      `DELETE FROM clothing_goods_scene WHERE scene_id = ?`,
      [id]
    )
    // 再删场景
    await conn.query(
      `DELETE FROM clothing_scene WHERE id = ?`,
      [id]
    )
    return response.ok()
  } finally {
    conn.release()
  }
}

// ==================== 启用/禁用场景 ====================

async function sceneEnable(data) {
  const { id, enabled } = data
  if (!id || enabled === undefined) return response.badArgument()

  const rows = await db.query(
    `SELECT id FROM clothing_scene WHERE id = ? LIMIT 1`,
    [id]
  )
  if (rows.length === 0) return response.badArgumentValue()

  await db.query(
    `UPDATE clothing_scene SET enabled = ?, update_time = NOW() WHERE id = ?`,
    [enabled ? 1 : 0, id]
  )

  return response.ok()
}

// ==================== 场景商品列表 ====================

async function sceneGoods(data) {
  const { sceneId } = data
  if (!sceneId) return response.badArgument()

  const rows = await db.query(
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

// ==================== 更新场景商品 ====================

async function sceneGoodsUpdate(data) {
  const { sceneId, goodsIds } = data
  if (!sceneId) return response.badArgument()

  // 先获取该场景原来的关联商品ID
  const oldRows = await db.query('SELECT goods_id FROM clothing_goods_scene WHERE scene_id = ? AND deleted = 0', [sceneId])
  const oldGoodsIds = oldRows.map(r => r.goods_id)
  const nextGoodsIds = await filterSceneGoodsIds(goodsIds || [])

  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    // 硬删除旧关联
    await conn.query(
      `DELETE FROM clothing_goods_scene WHERE scene_id = ?`,
      [sceneId]
    )

    // 插入新关联
    if (nextGoodsIds.length > 0) {
      for (const goodsId of nextGoodsIds) {
        await conn.query(
          `INSERT IGNORE INTO clothing_goods_scene (scene_id, goods_id, add_time, deleted)
           VALUES (?, ?, NOW(), 0)`,
          [sceneId, goodsId]
        )
      }
    }

    await conn.commit()
  } catch (err) {
    await conn.rollback()
    console.error('[wx-manager-content] sceneGoodsUpdate error:', err)
    return response.serious()
  } finally {
    conn.release()
  }

  // 异步同步受影响商品的 scene_tags
  _syncGoodsSceneTags(oldGoodsIds, nextGoodsIds).catch(() => {})

  return response.ok()
}

/**
 * 同步受影响商品的 scene_tags（从关联表反查）
 */
async function _syncGoodsSceneTags(oldGoodsIds, newGoodsIds) {
  const allIds = [...new Set([...oldGoodsIds, ...newGoodsIds])].filter(Boolean)
  if (allIds.length === 0) return

  for (const goodsId of allIds) {
    try {
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

module.exports = {
  sceneList, sceneRead, sceneCreate, sceneUpdate, sceneDelete, sceneEnable, sceneGoods, sceneGoodsUpdate,
}
