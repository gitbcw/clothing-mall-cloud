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
  let goodsView = 0, addCart = 0, buyNow = 0, orderCreate = 0, orderPay = 0
  for (const r of rows) {
    if (r.type === 'goods_view') goodsView = r.total
    else if (r.type === 'add_cart') addCart = r.total
    else if (r.type === 'buy_now') buyNow = r.total
    else if (r.type === 'order_create') orderCreate = r.total
    else if (r.type === 'order_pay') orderPay = r.total
  }
  const purchaseIntent = addCart + buyNow
  return response.ok({
    byType: rows,
    goodsView, purchaseIntent, orderCreate, orderPay,
    intentRate: goodsView > 0 ? (purchaseIntent * 100 / goodsView).toFixed(2) : 0,
    orderRate: purchaseIntent > 0 ? (orderCreate * 100 / purchaseIntent).toFixed(2) : 0,
    payRate: orderCreate > 0 ? (orderPay * 100 / orderCreate).toFixed(2) : 0,
  })
}

// 埋点趋势
async function statTrackerTrend() {
  const rows = await query(
    "SELECT DATE(server_time) AS day, event_type AS type, COUNT(*) AS total FROM litemall_tracker_event WHERE server_time >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY DATE(server_time), event_type ORDER BY day ASC"
  )
  return response.ok(rows)
}

// 页面访问排行
async function statTrackerPages() {
  const rows = await query(
    "SELECT page_route, COUNT(*) AS count FROM litemall_tracker_event WHERE event_type = 'page_view' AND server_time >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY page_route ORDER BY count DESC LIMIT 20"
  )
  return response.ok(rows)
}

// 转化漏斗
async function statTrackerFunnel() {
  const rows = await query(
    "SELECT event_type, COUNT(*) AS count FROM litemall_tracker_event WHERE server_time >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY event_type"
  )
  const map = {}
  for (const r of rows) { map[r.event_type] = Number(r.count) }

  const funnel = [
    { stage: 'goods_view', name: '商品浏览', count: map['goods_view'] || 0 },
    { stage: 'purchase_intent', name: '购买意向', count: (map['add_cart'] || 0) + (map['buy_now'] || 0) },
    { stage: 'order_create', name: '提交订单', count: map['order_create'] || 0 },
    { stage: 'order_pay', name: '完成支付', count: map['order_pay'] || 0 },
  ]
  return response.ok(funnel)
}

// 场景点击排行（含轮播图）
async function statTrackerBannerClicks(data) {
  const days = Math.min(data.days || 30, 90)
  try {
    const rows = await query(
      `SELECT JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.sceneId')) AS sceneId,
              MAX(JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.sceneName'))) AS sceneName,
              MAX(CAST(JSON_EXTRACT(event_data, '$.position') AS SIGNED)) AS pos,
              COUNT(*) AS clickCount,
              COUNT(DISTINCT user_id) AS uniqueUsers
       FROM litemall_tracker_event
       WHERE event_type = 'scene_click'
         AND server_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.sceneId'))
       ORDER BY clickCount DESC`,
      [days]
    )
    // 统一字段名
    const result = rows.map(r => ({
      sceneId: r.sceneId,
      sceneName: r.sceneName,
      position: Number(r.pos),
      clickCount: Number(r.clickCount),
      uniqueUsers: Number(r.uniqueUsers)
    }))
    return response.ok(result)
  } catch (e) {
    // 表无 click 数据时安全降级
    console.error('[statTrackerBannerClicks] error:', e.message)
    return response.ok([])
  }
}

// 营收总览
async function statRevenueOverview(data) {
  const granularity = (data && data.granularity) || 'month'

  let revenueRows, refundRows, customerRows, periodField, periodAlias

  if (granularity === 'day') {
    // 按日聚合
    const startDate = (data && data.startDate) || new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)
    const endDate = (data && data.endDate) || new Date().toISOString().slice(0, 10)
    periodField = "DATE(pay_time)"
    periodAlias = "period"

    revenueRows = await query(
      `SELECT DATE(pay_time) AS period,
              COUNT(*) AS orders,
              COALESCE(SUM(actual_price), 0) AS revenue
       FROM litemall_order
       WHERE deleted = 0 AND order_status IN (301, 401, 402, 502)
         AND DATE(pay_time) BETWEEN ? AND ?
       GROUP BY DATE(pay_time) ORDER BY period ASC`,
      [startDate, endDate]
    )

    refundRows = await query(
      `SELECT DATE(update_time) AS period,
              COALESCE(SUM(amount), 0) AS refund
       FROM litemall_aftersale
       WHERE deleted = 0 AND type = 1 AND status = 2
         AND DATE(update_time) BETWEEN ? AND ?
       GROUP BY DATE(update_time)`,
      [startDate, endDate]
    )

    customerRows = await query(
      `SELECT COUNT(DISTINCT user_id) AS c FROM litemall_order
       WHERE deleted = 0 AND order_status IN (301, 401, 402, 502)
         AND DATE(pay_time) BETWEEN ? AND ?`,
      [startDate, endDate]
    )
  } else {
    // 按月聚合（默认）
    const startDate = (data && data.startDate) || new Date(Date.now() - 11 * 30 * 86400000).toISOString().slice(0, 7) + '-01'
    const endDate = (data && data.endDate) || new Date().toISOString().slice(0, 10)
    // 从 startDate 提取 startMonth，从 endDate 提取 endMonth
    const startMonth = startDate.slice(0, 7)
    const endMonth = endDate.slice(0, 7)

    revenueRows = await query(
      `SELECT DATE_FORMAT(pay_time, '%Y-%m') AS period,
              COUNT(*) AS orders,
              COALESCE(SUM(actual_price), 0) AS revenue
       FROM litemall_order
       WHERE deleted = 0 AND order_status IN (301, 401, 402, 502)
         AND DATE_FORMAT(pay_time, '%Y-%m') BETWEEN ? AND ?
       GROUP BY DATE_FORMAT(pay_time, '%Y-%m') ORDER BY period ASC`,
      [startMonth, endMonth]
    )

    refundRows = await query(
      `SELECT DATE_FORMAT(update_time, '%Y-%m') AS period,
              COALESCE(SUM(amount), 0) AS refund
       FROM litemall_aftersale
       WHERE deleted = 0 AND type = 1 AND status = 2
         AND DATE_FORMAT(update_time, '%Y-%m') BETWEEN ? AND ?
       GROUP BY DATE_FORMAT(update_time, '%Y-%m')`,
      [startMonth, endMonth]
    )

    customerRows = await query(
      `SELECT COUNT(DISTINCT user_id) AS c FROM litemall_order
       WHERE deleted = 0 AND order_status IN (301, 401, 402, 502)
         AND DATE_FORMAT(pay_time, '%Y-%m') BETWEEN ? AND ?`,
      [startMonth, endMonth]
    )
  }

  const refundMap = new Map(refundRows.map(r => [r.period, parseFloat(r.refund)]))

  // 组装 trend 和 detail
  const trend = []
  const detail = []
  for (const r of revenueRows) {
    const revenue = parseFloat(r.revenue)
    const orders = Number(r.orders)
    const refund = refundMap.get(r.period) || 0
    trend.push({ period: r.period, revenue, orders })
    detail.push({ period: r.period, orders, revenue, refund })
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

// 节日活动效果
async function statRevenueHoliday(data) {
  const start = (data && data.startDate) || new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)
  const end = (data && data.endDate) || new Date().toISOString().slice(0, 10)

  // 查所有启用的节日活动
  const holidays = await query(
    `SELECT id, name, start_date, end_date FROM clothing_holiday WHERE deleted = 0 AND enabled = 1 ORDER BY start_date DESC`
  )

  const result = []
  for (const h of holidays) {
    // 活动时间窗口与筛选时间窗口取交集
    const windowStart = h.start_date > start ? h.start_date : start
    const windowEnd = h.end_date < end ? h.end_date : end
    if (windowStart > windowEnd) continue

    // 关联商品数
    const goodsRows = await query(
      'SELECT COUNT(*) AS cnt FROM clothing_holiday_goods WHERE holiday_id = ?', [h.id]
    )
    const goodsCount = goodsRows[0].cnt

    // 活动期间，已支付订单中包含节日关联商品的统计
    const statRows = await query(
      `SELECT COUNT(DISTINCT o.id) AS orders, COALESCE(SUM(og.price * og.number), 0) AS gmv
       FROM litemall_order_goods og
       INNER JOIN litemall_order o ON og.order_id = o.id
       INNER JOIN clothing_holiday_goods hg ON og.goods_id = hg.goods_id AND hg.holiday_id = ?
       WHERE og.deleted = 0 AND o.deleted = 0
         AND o.order_status IN (301, 401, 402, 502)
         AND DATE(o.add_time) BETWEEN ? AND ?`,
      [h.id, windowStart, windowEnd]
    )
    const orders = statRows[0].orders
    const gmv = parseFloat(statRows[0].gmv)
    const avgPrice = orders > 0 ? Math.round(gmv / orders * 100) / 100 : 0

    // Top 5 热销商品
    const topRows = await query(
      `SELECT g.name, SUM(og.number) AS sales, SUM(og.price * og.number) AS amount
       FROM litemall_order_goods og
       INNER JOIN litemall_order o ON og.order_id = o.id
       INNER JOIN litemall_goods g ON og.goods_id = g.id
       INNER JOIN clothing_holiday_goods hg ON og.goods_id = hg.goods_id AND hg.holiday_id = ?
       WHERE og.deleted = 0 AND o.deleted = 0 AND g.deleted = 0
         AND o.order_status IN (301, 401, 402, 502)
         AND DATE(o.add_time) BETWEEN ? AND ?
       GROUP BY g.id ORDER BY amount DESC LIMIT 5`,
      [h.id, windowStart, windowEnd]
    )

    result.push({
      name: h.name,
      startDate: h.start_date,
      endDate: h.end_date,
      goodsCount,
      orders,
      gmv,
      avgPrice,
      topGoods: topRows.map(r => ({
        name: r.name,
        sales: parseInt(r.sales),
        amount: parseFloat(r.amount)
      }))
    })
  }

  return response.ok(result)
}

// 特价商品效果
async function statRevenueSpecialPrice(data) {
  const start = (data && data.startDate) || new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)
  const end = (data && data.endDate) || new Date().toISOString().slice(0, 10)

  // 特价商品总数
  const countRows = await query(
    "SELECT COUNT(*) AS cnt FROM litemall_goods WHERE deleted = 0 AND is_special_price = 1"
  )
  const specialCount = countRows[0].cnt

  // 特价商品在时间窗口内的销售统计
  const specialStatRows = await query(
    `SELECT COUNT(DISTINCT og.order_id) AS orders, COALESCE(SUM(og.price * og.number), 0) AS amount
     FROM litemall_order_goods og
     INNER JOIN litemall_goods g ON og.goods_id = g.id
     INNER JOIN litemall_order o ON og.order_id = o.id
     WHERE og.deleted = 0 AND o.deleted = 0 AND g.deleted = 0
       AND g.is_special_price = 1
       AND o.order_status IN (301, 401, 402, 502)
       AND DATE(o.add_time) BETWEEN ? AND ?`,
    [start, end]
  )
  const soldOrders = parseInt(specialStatRows[0].orders)
  const totalAmount = parseFloat(specialStatRows[0].amount)

  // 原价商品同期销售统计（用于对比）
  const normalStatRows = await query(
    `SELECT COUNT(DISTINCT og.order_id) AS orders, COALESCE(SUM(og.price * og.number), 0) AS amount,
            COALESCE(SUM(og.number), 0) AS qty
     FROM litemall_order_goods og
     INNER JOIN litemall_goods g ON og.goods_id = g.id
     INNER JOIN litemall_order o ON og.order_id = o.id
     WHERE og.deleted = 0 AND o.deleted = 0 AND g.deleted = 0
       AND (g.is_special_price = 0 OR g.is_special_price IS NULL)
       AND o.order_status IN (301, 401, 402, 502)
       AND DATE(o.add_time) BETWEEN ? AND ?`,
    [start, end]
  )
  const normalOrders = parseInt(normalStatRows[0].orders)
  const normalAmount = parseFloat(normalStatRows[0].amount)
  const normalQty = parseInt(normalStatRows[0].qty)

  // 特价商品件数
  const specialQtyRows = await query(
    `SELECT COALESCE(SUM(og.number), 0) AS qty
     FROM litemall_order_goods og
     INNER JOIN litemall_goods g ON og.goods_id = g.id
     INNER JOIN litemall_order o ON og.order_id = o.id
     WHERE og.deleted = 0 AND o.deleted = 0 AND g.deleted = 0
       AND g.is_special_price = 1
       AND o.order_status IN (301, 401, 402, 502)
       AND DATE(o.add_time) BETWEEN ? AND ?`,
    [start, end]
  )
  const specialQty = parseInt(specialQtyRows[0].qty)

  // 平均折扣率：特价商品平均售价 vs 其原价
  const avgPriceRows = await query(
    `SELECT COALESCE(AVG(og.price), 0) AS avgSpecial,
            COALESCE(AVG(g.retail_price), 0) AS avgRetail
     FROM litemall_order_goods og
     INNER JOIN litemall_goods g ON og.goods_id = g.id
     INNER JOIN litemall_order o ON og.order_id = o.id
     WHERE og.deleted = 0 AND o.deleted = 0 AND g.deleted = 0
       AND g.is_special_price = 1 AND g.special_price IS NOT NULL
       AND o.order_status IN (301, 401, 402, 502)
       AND DATE(o.add_time) BETWEEN ? AND ?`,
    [start, end]
  )
  const avgSpecial = parseFloat(avgPriceRows[0].avgSpecial)
  const avgRetail = parseFloat(avgPriceRows[0].avgRetail)
  const discountRate = avgRetail > 0 ? Math.round((1 - avgSpecial / avgRetail) * 1000) / 10 : 0

  // Top 5 热销特价商品
  const topRows = await query(
    `SELECT g.name, SUM(og.number) AS sales, SUM(og.price * og.number) AS amount,
            g.retail_price, g.special_price
     FROM litemall_order_goods og
     INNER JOIN litemall_goods g ON og.goods_id = g.id
     INNER JOIN litemall_order o ON og.order_id = o.id
     WHERE og.deleted = 0 AND o.deleted = 0 AND g.deleted = 0
       AND g.is_special_price = 1
       AND o.order_status IN (301, 401, 402, 502)
       AND DATE(o.add_time) BETWEEN ? AND ?
     GROUP BY g.id ORDER BY amount DESC LIMIT 5`,
    [start, end]
  )

  return response.ok({
    specialCount,
    soldOrders,
    specialQty,
    totalAmount,
    discountRate,
    normalOrders,
    normalAmount,
    normalQty,
    topGoods: topRows.map(r => ({
      name: r.name,
      sales: parseInt(r.sales),
      amount: parseFloat(r.amount),
      retailPrice: parseFloat(r.retail_price),
      specialPrice: parseFloat(r.special_price)
    }))
  })
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
async function statDashboardSales(data) {
  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)
  const startDate = (data && data.startDate) || weekAgo
  const endDate = (data && data.endDate) || today

  // 核心指标：已支付订单
  const paidStatus = '301, 401, 402, 502'
  const summaryRows = await query(
    `SELECT COUNT(*) AS orders, COALESCE(SUM(actual_price), 0) AS revenue
     FROM litemall_order
     WHERE deleted = 0 AND order_status IN (${paidStatus})
       AND DATE(pay_time) BETWEEN ? AND ?`,
    [startDate, endDate]
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
       AND DATE(o.pay_time) BETWEEN ? AND ?
     GROUP BY og.goods_id
     ORDER BY amount DESC LIMIT 5`,
    [startDate, endDate]
  )
  const salesTopMax = salesTop.length > 0 ? Number(salesTop[0].amount) : 1

  // 商品复购 Top5（被不同用户购买次数最多的商品）
  const repurchaseTop = await query(
    `SELECT og.goods_id, MAX(og.goods_name) AS name, MAX(og.pic_url) AS picUrl,
            COUNT(DISTINCT o.user_id) AS buyerCount, COUNT(*) AS buyTimes
     FROM litemall_order_goods og
     INNER JOIN litemall_order o ON og.order_id = o.id
     WHERE og.deleted = 0 AND o.deleted = 0 AND o.order_status IN (${paidStatus})
       AND DATE(o.pay_time) BETWEEN ? AND ?
     GROUP BY og.goods_id
     HAVING COUNT(DISTINCT o.user_id) > 1
     ORDER BY buyerCount DESC, buyTimes DESC LIMIT 5`,
    [startDate, endDate]
  )
  const repurchaseTopMax = repurchaseTop.length > 0 ? Number(repurchaseTop[0].buyerCount) : 1

  // 商品售后 Top5
  const afterSalesTop = await query(
    `SELECT og.goods_id, MAX(og.goods_name) AS name, MAX(og.pic_url) AS picUrl,
            COUNT(*) AS count
     FROM litemall_order_goods og
     INNER JOIN litemall_aftersale a ON a.order_id = og.order_id
     WHERE og.deleted = 0 AND a.deleted = 0
       AND DATE(a.update_time) BETWEEN ? AND ?
     GROUP BY og.goods_id
     ORDER BY count DESC LIMIT 5`,
    [startDate, endDate]
  )
  const afterSalesTopMax = afterSalesTop.length > 0 ? Number(afterSalesTop[0].count) : 1

  // 首页轮播海报点击 Top5（仅 source=banner 的 scene_click 事件）
  let bannerTop = []
  try {
    const bannerRows = await query(
      `SELECT MAX(JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.sceneName'))) AS sceneName,
              CAST(MAX(JSON_EXTRACT(event_data, '$.position')) AS SIGNED) AS pos,
              COUNT(*) AS clickCount,
              COUNT(DISTINCT user_id) AS uniqueUsers
       FROM litemall_tracker_event
       WHERE event_type = 'scene_click'
         AND JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.source')) = 'banner'
         AND DATE(server_time) BETWEEN ? AND ?
       GROUP BY JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.sceneId'))
       ORDER BY clickCount DESC LIMIT 5`,
      [startDate, endDate]
    )
    const bannerMax = bannerRows.length > 0 ? Number(bannerRows[0].clickCount) : 1
    bannerTop = bannerRows.map(r => ({
      name: r.sceneName || '未知场景',
      value: Number(r.clickCount) + '次点击',
      percentage: bannerMax > 0 ? Math.round(Number(r.clickCount) / bannerMax * 100) : 0,
    }))
  } catch (e) {
    console.error('[statDashboardSales] bannerTop error:', e.message)
  }

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
    bannerTop,
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

  // 推送查看率：push_view / push_send（从埋点事件计算）
  let pushViewRate = 0
  try {
    const pushSendRows = await query(
      "SELECT COUNT(*) AS c FROM litemall_tracker_event WHERE event_type = 'push_send'"
    )
    const pushViewRows = await query(
      "SELECT COUNT(*) AS c FROM litemall_tracker_event WHERE event_type = 'push_view'"
    )
    const pushSend = Number(pushSendRows[0]?.c || 0)
    const pushView = Number(pushViewRows[0]?.c || 0)
    pushViewRate = pushSend > 0 ? Number((pushView * 100 / pushSend).toFixed(1)) : 0
  } catch (e) {
    // tracker_event 表可能无数据，保持默认 0
  }

  // 支付转化率：已支付订单 / 总订单
  let payRate = 0
  try {
    const paidRows = await query(
      "SELECT COUNT(*) AS c FROM litemall_order WHERE deleted = 0 AND order_status >= 201"
    )
    const orderTotal = Number(orderRows[0]?.c || 0)
    const paidCount = Number(paidRows[0]?.c || 0)
    payRate = orderTotal > 0 ? Number((paidCount * 100 / orderTotal).toFixed(1)) : 0
  } catch (e) {
    // 保持默认 0
  }

  return response.ok({
    pushViewRate,
    payRate,
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

// ========== 埋点配置管理 ==========

// 分类中文映射
const CATEGORY_MAP = { browse: '浏览', goods: '商品', trade: '交易', social: '社交', push: '推送' }

// 预置事件配置
const PRESET_EVENTS = [
  { event_type: 'page_view', event_name: '页面浏览', category: 'browse', description: '用户浏览页面的记录', page_routes: '["pages/index/index","pages/category/category","pages/cart/cart","pages/mine/mine","pages/search/search","pages/goods_detail/goods_detail","pages/confirm_order/confirm_order","pages/payResult/payResult","pages/order/order","pages/ucenter/orderDetail/orderDetail","pages/ucenter/footprint/footprint","pages/ucenter/couponList/couponList","pages/ucenter/collect/collect","pages/scene/scene"]' },
  { event_type: 'goods_view', event_name: '商品浏览', category: 'goods', description: '用户查看商品详情', page_routes: '["pages/goods_detail/goods_detail"]' },
  { event_type: 'add_cart', event_name: '加购', category: 'goods', description: '用户加入购物车', page_routes: '["pages/goods_detail/goods_detail"]' },
  { event_type: 'collect', event_name: '收藏', category: 'goods', description: '用户收藏/取消收藏商品', page_routes: '["pages/goods_detail/goods_detail"]' },
  { event_type: 'search', event_name: '搜索', category: 'browse', description: '用户搜索商品', page_routes: '["pages/search/search"]' },
  { event_type: 'order_create', event_name: '下单', category: 'trade', description: '用户提交订单', page_routes: '["pages/confirm_order/confirm_order"]' },
  { event_type: 'order_pay', event_name: '支付', category: 'trade', description: '用户完成支付', page_routes: '["pages/payResult/payResult"]' },
  { event_type: 'share', event_name: '分享', category: 'social', description: '用户分享内容（已定义未启用）', page_routes: null },
  { event_type: 'click', event_name: '点击', category: 'social', description: '用户点击元素（已定义未启用）', page_routes: null },
  { event_type: 'push_send', event_name: '推送发送', category: 'push', description: '系统推送消息发送', page_routes: null },
  { event_type: 'push_view', event_name: '推送查看', category: 'push', description: '用户查看推送消息', page_routes: null },
  { event_type: 'scene_view', event_name: '场景浏览', category: 'browse', description: '用户浏览场景穿搭', page_routes: '["pages/scene/scene"]' },
  { event_type: 'scene_click', event_name: '场景点击', category: 'browse', description: '用户点击场景穿搭中的商品', page_routes: '["pages/scene/scene"]' },
]

// 埋点配置列表（含近7天事件量）
async function trackerConfigList() {
  const configs = await query('SELECT event_type, event_name, category, description, page_routes, enabled, updated_at FROM litemall_tracker_config ORDER BY FIELD(category, "browse","goods","trade","social","push"), event_type')

  // 近7天事件量
  const counts = await query(
    "SELECT event_type, COUNT(*) AS count FROM litemall_tracker_event WHERE server_time >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY event_type"
  )
  const countMap = new Map(counts.map(r => [r.event_type, Number(r.count)]))

  // 最后触发时间
  const lastTimes = await query(
    "SELECT event_type, MAX(server_time) AS lastTime FROM litemall_tracker_event GROUP BY event_type"
  )
  const timeMap = new Map(lastTimes.map(r => [r.event_type, r.lastTime]))

  const list = configs.map(r => ({
    eventType: r.event_type,
    eventName: r.event_name,
    category: r.category,
    categoryName: CATEGORY_MAP[r.category] || r.category,
    description: r.description || '',
    pageRoutes: r.page_routes ? JSON.parse(r.page_routes) : [],
    enabled: r.enabled === 1,
    last7Days: countMap.get(r.event_type) || 0,
    lastTime: timeMap.get(r.event_type) || null,
    updatedAt: r.updated_at,
  }))

  return response.ok(list)
}

// 更新埋点配置
async function trackerConfigUpdate(data) {
  const { eventType, enabled, description } = data
  if (!eventType) return response.badArgument()

  const sets = []
  const params = []
  if (enabled !== undefined) { sets.push('enabled = ?'); params.push(enabled ? 1 : 0) }
  if (description !== undefined) { sets.push('description = ?'); params.push(description) }
  if (sets.length === 0) return response.badArgument()

  params.push(eventType)
  await query(`UPDATE litemall_tracker_config SET ${sets.join(', ')} WHERE event_type = ?`, params)
  return response.ok()
}

// 初始化预置数据（INSERT IGNORE，已存在则跳过）
async function trackerConfigInit() {
  let inserted = 0
  for (const evt of PRESET_EVENTS) {
    const result = await query(
      'INSERT IGNORE INTO litemall_tracker_config (event_type, event_name, category, description, page_routes, enabled) VALUES (?, ?, ?, ?, ?, 1)',
      [evt.event_type, evt.event_name, evt.category, evt.description, evt.page_routes]
    )
    if (result.affectedRows > 0) inserted++
  }
  return response.ok({ inserted, total: PRESET_EVENTS.length })
}

module.exports = {
  statUser, statOrder, statGoods, statGrowth, statRetention, statActiveUsers,
  statTrackerOverview, statTrackerTrend, statTrackerPages, statTrackerFunnel,
  statRevenueOverview, statRevenueScene, statRevenueCategory,
  statRevenueSeasonOverview, statRevenueSeasonHotGoods,
  statRevenueHoliday, statRevenueSpecialPrice,
  statDashboardSales, statDashboardConversion,
  statSalesGoodsTop, statCollect, statFootprint, statSearchHistory,
  trackerConfigList, trackerConfigUpdate, trackerConfigInit,
  statTrackerBannerClicks,
}
