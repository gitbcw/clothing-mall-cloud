/**
 * 浏览足迹接口
 *
 * 迁移自 WxFootprintController
 * 接口：list, remove
 */

const { db, response } = require('layer-base')

// ==================== 足迹列表 ====================

async function list(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const page = data.page || 1
  const limit = data.limit || 10
  const offset = (page - 1) * limit

  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM litemall_footprint WHERE user_id = ? AND deleted = 0`,
    [userId]
  )

  const rows = await db.query(
    `SELECT * FROM litemall_footprint WHERE user_id = ? AND deleted = 0
     ORDER BY add_time DESC LIMIT ${offset}, ${limit}`,
    [userId]
  )

  // 批量查商品
  const goodsIds = rows.map(r => r.goods_id).filter(Boolean)
  const goodsMap = {}
  if (goodsIds.length > 0) {
    const goodsRows = await db.query(
      `SELECT id, name, brief, pic_url, retail_price FROM litemall_goods WHERE id IN (${goodsIds.map(() => '?').join(',')})`,
      goodsIds
    )
    for (const g of goodsRows) {
      goodsMap[g.id] = g
    }
  }

  const voList = []
  for (const f of rows) {
    const goods = goodsMap[f.goods_id]
    if (!goods) continue
    voList.push({
      id: f.id,
      goodsId: f.goods_id,
      addTime: f.add_time,
      name: goods.name,
      brief: goods.brief,
      picUrl: goods.pic_url,
      retailPrice: goods.retail_price,
    })
  }

  return response.ok({
    list: voList,
    total: countResult[0].total,
    pages: Math.ceil(countResult[0].total / limit),
    page,
    limit,
  })
}

// ==================== 删除足迹 ====================

async function remove(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const { id } = data
  if (!id) return response.badArgument()

  const rows = await db.query(
    `SELECT * FROM litemall_footprint WHERE id = ? AND user_id = ? AND deleted = 0 LIMIT 1`,
    [id, userId]
  )
  if (rows.length === 0) return response.badArgumentValue()

  await db.query(
    `UPDATE litemall_footprint SET deleted = 1 WHERE id = ?`,
    [id]
  )

  return response.ok()
}

module.exports = { list, remove }
