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

async function statOrder(data) {
  const start = (data && data.startDate) || new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)
  const end = (data && data.endDate) || new Date().toISOString().slice(0, 10)
  const rows = await query(
    "SELECT DATE(add_time) AS day, COUNT(*) AS orders, COUNT(DISTINCT user_id) AS customers, COALESCE(SUM(actual_price), 0) AS amount FROM litemall_order WHERE deleted = 0 AND DATE(add_time) BETWEEN ? AND ? GROUP BY DATE(add_time) ORDER BY day ASC",
    [start, end]
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

  // 按天分组：日活趋势（基于 page_view 埋点去重用户）
  const dauRows = await query(
    `SELECT DATE(server_time) AS day, COUNT(DISTINCT user_id) AS dau
     FROM litemall_tracker_event
     WHERE event_type = 'page_view' AND DATE(server_time) BETWEEN ? AND ?
     GROUP BY DATE(server_time) ORDER BY day ASC`,
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
    "SELECT COUNT(DISTINCT user_id) AS c FROM litemall_tracker_event WHERE event_type = 'page_view' AND DATE(server_time) = DATE_ADD(?, INTERVAL ? DAY) AND user_id IN (SELECT id FROM litemall_user WHERE deleted = 0 AND DATE(add_time) = ?)",
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
    "SELECT COUNT(DISTINCT user_id) AS c FROM litemall_tracker_event WHERE event_type = 'page_view' AND server_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
  )
  const mauRows = await query(
    "SELECT COUNT(DISTINCT user_id) AS c FROM litemall_tracker_event WHERE event_type = 'page_view' AND server_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
  )
  return response.ok({ wau: wauRows[0].c, mau: mauRows[0].c })
}

// 埋点概览
async function statTrackerOverview() {
  const rows = await query(
    "SELECT event_type AS type, COUNT(*) AS total FROM litemall_tracker_event WHERE server_time >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY event_type"
  )
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
  const rows = await query(
    "SELECT DATE(server_time) AS day, event_type AS type, COUNT(*) AS total FROM litemall_tracker_event WHERE server_time >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY DATE(server_time), event_type ORDER BY day ASC"
  )
  return response.ok(rows)
}

// 埋点页面排行
async function statTrackerPages(data) {
  const eventType = data.eventType || 'page_view'
  const limit = Math.min(data.limit || 10, 50)
  const rows = await query(
    `SELECT page_route AS pageRoute, COUNT(*) AS \`count\`, COUNT(DISTINCT user_id) AS uniqueUsers FROM litemall_tracker_event WHERE event_type = ? AND server_time >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY page_route ORDER BY count DESC LIMIT ${limit}`,
    [eventType]
  )
  return response.ok(rows)
}

// 营收总览
async function statRevenueOverview(data) {
  const startMonth = (data && data.startMonth) || new Date(Date.now() - 11 * 30 * 86400000).toISOString().slice(0, 7)
  const endMonth = (data && data.endMonth) || new Date().toISOString().slice(0, 7)

  // 按月营收（已支付订单）
  const revenueRows = await query(
    `SELECT DATE_FORMAT(pay_time, '%Y-%m') AS month,
            COUNT(*) AS orders,
            COALESCE(SUM(actual_price), 0) AS revenue
     FROM litemall_order
     WHERE deleted = 0 AND order_status IN (301, 401, 402, 502)
       AND DATE_FORMAT(pay_time, '%Y-%m') BETWEEN ? AND ?
     GROUP BY DATE_FORMAT(pay_time, '%Y-%m') ORDER BY month ASC`,
    [startMonth, endMonth]
  )

  // 按月退款
  const refundRows = await query(
    `SELECT DATE_FORMAT(update_time, '%Y-%m') AS month,
            COALESCE(SUM(amount), 0) AS refund
     FROM litemall_aftersale
     WHERE deleted = 0 AND type = 1 AND status = 2
       AND DATE_FORMAT(update_time, '%Y-%m') BETWEEN ? AND ?
     GROUP BY DATE_FORMAT(update_time, '%Y-%m')`,
    [startMonth, endMonth]
  )
  const refundMap = new Map(refundRows.map(r => [r.month, parseFloat(r.refund)]))

  // 消费客户数
  const customerRows = await query(
    `SELECT COUNT(DISTINCT user_id) AS c FROM litemall_order
     WHERE deleted = 0 AND order_status IN (301, 401, 402, 502)
       AND DATE_FORMAT(pay_time, '%Y-%m') BETWEEN ? AND ?`,
    [startMonth, endMonth]
  )

  // 组装 trend 和 detail
  const trend = []
  const detail = []
  for (const r of revenueRows) {
    const revenue = parseFloat(r.revenue)
    const orders = Number(r.orders)
    const refund = refundMap.get(r.month) || 0
    trend.push({ month: r.month, revenue, orders })
    detail.push({ month: r.month, orders, revenue, refund })
  }

  // 汇总 KPI
  const totalRevenue = trend.reduce((s, r) => s + r.revenue, 0)
  const totalOrders = trend.reduce((s, r) => s + r.orders, 0)

  return response.ok({
    overview: {
      totalRevenue: Math.round(totalRevenue),
      totalOrders,
      avgOrderPrice: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      totalCustomers: Number(customerRows[0]?.c || 0),
    },
    trend,
    detail,
  })
}

// 场景销售（按商品 scene_tags 聚合）
async function statRevenueScene(data) {
  const start = (data && data.startDate) || new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)
  const end = (data && data.endDate) || new Date().toISOString().slice(0, 10)

  const rows = await query(
    `SELECT og.order_id, og.price, og.number, g.scene_tags
     FROM litemall_order_goods og
     INNER JOIN litemall_goods g ON og.goods_id = g.id
     INNER JOIN litemall_order o ON og.order_id = o.id
     WHERE og.deleted = 0 AND o.deleted = 0
       AND o.order_status IN (301, 401, 402, 502)
       AND DATE(o.add_time) BETWEEN ? AND ?
       AND g.scene_tags IS NOT NULL`,
    [start, end]
  )

  // 解析 JSON 聚合到场景维度
  const sceneMap = new Map()
  for (const r of rows) {
    let tags = []
    try { tags = JSON.parse(r.scene_tags) } catch (e) { continue }
    if (!Array.isArray(tags) || tags.length === 0) continue

    const amount = parseFloat(r.price) * parseInt(r.number)
    for (const tag of tags) {
      if (!tag) continue
      if (!sceneMap.has(tag)) sceneMap.set(tag, { name: tag, orders: new Set(), amount: 0 })
      const s = sceneMap.get(tag)
      s.orders.add(r.order_id)
      s.amount += amount
    }
  }

  const result = Array.from(sceneMap.values()).map(s => ({
    name: s.name,
    orders: s.orders.size,
    amount: Math.round(s.amount * 100) / 100,
  })).sort((a, b) => b.amount - a.amount)

  const totalAmount = result.reduce((s, r) => s + r.amount, 0)
  for (const r of result) {
    r.percent = totalAmount > 0 ? Math.round(r.amount / totalAmount * 1000) / 10 : 0
  }
  return response.ok(result)
}

// 分类销售
async function statRevenueCategory(data) {
  const start = (data && data.startDate) || new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)
  const end = (data && data.endDate) || new Date().toISOString().slice(0, 10)
  const rows = await query(
    `SELECT c.name AS name, COUNT(DISTINCT g.id) AS goodsCount, COUNT(DISTINCT og.order_id) AS orders, COALESCE(SUM(og.price * og.number), 0) AS amount
     FROM litemall_order_goods og
     INNER JOIN litemall_goods g ON og.goods_id = g.id
     INNER JOIN litemall_category c ON g.category_id = c.id
     INNER JOIN litemall_order o ON og.order_id = o.id
     WHERE og.deleted = 0 AND o.deleted = 0 AND o.order_status IN (301, 401, 402, 502)
       AND DATE(o.add_time) BETWEEN ? AND ?
     GROUP BY c.id ORDER BY amount DESC`,
    [start, end]
  )
  return response.ok(rows)
}

// 季节概览
async function statRevenueSeasonOverview(data) {
  const year = data.year || new Date().getFullYear()

  // 春季：3-9月（当年）
  const springRows = await query(
    "SELECT COUNT(*) AS orders, COALESCE(SUM(actual_price), 0) AS amount FROM litemall_order WHERE deleted = 0 AND order_status IN (301, 401, 402, 502) AND pay_time >= ? AND pay_time < ?",
    [`${year}-03-01`, `${year}-10-01`]
  )
  // 冬季：10-次年2月（当年10月 ~ 次年2月）
  const winterRows = await query(
    "SELECT COUNT(*) AS orders, COALESCE(SUM(actual_price), 0) AS amount FROM litemall_order WHERE deleted = 0 AND order_status IN (301, 401, 402, 502) AND pay_time >= ? AND pay_time < ?",
    [`${year}-10-01`, `${year + 1}-03-01`]
  )

  // 去年同期数据，计算同比
  const lastSpringRows = await query(
    "SELECT COUNT(*) AS orders, COALESCE(SUM(actual_price), 0) AS amount FROM litemall_order WHERE deleted = 0 AND order_status IN (301, 401, 402, 502) AND pay_time >= ? AND pay_time < ?",
    [`${year - 1}-03-01`, `${year - 1}-10-01`]
  )
  const lastWinterRows = await query(
    "SELECT COUNT(*) AS orders, COALESCE(SUM(actual_price), 0) AS amount FROM litemall_order WHERE deleted = 0 AND order_status IN (301, 401, 402, 502) AND pay_time >= ? AND pay_time < ?",
    [`${year - 1}-10-01`, `${year}-03-01`]
  )

  function calcGrowth(curr, last) {
    const c = parseFloat(curr.amount) || 0
    const l = parseFloat(last.amount) || 0
    return l > 0 ? Math.round((c - l) / l * 1000) / 10 : 0
  }

  return response.ok({
    spring: { orders: springRows[0].orders, amount: parseFloat(springRows[0].amount), growth: calcGrowth(springRows[0], lastSpringRows[0]) },
    winter: { orders: winterRows[0].orders, amount: parseFloat(winterRows[0].amount), growth: calcGrowth(winterRows[0], lastWinterRows[0]) },
    chartData: [
      { season: 'spring', orders: springRows[0].orders, amount: parseFloat(springRows[0].amount) },
      { season: 'winter', orders: winterRows[0].orders, amount: parseFloat(winterRows[0].amount) }
    ]
  })
}

// 季节热销商品
async function statRevenueSeasonHotGoods(data) {
  const year = data.year || new Date().getFullYear()
  const season = data.season || 'spring'
  const limit = Math.min(data.limit || 10, 50)

  // 用日期范围查询，避免跨年月份问题
  let dateStart, dateEnd
  if (season === 'winter') {
    // 冬季：当年10月 ~ 次年2月底
    dateStart = `${year}-10-01`
    dateEnd = `${year + 1}-03-01`
  } else {
    // 春季：3月 ~ 9月底
    dateStart = `${year}-03-01`
    dateEnd = `${year}-10-01`
  }

  const rows = await query(
    `SELECT MAX(og.goods_name) AS goods_name, og.goods_id, SUM(og.number) AS sold, COALESCE(SUM(og.price * og.number), 0) AS amount FROM litemall_order_goods og INNER JOIN litemall_order o ON og.order_id = o.id WHERE og.deleted = 0 AND o.deleted = 0 AND o.order_status IN (301, 401, 402, 502) AND o.pay_time >= ? AND o.pay_time < ? GROUP BY og.goods_id ORDER BY amount DESC LIMIT ${limit}`,
    [dateStart, dateEnd]
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
      "SELECT COUNT(*) AS c FROM litemall_tracker_event WHERE event_type = 'push_send'"
    )
    const pushViewRows = await query(
      "SELECT COUNT(*) AS c FROM litemall_tracker_event WHERE event_type = 'push_view'"
    )
    const pushSend = Number(pushSendRows[0]?.c || 0)
    const pushView = Number(pushViewRows[0]?.c || 0)
    pushViewRate = pushSend > 0 ? (pushView * 100 / pushSend).toFixed(1) : 0

    // 场景点击率：scene_click / scene_view
    const sceneViewRows = await query(
      "SELECT COUNT(*) AS c FROM litemall_tracker_event WHERE event_type = 'scene_view'"
    )
    const sceneClickRows = await query(
      "SELECT COUNT(*) AS c FROM litemall_tracker_event WHERE event_type = 'scene_click'"
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

// 收藏统计
async function statCollect(data) {
  const start = (data && data.startDate) || new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)
  const end = (data && data.endDate) || new Date().toISOString().slice(0, 10)

  // KPI 指标
  const totalRows = await query(
    'SELECT COUNT(*) AS c FROM litemall_collect WHERE deleted = 0 AND type = 0'
  )
  const userCountRows = await query(
    'SELECT COUNT(DISTINCT user_id) AS c FROM litemall_collect WHERE deleted = 0 AND type = 0'
  )
  const goodsCountRows = await query(
    'SELECT COUNT(DISTINCT value_id) AS c FROM litemall_collect WHERE deleted = 0 AND type = 0'
  )
  const newRows = await query(
    'SELECT COUNT(*) AS c FROM litemall_collect WHERE deleted = 0 AND type = 0 AND DATE(add_time) BETWEEN ? AND ?',
    [start, end]
  )

  const totalCount = Number(totalRows[0]?.c || 0)
  const userCount = Number(userCountRows[0]?.c || 0)
  const perUser = userCount > 0 ? (totalCount / userCount).toFixed(1) : 0

  // 趋势
  const trendRows = await query(
    `SELECT DATE(add_time) AS day, COUNT(*) AS count
     FROM litemall_collect
     WHERE deleted = 0 AND type = 0 AND DATE(add_time) BETWEEN ? AND ?
     GROUP BY DATE(add_time) ORDER BY day ASC`,
    [start, end]
  )
  // 补全日期
  const trendMap = new Map(trendRows.map(r => [r.day, Number(r.count)]))
  const trend = []
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    const dayStr = d.toISOString().slice(0, 10)
    trend.push({ day: dayStr, count: trendMap.get(dayStr) || 0 })
  }

  // TOP10 商品
  const topRows = await query(
    `SELECT c.value_id AS goodsId, MAX(g.name) AS name, MAX(g.pic_url) AS picUrl,
            MAX(g.retail_price) AS price, COUNT(*) AS count
     FROM litemall_collect c
     INNER JOIN litemall_goods g ON c.value_id = g.id
     WHERE c.deleted = 0 AND c.type = 0
     GROUP BY c.value_id
     ORDER BY count DESC LIMIT 10`
  )

  // 分类分布（只统计仍存在的商品）
  const categoryRows = await query(
    `SELECT COALESCE(cat.name, '未分类') AS name, COUNT(*) AS count
     FROM litemall_collect c
     INNER JOIN litemall_goods g ON c.value_id = g.id
     LEFT JOIN litemall_category cat ON g.category_id = cat.id
     WHERE c.deleted = 0 AND c.type = 0
     GROUP BY cat.id
     ORDER BY count DESC`
  )

  // 价格区间分布（只统计仍存在的商品）
  const priceRows = await query(
    `SELECT name, COUNT(*) AS count FROM (
       SELECT CASE
         WHEN g.retail_price < 50 THEN '50以下'
         WHEN g.retail_price < 100 THEN '50-100'
         WHEN g.retail_price < 200 THEN '100-200'
         WHEN g.retail_price < 500 THEN '200-500'
         ELSE '500以上'
       END AS name
       FROM litemall_collect c
       INNER JOIN litemall_goods g ON c.value_id = g.id
       WHERE c.deleted = 0 AND c.type = 0
     ) t GROUP BY name
     ORDER BY FIELD(name, '50以下', '50-100', '100-200', '200-500', '500以上')`
  )

  return response.ok({
    totalCount,
    perUser: Number(perUser),
    goodsCount: Number(goodsCountRows[0]?.c || 0),
    newCount: Number(newRows[0]?.c || 0),
    trend,
    topGoods: topRows,
    categoryDistribution: categoryRows,
    priceDistribution: priceRows,
  })
}

// 浏览足迹统计
async function statFootprint() {
  // KPI
  const kpiRows = await query(
    `SELECT COUNT(*) AS totalCount,
            COUNT(DISTINCT user_id) AS userCount,
            COUNT(DISTINCT goods_id) AS goodsCount
     FROM litemall_footprint WHERE deleted = 0`
  )
  const recentRows = await query(
    `SELECT COUNT(*) AS c FROM litemall_footprint
     WHERE deleted = 0 AND add_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
  )
  const totalCount = Number(kpiRows[0]?.totalCount || 0)
  const userCount = Number(kpiRows[0]?.userCount || 0)
  const recentCount = Number(recentRows[0]?.c || 0)
  const perUser = userCount > 0 ? (totalCount / userCount).toFixed(1) : 0
  const dailyAvg = recentCount > 0 ? Math.round(recentCount / 30) : 0

  // 分类分布（只统计仍存在的商品）
  const categoryRows = await query(
    `SELECT COALESCE(cat.name, '未分类') AS name, COUNT(*) AS count
     FROM litemall_footprint f
     INNER JOIN litemall_goods g ON f.goods_id = g.id
     LEFT JOIN litemall_category cat ON g.category_id = cat.id
     WHERE f.deleted = 0
     GROUP BY cat.id
     ORDER BY count DESC`
  )

  // 时段分布（0-23点）
  const hourlyRows = await query(
    `SELECT HOUR(add_time) AS hour, COUNT(*) AS count
     FROM litemall_footprint WHERE deleted = 0
     GROUP BY HOUR(add_time) ORDER BY hour`
  )
  const hourlyMap = new Map(hourlyRows.map(r => [Number(r.hour), Number(r.count)]))
  const hourlyDistribution = []
  for (let h = 0; h < 24; h++) {
    hourlyDistribution.push({ hour: h, name: `${h}:00`, count: hourlyMap.get(h) || 0 })
  }

  // 热门浏览 TOP10（只统计仍存在的商品）
  const topRows = await query(
    `SELECT f.goods_id AS goodsId, MAX(g.name) AS name, MAX(g.pic_url) AS picUrl,
            MAX(g.retail_price) AS price, COUNT(*) AS count
     FROM litemall_footprint f
     INNER JOIN litemall_goods g ON f.goods_id = g.id
     WHERE f.deleted = 0
     GROUP BY f.goods_id
     ORDER BY count DESC LIMIT 10`
  )

  return response.ok({
    totalCount,
    dailyAvg,
    perUser: Number(perUser),
    goodsCount: Number(kpiRows[0]?.goodsCount || 0),
    categoryDistribution: categoryRows,
    hourlyDistribution,
    topGoods: topRows,
  })
}

// 搜索历史统计
async function statSearchHistory() {
  // KPI
  const kpiRows = await query(
    `SELECT COUNT(*) AS totalCount,
            COUNT(DISTINCT keyword) AS keywordCount,
            COUNT(DISTINCT user_id) AS userCount
     FROM litemall_search_history WHERE deleted = 0`
  )
  const dayRows = await query(
    `SELECT COUNT(DISTINCT DATE(add_time)) AS days
     FROM litemall_search_history WHERE deleted = 0`
  )
  const totalCount = Number(kpiRows[0]?.totalCount || 0)
  const keywordCount = Number(kpiRows[0]?.keywordCount || 0)
  const userCount = Number(kpiRows[0]?.userCount || 0)
  const days = Math.max(Number(dayRows[0]?.days || 0), 1)
  const dailyAvg = totalCount > 0 ? (totalCount / days).toFixed(1) : 0

  // 热门搜索 TOP10
  const topRows = await query(
    `SELECT keyword, COUNT(*) AS count
     FROM litemall_search_history WHERE deleted = 0
     GROUP BY keyword ORDER BY count DESC LIMIT 10`
  )

  // 时段分布（0-23点）
  const hourlyRows = await query(
    `SELECT HOUR(add_time) AS hour, COUNT(*) AS count
     FROM litemall_search_history WHERE deleted = 0
     GROUP BY HOUR(add_time) ORDER BY hour`
  )
  const hourlyMap = new Map(hourlyRows.map(r => [Number(r.hour), Number(r.count)]))
  const hourlyDistribution = []
  for (let h = 0; h < 24; h++) {
    hourlyDistribution.push({ hour: h, name: `${h}:00`, count: hourlyMap.get(h) || 0 })
  }

  // 近 7 天趋势
  const trendRows = await query(
    `SELECT DATE(add_time) AS date, COUNT(*) AS count
     FROM litemall_search_history
     WHERE deleted = 0 AND add_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
     GROUP BY DATE(add_time) ORDER BY date`
  )
  const trendMap = new Map(trendRows.map(r => [String(r.date).slice(0, 10), Number(r.count)]))
  const dailyTrend = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const key = d.toISOString().slice(0, 10)
    dailyTrend.push({ date: key, name: `${d.getMonth() + 1}/${d.getDate()}`, count: trendMap.get(key) || 0 })
  }

  return response.ok({
    totalCount, keywordCount, userCount,
    dailyAvg: Number(dailyAvg),
    topKeywords: topRows,
    hourlyDistribution,
    dailyTrend,
  })
}

// 销售商品排行
async function statSalesGoodsTop(data) {
  const start = (data && data.startDate) || new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)
  const end = (data && data.endDate) || new Date().toISOString().slice(0, 10)
  const limit = Math.min((data && data.limit) || 10, 50)
  const rows = await query(
    `SELECT og.goods_id, MAX(og.goods_name) AS name, SUM(og.number) AS sales, COALESCE(SUM(og.price * og.number), 0) AS amount
     FROM litemall_order_goods og
     INNER JOIN litemall_order o ON og.order_id = o.id
     WHERE og.deleted = 0 AND o.deleted = 0 AND DATE(o.add_time) BETWEEN ? AND ?
     GROUP BY og.goods_id
     ORDER BY amount DESC LIMIT ${limit}`,
    [start, end]
  )
  return response.ok(rows)
}

module.exports = {
  statUser, statOrder, statGoods, statGrowth, statRetention, statActiveUsers,
  statTrackerOverview, statTrackerTrend, statTrackerPages,
  statRevenueOverview, statRevenueScene, statRevenueCategory,
  statRevenueSeasonOverview, statRevenueSeasonHotGoods,
  statDashboardSales, statDashboardConversion,
  statSalesGoodsTop, statCollect, statFootprint, statSearchHistory,
}
