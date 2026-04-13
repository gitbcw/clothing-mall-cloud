/**
 * admin-stat/service/stat.js — 统计接口
 */
const { db, response } = require('layer-base')
const { query } = db

async function statUser() {
  const rows = await query(
    "SELECT DATE(add_time) AS day, COUNT(*) AS users FROM litemall_user WHERE deleted = 0 AND add_time >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY DATE(add_time) ORDER BY day ASC"
  )
  return response.ok({ columns: ['day', 'users'], rows })
}

async function statOrder() {
  const rows = await query(
    "SELECT DATE(add_time) AS day, COUNT(*) AS orders, COUNT(DISTINCT user_id) AS customers, COALESCE(SUM(actual_price), 0) AS amount FROM litemall_order WHERE deleted = 0 AND add_time >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY DATE(add_time) ORDER BY day ASC"
  )
  return response.ok({ columns: ['day', 'orders', 'customers', 'amount'], rows })
}

async function statGoods() {
  const rows = await query(
    "SELECT DATE(add_time) AS day, COUNT(*) AS orders, SUM(number) AS products, COALESCE(SUM(price * number), 0) AS amount FROM litemall_order_goods og INNER JOIN litemall_order o ON og.order_id = o.id WHERE og.deleted = 0 AND o.deleted = 0 AND o.add_time >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY DATE(o.add_time) ORDER BY day ASC"
  )
  return response.ok({ columns: ['day', 'orders', 'products', 'amount'], rows })
}

async function statGrowth(data) {
  const newUsersRows = await query(
    "SELECT COUNT(*) AS c FROM litemall_user WHERE deleted = 0 AND add_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
  )
  const dauRows = await query(
    "SELECT COUNT(*) AS c FROM litemall_user WHERE deleted = 0 AND last_login_time >= DATE_SUB(NOW(), INTERVAL 1 DAY)"
  )
  const totalRows = await query('SELECT COUNT(*) AS c FROM litemall_user WHERE deleted = 0')

  return response.ok({
    newUsers: newUsersRows[0].c,
    dau: dauRows[0].c,
    totalUsers: totalRows[0].c,
  })
}

async function statRetention(data) {
  const { cohortDate, dayOffset } = data
  if (!cohortDate) return response.badArgument()
  const offset = dayOffset || 1

  const cohortRows = await query(
    'SELECT COUNT(*) AS c FROM litemall_user WHERE deleted = 0 AND DATE(add_time) = ?',
    [cohortDate]
  )
  const cohortCount = cohortRows[0] ? cohortRows[0].c : 0

  const retainedRows = await query(
    'SELECT COUNT(DISTINCT user_id) AS c FROM litemall_footprint WHERE deleted = 0 AND DATE(add_time) = DATE_ADD(?, INTERVAL ? DAY) AND user_id IN (SELECT id FROM litemall_user WHERE deleted = 0 AND DATE(add_time) = ?)',
    [cohortDate, offset, cohortDate]
  )
  const retainedCount = retainedRows[0] ? retainedRows[0].c : 0

  return response.ok({
    cohortDate,
    dayOffset: offset,
    cohortCount,
    retainedCount,
    retentionRate: cohortCount > 0 ? (retainedCount * 100 / cohortCount).toFixed(1) : 0,
  })
}

async function statActiveUsers() {
  const wauRows = await query(
    "SELECT COUNT(DISTINCT user_id) AS c FROM litemall_footprint WHERE deleted = 0 AND add_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
  )
  const mauRows = await query(
    "SELECT COUNT(DISTINCT user_id) AS c FROM litemall_footprint WHERE deleted = 0 AND add_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
  )
  return response.ok({ wau: wauRows[0].c, mau: mauRows[0].c })
}

// 埋点概览
async function statTrackerOverview() {
  let rows
  try {
    rows = await query(
      "SELECT type, COUNT(*) AS total FROM litemall_tracker WHERE deleted = 0 AND add_time >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY type"
    )
  } catch (e) {
    // litemall_tracker 表可能不存在，返回空数据
    return response.ok({ byType: [], pageView: 0, addCart: 0, orderPay: 0, addCartRate: 0, payRate: 0 })
  }
  let pageView = 0, addCart = 0, orderPay = 0
  for (const r of rows) {
    if (r.type === 'page_view') pageView = r.total
    else if (r.type === 'add_cart') addCart = r.total
    else if (r.type === 'order_pay') orderPay = r.total
  }
  return response.ok({
    byType: rows,
    pageView, addCart, orderPay,
    addCartRate: pageView > 0 ? (addCart * 100 / pageView).toFixed(2) : 0,
    payRate: addCart > 0 ? (orderPay * 100 / addCart).toFixed(2) : 0,
  })
}

// 埋点趋势
async function statTrackerTrend() {
  try {
    const rows = await query(
      "SELECT DATE(add_time) AS day, type, COUNT(*) AS total FROM litemall_tracker WHERE deleted = 0 AND add_time >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY DATE(add_time), type ORDER BY day ASC"
    )
    return response.ok(rows)
  } catch (e) {
    return response.ok([])
  }
}

// 埋点页面排行
async function statTrackerPages(data) {
  const eventType = data.eventType || 'page_view'
  const limit = Math.min(data.limit || 10, 50)
  try {
    const rows = await query(
      'SELECT page_url, COUNT(*) AS count FROM litemall_tracker WHERE deleted = 0 AND type = ? AND add_time >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY page_url ORDER BY count DESC LIMIT ?',
      [eventType, limit]
    )
    return response.ok(rows)
  } catch (e) {
    return response.ok([])
  }
}

// 营收总览
async function statRevenueOverview(data) {
  const rows = await query(
    "SELECT DATE_FORMAT(pay_time, '%Y-%m') AS month, COUNT(*) AS orders, COALESCE(SUM(actual_price), 0) AS amount FROM litemall_order WHERE deleted = 0 AND order_status IN (301, 401, 402, 502) AND pay_time >= DATE_SUB(NOW(), INTERVAL 12 MONTH) GROUP BY DATE_FORMAT(pay_time, '%Y-%m') ORDER BY month ASC"
  )
  return response.ok(rows)
}

// 场景销售
async function statRevenueScene(data) {
  const rows = await query(
    "SELECT o.delivery_type AS scene, COUNT(*) AS orders, COALESCE(SUM(o.actual_price), 0) AS amount FROM litemall_order o WHERE o.deleted = 0 AND o.order_status IN (301, 401, 402, 502) AND o.add_time >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY o.delivery_type ORDER BY amount DESC"
  )
  const totalAmount = rows.reduce((s, r) => s + parseFloat(r.amount), 0)
  for (const r of rows) {
    r.percent = totalAmount > 0 ? Math.round(parseFloat(r.amount) / totalAmount * 1000) / 10 : 0
  }
  return response.ok(rows)
}

// 分类销售
async function statRevenueCategory(data) {
  const rows = await query(
    "SELECT c.name AS category, COUNT(DISTINCT og.order_id) AS orders, COALESCE(SUM(og.price * og.number), 0) AS amount FROM litemall_order_goods og INNER JOIN litemall_goods g ON og.goods_id = g.id INNER JOIN litemall_category c ON g.category_id = c.id INNER JOIN litemall_order o ON og.order_id = o.id WHERE og.deleted = 0 AND o.deleted = 0 AND o.order_status IN (301, 401, 402, 502) AND o.add_time >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY c.id ORDER BY amount DESC"
  )
  return response.ok(rows)
}

// 季节概览
async function statRevenueSeasonOverview(data) {
  const year = data.year || new Date().getFullYear()
  const rows = await query(
    "SELECT CASE WHEN MONTH(pay_time) IN (3,4,5) THEN 'spring' WHEN MONTH(pay_time) IN (6,7,8) THEN 'summer' WHEN MONTH(pay_time) IN (9,10,11) THEN 'autumn' ELSE 'winter' END AS season, COUNT(*) AS orders, COALESCE(SUM(actual_price), 0) AS amount FROM litemall_order WHERE deleted = 0 AND order_status IN (301, 401, 402, 502) AND YEAR(pay_time) = ? GROUP BY season",
    [year]
  )
  return response.ok(rows)
}

// 季节热销商品
async function statRevenueSeasonHotGoods(data) {
  const year = data.year || new Date().getFullYear()
  const season = data.season || 'spring'
  const limit = Math.min(data.limit || 10, 50)

  let monthRange
  switch (season) {
    case 'spring': monthRange = '3,4,5'; break
    case 'summer': monthRange = '6,7,8'; break
    case 'autumn': monthRange = '9,10,11'; break
    case 'winter': monthRange = '12,1,2'; break
    default: monthRange = '3,4,5'
  }

  const rows = await query(
    `SELECT MAX(og.goods_name) AS goods_name, og.goods_id, SUM(og.number) AS sold, COALESCE(SUM(og.price * og.number), 0) AS amount FROM litemall_order_goods og INNER JOIN litemall_order o ON og.order_id = o.id WHERE og.deleted = 0 AND o.deleted = 0 AND o.order_status IN (301, 401, 402, 502) AND YEAR(o.pay_time) = ? AND MONTH(o.pay_time) IN (${monthRange}) GROUP BY og.goods_id ORDER BY amount DESC LIMIT ${limit}`,
    [year]
  )
  const totalAmount = rows.reduce((s, r) => s + parseFloat(r.amount), 0)
  for (const r of rows) {
    r.percent = totalAmount > 0 ? Math.round(parseFloat(r.amount) / totalAmount * 1000) / 10 : 0
  }
  return response.ok(rows)
}

module.exports = {
  statUser, statOrder, statGoods, statGrowth, statRetention, statActiveUsers,
  statTrackerOverview, statTrackerTrend, statTrackerPages,
  statRevenueOverview, statRevenueScene, statRevenueCategory,
  statRevenueSeasonOverview, statRevenueSeasonHotGoods,
}
