/**
 * 收藏接口
 *
 * 迁移自 WxCollectController
 * 接口：list, addordelete
 */

const { db, response } = require('layer-base')

// ==================== 收藏列表 ====================

async function list(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const type = data.type != null ? data.type : 0
  const page = data.page || 1
  const limit = data.limit || 10
  const sort = data.sort || 'add_time'
  const order = data.order || 'desc'
  const offset = (page - 1) * limit

  // 安全排序
  const sortWhiteList = ['add_time', 'update_time']
  const safeSort = sortWhiteList.includes(sort) ? sort : 'add_time'
  const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM litemall_collect WHERE user_id = ? AND type = ? AND deleted = 0`,
    [userId, type]
  )

  const rows = await db.query(
    `SELECT * FROM litemall_collect WHERE user_id = ? AND type = ? AND deleted = 0
     ORDER BY ${safeSort} ${safeOrder} LIMIT ${offset}, ${limit}`,
    [userId, type]
  )

  const voList = []

  if (type === 0) {
    // 商品收藏：批量查商品
    const valueIds = rows.map(r => r.value_id).filter(Boolean)
    if (valueIds.length > 0) {
      const goodsRows = await db.query(
        `SELECT id, name, brief, pic_url, retail_price, status FROM litemall_goods WHERE id IN (${valueIds.map(() => '?').join(',')})`,
        valueIds
      )
      const goodsMap = {}
      for (const g of goodsRows) {
        goodsMap[g.id] = g
      }
      for (const c of rows) {
        const goods = goodsMap[c.value_id]
        if (!goods) continue
        voList.push({
          id: c.id,
          type: c.type,
          valueId: c.value_id,
          name: goods.name,
          brief: goods.brief,
          picUrl: goods.pic_url,
          retailPrice: goods.retail_price,
        })
      }
    }
  } else if (type === 1) {
    // 专题收藏
    const valueIds = rows.map(r => r.value_id).filter(Boolean)
    if (valueIds.length > 0) {
      const topicRows = await db.query(
        `SELECT id, title, subtitle, price, pic_url FROM litemall_topic WHERE id IN (${valueIds.map(() => '?').join(',')})`,
        valueIds
      )
      const topicMap = {}
      for (const t of topicRows) {
        topicMap[t.id] = t
      }
      for (const c of rows) {
        const topic = topicMap[c.value_id]
        if (!topic) continue
        voList.push({
          id: c.id,
          type: c.type,
          valueId: c.value_id,
          title: topic.title,
          subtitle: topic.subtitle,
          price: topic.price,
          picUrl: topic.pic_url,
        })
      }
    }
  }

  const total = countResult[0].total
  const pages = Math.ceil(total / limit)
  return response.ok({
    list: voList,
    total,
    pages,
    page,
    limit,
  })
}

// ==================== 添加或取消收藏 ====================

async function addordelete(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const { type, valueId } = data
  if (type == null || !valueId) return response.badArgument()

  const rows = await db.query(
    `SELECT * FROM litemall_collect WHERE user_id = ? AND type = ? AND value_id = ? AND deleted = 0 LIMIT 1`,
    [userId, type, valueId]
  )

  if (rows.length > 0) {
    // 已收藏 → 取消
    await db.query(
      `UPDATE litemall_collect SET deleted = 1 WHERE id = ?`,
      [rows[0].id]
    )
  } else {
    // 未收藏 → 添加
    await db.query(
      `INSERT INTO litemall_collect (user_id, value_id, type, add_time, update_time, deleted)
       VALUES (?, ?, ?, NOW(), NOW(), 0)`,
      [userId, valueId, type]
    )
  }

  return response.ok()
}

module.exports = { list, addordelete }
