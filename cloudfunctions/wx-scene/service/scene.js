/**
 * 场景接口
 *
 * 迁移自 WxSceneController
 * 接口：list, banners, goods
 */

const { db, response } = require('layer-base')

const ACCESSORY_CATEGORY_CONDITION = `(c.id IS NOT NULL AND (c.name = '饰品' OR c.name LIKE '%首饰%' OR c.keywords LIKE '%饰品%' OR c.keywords LIKE '%首饰%'))`

function toSceneCamel(r) {
  return {
    id: r.id, name: r.name, icon: r.icon, posterUrl: r.poster_url,
    description: r.description, sortOrder: r.sort_order,
    enabled: !!r.enabled, addTime: r.add_time, updateTime: r.update_time,
  }
}

function toGoodsCamel(r) {
  return {
    id: r.id, name: r.name, brief: r.brief, picUrl: r.pic_url,
    retailPrice: r.retail_price, specialPrice: r.special_price,
    isNew: !!r.is_new, isHot: !!r.is_hot,
    categoryId: r.category_id,
  }
}

// ==================== 场景名称列表（小程序预加载） ====================

async function list() {
  const rows = await db.query(
    `SELECT id, name, icon FROM clothing_scene WHERE enabled = 1 AND deleted = 0 ORDER BY sort_order ASC`
  )

  return response.ok(rows.map(toSceneCamel))
}

// ==================== 场景轮播（含海报图） ====================

async function banners() {
  const rows = await db.query(
    `SELECT id, name, poster_url, description
     FROM clothing_scene WHERE enabled = 1 AND deleted = 0 AND poster_url IS NOT NULL AND poster_url != ''
     ORDER BY sort_order ASC`
  )

  return response.ok(rows.map(toSceneCamel))
}

// ==================== 场景商品列表 ====================

async function goods(data) {
  const { sceneId } = data
  if (!sceneId) return response.badArgument()

  const page = data.page || 1
  const limit = data.limit || 10
  const offset = (page - 1) * limit

  const countResult = await db.query(
    `SELECT COUNT(DISTINCT g.id) as total
     FROM clothing_goods_scene gs
     JOIN litemall_goods g ON g.id = gs.goods_id
     LEFT JOIN litemall_category c ON c.id = g.category_id AND c.deleted = 0
     WHERE gs.scene_id = ? AND gs.deleted = 0
       AND g.deleted = 0 AND g.status = 'published'
       AND NOT (${ACCESSORY_CATEGORY_CONDITION})`,
    [sceneId]
  )

  const goodsRows = await db.query(
    `SELECT g.id, g.name, g.brief, g.pic_url, g.retail_price, g.special_price,
            g.is_new, g.is_hot, g.category_id, MAX(gs.add_time) AS latest_add_time
     FROM clothing_goods_scene gs
     JOIN litemall_goods g ON g.id = gs.goods_id
     LEFT JOIN litemall_category c ON c.id = g.category_id AND c.deleted = 0
     WHERE gs.scene_id = ? AND gs.deleted = 0
       AND g.deleted = 0 AND g.status = 'published'
       AND NOT (${ACCESSORY_CATEGORY_CONDITION})
     GROUP BY g.id, g.name, g.brief, g.pic_url, g.retail_price, g.special_price,
              g.is_new, g.is_hot, g.category_id
     ORDER BY latest_add_time DESC
     LIMIT ${offset}, ${limit}`,
    [sceneId]
  )

  if (goodsRows.length === 0) {
    return response.okList([], countResult[0].total, page, limit)
  }

  return response.okList(goodsRows.map(toGoodsCamel), countResult[0].total, page, limit)
}

module.exports = { list, banners, goods }
