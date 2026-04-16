/**
 * 专题相关接口
 *
 * 迁移自 WxTopicController
 * 接口：list, detail, related
 */

const { db, response } = require('layer-base')

function toTopicCamel(r) {
  return {
    id: r.id, title: r.title, subtitle: r.subtitle, price: r.price,
    picUrl: r.pic_url, readCount: r.read_count, goods: r.goods,
    content: r.content, sortOrder: r.sort_order,
    addTime: r.add_time, updateTime: r.update_time,
  }
}

function toGoodsCamel(r) {
  return {
    id: r.id, name: r.name, brief: r.brief, picUrl: r.pic_url,
    retailPrice: r.retail_price,
    categoryId: r.category_id, isNew: !!r.is_new, isHot: !!r.is_hot,
  }
}

// ==================== 专题列表 ====================

async function list(data) {
  const page = parseInt(data.page) || 1
  const limit = Math.max(1, Math.min(100, parseInt(data.limit) || 10))
  const sort = data.sort || 'add_time'
  const order = data.order || 'desc'
  const offset = (page - 1) * limit

  const allowedSorts = ['add_time', 'read_count', 'sort_order']
  const allowedOrders = ['asc', 'desc']
  const safeSort = allowedSorts.includes(sort) ? sort : 'add_time'
  const safeOrder = allowedOrders.includes(order) ? order : 'desc'

  const [rows, countRows] = await Promise.all([
    db.query(
      `SELECT id, title, subtitle, price, pic_url, read_count
       FROM litemall_topic WHERE deleted = 0
       ORDER BY \`${safeSort}\` ${safeOrder} LIMIT ${offset}, ${limit}`
    ),
    db.query(`SELECT COUNT(*) as total FROM litemall_topic WHERE deleted = 0`),
  ])

  return response.ok({
    list: rows.map(toTopicCamel),
    total: countRows[0].total,
    page,
    limit,
  })
}

// ==================== 专题详情 ====================

async function detail(data, context) {
  const id = data.id
  if (!id) return response.badArgument()

  const rows = await db.query(
    `SELECT id, title, subtitle, price, pic_url, read_count, goods, content
     FROM litemall_topic WHERE id = ? AND deleted = 0 LIMIT 1`,
    [id]
  )
  if (rows.length === 0) return response.badArgument()

  const topic = rows[0]

  // 解析 goods JSON
  let goodsIds = []
  try { goodsIds = JSON.parse(topic.goods || '[]') } catch (e) { /* ignore */ }

  // 查询关联商品
  const goods = []
  if (goodsIds.length > 0) {
    const goodsRows = await db.query(
      `SELECT id, name, brief, pic_url, retail_price
       FROM litemall_goods
       WHERE id IN (${goodsIds.map(() => '?').join(',')}) AND status = 'published' AND deleted = 0`,
      goodsIds
    )
    goods.push(...goodsRows.map(toGoodsCamel))
  }

  // 用户是否收藏该专题
  let userHasCollect = false
  const userId = context._userId
  if (userId) {
    const countRows = await db.query(
      `SELECT COUNT(*) as cnt FROM litemall_collect
       WHERE user_id = ? AND type = 1 AND value_id = ? AND deleted = 0`,
      [userId, id]
    )
    userHasCollect = countRows[0].cnt > 0
  }

  return response.ok({ topic: toTopicCamel(topic), goods, userHasCollect })
}

// ==================== 相关专题 ====================

async function related(data) {
  const id = data.id
  if (!id) return response.badArgument()

  // 先确认目标专题存在
  const target = await db.query(
    `SELECT id FROM litemall_topic WHERE id = ? AND deleted = 0`,
    [id]
  )

  let rows
  if (target.length > 0) {
    // 查询排除自身的其他专题
    rows = await db.query(
      `SELECT id, title, subtitle, price, pic_url, read_count, goods
       FROM litemall_topic
       WHERE id != ? AND deleted = 0
       ORDER BY add_time DESC LIMIT 4`,
      [id]
    )
  }

  if (!rows || rows.length === 0) {
    // fallback: 最新4个专题
    rows = await db.query(
      `SELECT id, title, subtitle, price, pic_url, read_count
       FROM litemall_topic WHERE deleted = 0
       ORDER BY add_time DESC LIMIT 4`
    )
  }

  return response.ok(rows.map(toTopicCamel))
}

module.exports = { list, detail, related }
