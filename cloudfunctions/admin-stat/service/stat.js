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
  const { startDate, endDate } = data

  // 默认最近 7 天
  const end = endDate || new Date().toISOString().slice(0, 10)
  const start = startDate || new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)

  // 按天分组：新增用户趋势
  const newUsersRows = await query(
    `SELECT DATE(add_time) AS day, COUNT(*) AS newUsers
     FROM litemall_user
     WHERE deleted = 0 AND DATE(add_time) BETWEEN ? AND ?
     GROUP BY DATE(add_time) ORDER BY day ASC`,
    [start, end]
  )

  // 按天分组：日活趋势（基于浏览足迹去重用户）
  const dauRows = await query(
    `SELECT DATE(add_time) AS day, COUNT(DISTINCT user_id) AS dau
     FROM litemall_footprint
     WHERE deleted = 0 AND DATE(add_time) BETWEEN ? AND ?
     GROUP BY DATE(add_time) ORDER BY day ASC`,
    [start, end]
  )

  // 汇总指标
  const totalRows = await query('SELECT COUNT(*) AS c FROM litemall_user WHERE deleted = 0')
  const todayNewRows = await query(
    "SELECT COUNT(*) AS c FROM litemall_user WHERE deleted = 0 AND DATE(add_time) = CURDATE()"
  )
  const weekNewRows = await query(
    "SELECT COUNT(*) AS c FROM litemall_user WHERE deleted = 0 AND add_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
  )

  // 补全日期空缺（确保每天都有数据点）
  const fillDates = (rows, key) => {
    const map = new Map(rows.map(r => [r.day, Number(r[key])]))
    const result = []
    const s = new Date(start + 'T00:00:00')
    const e = new Date(end + 'T00:00:00')
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const dayStr = d.toISOString().slice(0, 10)
      result.push({ day: dayStr, [key]: map.get(dayStr) || 0 })
    }
    return result
  }

  return response.ok({
    totalUsers: totalRows[0].c,
    todayNewUsers: todayNewRows[0].c,
    weekNewUsers: weekNewRows[0].c,
    newUsers: fillDates(newUsersRows, 'newUsers'),
    dau: fillDates(dauRows, 'dau'),
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

// 仪表盘销售统计
async function statDashboardSales() {
  // 核心指标：已支付订单
  const paidStatus = '301, 401, 402, 502'
  const summaryRows = await query(
    `SELECT COUNT(*) AS orders, COALESCE(SUM(actual_price), 0) AS revenue
     FROM litemall_order
     WHERE deleted = 0 AND order_status IN (${paidStatus})`
  )
  const summary = summaryRows[0]
  const orders = Number(summary.orders)
  const revenue = Math.round(Number(summary.revenue))
  const avgPrice = orders > 0 ? Math.round(revenue / orders) : 0

  // 商品销售 Top5
  const salesTop = await query(
    `SELECT og.goods_id, MAX(og.goods_name) AS name, MAX(og.pic_url) AS picUrl,
            SUM(og.number) AS sold, COALESCE(SUM(og.price * og.number), 0) AS amount
     FROM litemall_order_goods og
     INNER JOIN litemall_order o ON og.order_id = o.id
     WHERE og.deleted = 0 AND o.deleted = 0 AND o.order_status IN (${paidStatus})
     GROUP BY og.goods_id
     ORDER BY amount DESC LIMIT 5`
  )
  const salesTopMax = salesTop.length > 0 ? Number(salesTop[0].amount) : 1

  // 商品复购 Top5（被不同用户购买次数最多的商品）
  const repurchaseTop = await query(
    `SELECT og.goods_id, MAX(og.goods_name) AS name, MAX(og.pic_url) AS picUrl,
            COUNT(DISTINCT o.user_id) AS buyerCount, COUNT(*) AS buyTimes
     FROM litemall_order_goods og
     INNER JOIN litemall_order o ON og.order_id = o.id
     WHERE og.deleted = 0 AND o.deleted = 0 AND o.order_status IN (${paidStatus})
     GROUP BY og.goods_id
     HAVING COUNT(DISTINCT o.user_id) > 1
     ORDER BY buyerCount DESC, buyTimes DESC LIMIT 5`
  )
  const repurchaseTopMax = repurchaseTop.length > 0 ? Number(repurchaseTop[0].buyerCount) : 1

  // 商品售后 Top5
  const afterSalesTop = await query(
    `SELECT og.goods_id, MAX(og.goods_name) AS name, MAX(og.pic_url) AS picUrl,
            COUNT(*) AS count
     FROM litemall_order_goods og
     INNER JOIN litemall_aftersale a ON a.order_id = og.order_id
     WHERE og.deleted = 0 AND a.deleted = 0
     GROUP BY og.goods_id
     ORDER BY count DESC LIMIT 5`
  )
  const afterSalesTopMax = afterSalesTop.length > 0 ? Number(afterSalesTop[0].count) : 1

  const formatTop = (list, maxVal, valueKey, valueFormat) =>
    list.map(r => ({
      name: r.name,
      picUrl: r.picUrl || '',
      value: valueFormat ? valueFormat(r) : Number(r[valueKey]),
      percentage: maxVal > 0 ? Math.round(Number(r[valueKey]) / maxVal * 100) : 0,
    }))

  return response.ok({
    revenue,
    orders,
    avgPrice,
    salesTop: formatTop(salesTop, salesTopMax, 'amount', r => Math.round(Number(r.amount))),
    repurchaseTop: formatTop(repurchaseTop, repurchaseTopMax, 'buyerCount', r => Number(r.buyerCount) + '人复购'),
    afterSalesTop: formatTop(afterSalesTop, afterSalesTopMax, 'count'),
  })
}

// 仪表盘转化率统计
async function statDashboardConversion() {
  // 收藏总量
  const collectRows = await query(
    'SELECT COUNT(*) AS c FROM litemall_collect WHERE deleted = 0'
  )
  // 下单量（所有状态订单）
  const orderRows = await query(
    'SELECT COUNT(*) AS c FROM litemall_order WHERE deleted = 0'
  )

  // 埋点转化率（推送查看率、场景点击率）
  let pushViewRate = 0
  let sceneClickRate = 0
  try {
    // 推送查看率：push_view 事件 / push_send 事件
    const pushSendRows = await query(
      "SELECT COUNT(*) AS c FROM litemall_tracker_event WHERE deleted = 0 AND event_type = 'push_send'"
    )
    const pushViewRows = await query(
      "SELECT COUNT(*) AS c FROM litemall_tracker_event WHERE deleted = 0 AND event_type = 'push_view'"
    )
    const pushSend = Number(pushSendRows[0]?.c || 0)
    const pushView = Number(pushViewRows[0]?.c || 0)
    pushViewRate = pushSend > 0 ? (pushView * 100 / pushSend).toFixed(1) : 0

    // 场景点击率：scene_click / scene_view
    const sceneViewRows = await query(
      "SELECT COUNT(*) AS c FROM litemall_tracker_event WHERE deleted = 0 AND event_type = 'scene_view'"
    )
    const sceneClickRows = await query(
      "SELECT COUNT(*) AS c FROM litemall_tracker_event WHERE deleted = 0 AND event_type = 'scene_click'"
    )
    const sceneView = Number(sceneViewRows[0]?.c || 0)
    const sceneClick = Number(sceneClickRows[0]?.c || 0)
    sceneClickRate = sceneView > 0 ? (sceneClick * 100 / sceneView).toFixed(1) : 0
  } catch (e) {
    // tracker_event 表可能无数据，保持默认 0
  }

  return response.ok({
    pushViewRate: Number(pushViewRate),
    sceneClickRate: Number(sceneClickRate),
    favoriteCount: Number(collectRows[0]?.c || 0),
    orderCount: Number(orderRows[0]?.c || 0),
  })
}

module.exports = {
  statUser, statOrder, statGoods, statGrowth, statRetention, statActiveUsers,
  statTrackerOverview, statTrackerTrend, statTrackerPages,
  statRevenueOverview, statRevenueScene, statRevenueCategory,
  statRevenueSeasonOverview, statRevenueSeasonHotGoods,
  statDashboardSales, statDashboardConversion,
}
