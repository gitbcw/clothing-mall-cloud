/**
 * 品牌相关接口
 *
 * 迁移自 WxBrandController
 * 接口：list, detail
 */

const { db, response } = require('layer-base')

function toBrandCamel(r) {
  return {
    id: r.id, name: r.name, picUrl: r.pic_url, desc: r.desc,
    floorPrice: r.floor_price, sortOrder: r.sort_order,
    addTime: r.add_time, updateTime: r.update_time,
  }
}

// ==================== 品牌列表 ====================

async function list(data) {
  const page = parseInt(data.page) || 1
  const limit = Math.max(1, Math.min(100, parseInt(data.limit) || 10))
  const sort = data.sort || 'add_time'
  const order = data.order || 'desc'
  const offset = (page - 1) * limit

  // 安全校验排序字段
  const allowedSorts = ['add_time', 'sort_order', 'name']
  const allowedOrders = ['asc', 'desc']
  const safeSort = allowedSorts.includes(sort) ? sort : 'add_time'
  const safeOrder = allowedOrders.includes(order) ? order : 'desc'

  const [rows, countRows] = await Promise.all([
    db.query(
      `SELECT id, name, \`desc\`, pic_url, floor_price
       FROM litemall_brand WHERE deleted = 0
       ORDER BY \`${safeSort}\` ${safeOrder} LIMIT ${offset}, ${limit}`,
    ),
    db.query(
      `SELECT COUNT(*) as total FROM litemall_brand WHERE deleted = 0`
    ),
  ])

  return response.ok({
    list: rows.map(toBrandCamel),
    total: countRows[0].total,
    page,
    limit,
  })
}

// ==================== 品牌详情 ====================

async function detail(data) {
  const id = data.id
  if (!id) return response.badArgument()

  const rows = await db.query(
    `SELECT id, name, \`desc\`, pic_url, sort_order, floor_price, add_time, update_time
     FROM litemall_brand WHERE id = ?`,
    [id]
  )

  if (rows.length === 0) return response.badArgument()

  return response.ok(toBrandCamel(rows[0]))
}

module.exports = { list, detail }
