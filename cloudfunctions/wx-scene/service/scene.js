/**
 * 场景接口
 *
 * 迁移自 WxSceneController
 * 接口：list, banners, goods
 */

const { db, response } = require('layer-base')

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
    retailPrice: r.retail_price, isNew: !!r.is_new, isHot: !!r.is_hot,
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

  // 查场景下关联的商品 ID
  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM clothing_goods_scene WHERE scene_id = ?`,
    [sceneId]
  )

  const sceneGoodsRows = await db.query(
    `SELECT goods_id FROM clothing_goods_scene WHERE scene_id = ?
     ORDER BY add_time DESC LIMIT ${offset}, ${limit}`,
    [sceneId]
  )

  if (sceneGoodsRows.length === 0) {
    return response.okList([], countResult[0].total, page, limit)
  }

  // 批量查商品
  const goodsIds = sceneGoodsRows.map(r => r.goods_id)
  const goodsRows = await db.query(
    `SELECT id, name, brief, pic_url, retail_price, is_new, is_hot
     FROM litemall_goods WHERE id IN (${goodsIds.map(() => '?').join(',')}) AND deleted = 0 AND status = 'published'`,
    goodsIds
  )

  return response.okList(goodsRows.map(toGoodsCamel), countResult[0].total, page, limit)
}

module.exports = { list, banners, goods }
