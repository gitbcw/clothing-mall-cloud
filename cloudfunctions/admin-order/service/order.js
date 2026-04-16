/**
 * admin-order/service/order.js — 管理后台订单管理
 *
 * 接口：list, detail, ship, refund, reply, delete, overview, channel, express, snapshot, snapshotBySn, pay
 */
const { db, response, paginate } = require('layer-base')
const { query, execute } = db
const { STATUS, orderStatusText } = require('../lib/order-util')

const SORT_WHITELIST = ['id', 'add_time', 'order_status']
function safeSort(sort, order) {
  const s = SORT_WHITELIST.includes(sort) ? sort : 'add_time'
  const o = order === 'asc' ? 'ASC' : 'DESC'
  return { sort: s, order: o }
}

// ==================== 订单列表 ====================

async function list(data) {
  const { page, limit, offset } = paginate.parsePage({ data })
  const where = ['o.deleted = 0']
  const params = []

  if (data.nickname) { where.push('(u.nickname LIKE ? OR u.username LIKE ?)'); params.push(`%${data.nickname}%`, `%${data.nickname}%`) }
  if (data.consignee) { where.push('o.consignee LIKE ?'); params.push(`%${data.consignee}%`) }
  if (data.orderSn) { where.push('o.order_sn = ?'); params.push(data.orderSn) }
  if (data.start && data.end) { where.push('o.add_time BETWEEN ? AND ?'); params.push(data.start, data.end) }
  if (data.deliveryType) { where.push('o.delivery_type = ?'); params.push(data.deliveryType) }
  if (Array.isArray(data.orderStatusArray) && data.orderStatusArray.length > 0) {
    const placeholders = data.orderStatusArray.map(() => '?').join(',')
    where.push(`o.order_status IN (${placeholders})`)
    params.push(...data.orderStatusArray)
  }

  const whereClause = where.join(' AND ')
  const { sort, order } = safeSort(data.sort, data.order)

  const countRows = await query(
    `SELECT COUNT(*) AS total FROM litemall_order o LEFT JOIN litemall_user u ON o.user_id = u.id WHERE ${whereClause}`,
    params
  )
  const total = countRows[0] ? countRows[0].total : 0

  const sql = paginate.appendLimit(
    `SELECT o.* FROM litemall_order o LEFT JOIN litemall_user u ON o.user_id = u.id WHERE ${whereClause} ORDER BY o.${sort} ${order}`,
    offset, limit
  )
  const listRows = await query(sql, params)

  // 附加商品列表
  const resultList = []
  for (const order of listRows) {
    const goodsRows = await query(
      `SELECT id, goods_name, number, pic_url, specifications, price FROM litemall_order_goods WHERE order_id = ? AND deleted = 0`,
      [order.id]
    )
    for (const g of goodsRows) {
      if (typeof g.specifications === 'string') {
        try { g.specifications = JSON.parse(g.specifications) } catch (e) { /* ignore */ }
      }
    }
    resultList.push({
      ...order,
      orderStatusText: orderStatusText(order),
      goodsVoList: goodsRows,
      goodsCount: goodsRows.length,
    })
  }

  return response.okList(resultList, total, page, limit)
}

// ==================== 订单详情 ====================

async function detail(data) {
  const { id } = data
  if (!id) return response.badArgument()

  const rows = await query('SELECT * FROM litemall_order WHERE id = ? AND deleted = 0', [id])
  if (rows.length === 0) return response.badArgumentValue()

  const order = rows[0]
  const result = { order: { ...order, orderStatusText: orderStatusText(order) } }

  // 用户信息
  const userRows = await query('SELECT id, nickname, avatar, mobile FROM litemall_user WHERE id = ? AND deleted = 0', [order.user_id])
  result.user = userRows.length > 0 ? userRows[0] : {}

  // 商品列表
  const goodsRows = await query(
    `SELECT * FROM litemall_order_goods WHERE order_id = ? AND deleted = 0`, [id]
  )
  for (const g of goodsRows) {
    if (typeof g.specifications === 'string') {
      try { g.specifications = JSON.parse(g.specifications) } catch (e) { /* ignore */ }
    }
  }
  result.orderGoods = goodsRows

  return response.ok(result)
}

// ==================== 发货 ====================

async function ship(data) {
  const { orderId, shipSn, shipChannel } = data
  if (!orderId) return response.badArgument()

  const rows = await query('SELECT * FROM litemall_order WHERE id = ? AND deleted = 0', [orderId])
  if (rows.length === 0) return response.badArgument()

  if (rows[0].order_status !== STATUS.PAY) {
    return response.fail(403, '订单状态不允许发货')
  }

  await execute(
    'UPDATE litemall_order SET order_status = ?, ship_sn = ?, ship_channel = ?, ship_time = NOW() WHERE id = ?',
    [STATUS.SHIP, shipSn || '', shipChannel || '', orderId]
  )
  return response.ok()
}

// ==================== 退款 ====================

async function refund(data) {
  const { orderId } = data
  if (!orderId) return response.badArgument()

  const rows = await query('SELECT * FROM litemall_order WHERE id = ? AND deleted = 0', [orderId])
  if (rows.length === 0) return response.badArgument()

  if (rows[0].order_status !== STATUS.REFUND) {
    return response.fail(403, '订单状态不允许退款')
  }

  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    // TODO: 微信退款（未接入）

    // 释放库存
    const goodsRows = await conn.query(
      'SELECT product_id, number FROM litemall_order_goods WHERE order_id = ? AND deleted = 0', [orderId]
    )
    for (const g of goodsRows) {
      if (!g.product_id || g.product_id <= 0) continue
      await conn.query('UPDATE litemall_goods_product SET number = number + ? WHERE id = ?', [g.number, g.product_id])
    }

    await conn.query(
      'UPDATE litemall_order SET order_status = ?, end_time = NOW() WHERE id = ?',
      [STATUS.REFUND_CONFIRM, orderId]
    )

    // 返还优惠券
    const couponRows = await conn.query(
      'SELECT id FROM litemall_coupon_user WHERE order_id = ? AND status = 2 AND deleted = 0', [orderId]
    )
    for (const cr of couponRows) {
      await conn.query('UPDATE litemall_coupon_user SET status = 0, update_time = NOW() WHERE id = ?', [cr.id])
    }

    await conn.commit()
    return response.ok()
  } catch (err) {
    await conn.rollback()
    console.error('[admin-order] refund error:', err)
    return response.serious()
  } finally {
    conn.release()
  }
}

// ==================== 回复评论 ====================

async function reply(data) {
  const { orderId } = data
  if (!orderId) return response.badArgument()

  const rows = await query(
    'SELECT id FROM litemall_comment WHERE order_id = ? AND deleted = 0', [orderId]
  )
  if (rows.length === 0) return response.badArgumentValue()

  // 标记所有关联评论为已回复（管理端回复由前端直接操作 comment 表，此处为占位）
  return response.ok()
}

// ==================== 删除订单 ====================

async function deleteFn(data) {
  const { orderId } = data
  if (!orderId) return response.badArgument()

  const rows = await query('SELECT order_status FROM litemall_order WHERE id = ? AND deleted = 0', [orderId])
  if (rows.length === 0) return response.badArgumentValue()

  const status = rows[0].order_status
  // 只允许删除已完成/已取消的订单
  const allowStatuses = [STATUS.CANCEL, STATUS.AUTO_CANCEL, STATUS.ADMIN_CANCEL, STATUS.CONFIRM, STATUS.AUTO_CONFIRM, STATUS.REFUND_CONFIRM, STATUS.VERIFIED, STATUS.VERIFY_EXPIRED, STATUS.VERIFY_REFUND]
  if (!allowStatuses.includes(status)) {
    return response.fail(403, '订单状态不允许删除')
  }

  await execute('UPDATE litemall_order SET deleted = 1 WHERE id = ?', [orderId])
  return response.ok()
}

// ==================== 订单概览 ====================

async function overview() {
  // 按 tab name 返回计数，前端直接用 statusCounts[tabName] 取值
  const result = {}

  // 单个状态计数（key 为状态码字符串）
  const singleStatuses = [
    { key: '101', code: STATUS.CREATE },
    { key: '201', code: STATUS.PAY },
    { key: '301', code: STATUS.SHIP },
    { key: '501', code: STATUS.VERIFY_PENDING },
  ]
  for (const s of singleStatuses) {
    const rows = await query('SELECT COUNT(*) AS c FROM litemall_order WHERE deleted = 0 AND order_status = ?', [s.code])
    result[s.key] = rows[0].c
  }

  // 聚合计数
  const pendingAll = await query(
    `SELECT COUNT(*) AS c FROM litemall_order WHERE deleted = 0 AND order_status IN (101, 201, 501)`
  )
  result['pending_all'] = pendingAll[0].c

  const completedAll = await query(
    `SELECT COUNT(*) AS c FROM litemall_order WHERE deleted = 0 AND order_status IN (102, 103, 104, 203, 401, 402, 502, 503, 504)`
  )
  result['completed_all'] = completedAll[0].c

  return response.ok(result)
}

// ==================== 物流公司列表 ====================

async function channel() {
  const rows = await query(
    'SELECT id, name, code FROM litemall_shipper WHERE deleted = 0 AND enabled = 1 ORDER BY sort_order ASC'
  )
  return response.ok(rows.map(r => ({ id: r.id, name: r.name, code: r.code })))
}

// ==================== 物流轨迹查询 ====================

async function express(data) {
  const { expCode, expNo } = data
  if (!expCode || !expNo) return response.badArgument()
  // 物流查询需要第三方 API，返回占位
  return response.ok({ traces: [], state: 0 })
}

// ==================== 物流快照 ====================

async function snapshot(data) {
  const { orderId } = data
  if (!orderId) return response.badArgument()

  const rows = await query('SELECT * FROM litemall_order WHERE id = ? AND deleted = 0', [orderId])
  if (rows.length === 0) return response.badArgumentValue()

  const order = rows[0]
  if (!order.ship_sn || !order.ship_channel) return response.fail(403, '订单未发货')

  // 快照存入 litemall_order_express
  const existRows = await query(
    'SELECT id FROM litemall_order_express WHERE order_id = ? AND deleted = 0', [orderId]
  )
  if (existRows.length === 0) {
    await execute(
      'INSERT INTO litemall_order_express (order_id, ship_sn, ship_channel, add_time, update_time, deleted) VALUES (?, ?, ?, NOW(), NOW(), 0)',
      [orderId, order.ship_sn, order.ship_channel]
    )
  } else {
    await execute(
      'UPDATE litemall_order_express SET ship_sn = ?, ship_channel = ?, update_time = NOW() WHERE order_id = ? AND deleted = 0',
      [order.ship_sn, order.ship_channel, orderId]
    )
  }

  return response.ok()
}

// ==================== 按订单编号快照 ====================

async function snapshotBySn(data) {
  const { orderSn } = data
  if (!orderSn) return response.badArgument()

  const rows = await query('SELECT * FROM litemall_order WHERE order_sn = ? AND deleted = 0', [orderSn])
  if (rows.length === 0) return response.badArgumentValue()

  return snapshot({ orderId: rows[0].id })
}

// ==================== 手动收款 ====================

async function pay(data) {
  const { orderId } = data
  if (!orderId) return response.badArgument()

  const rows = await query('SELECT * FROM litemall_order WHERE id = ? AND deleted = 0', [orderId])
  if (rows.length === 0) return response.badArgument()

  if (rows[0].order_status !== STATUS.CREATE) {
    return response.fail(403, '订单状态不允许手动收款')
  }

  await execute(
    'UPDATE litemall_order SET order_status = ?, pay_time = NOW(), pay_id = "admin-manual" WHERE id = ?',
    [STATUS.PAY, orderId]
  )
  return response.ok()
}

// ==================== 核销自提订单 ====================

async function verify(data) {
  const { orderId, pickupCode } = data
  if (!orderId || !pickupCode) return response.badArgument()

  const rows = await query('SELECT * FROM litemall_order WHERE id = ? AND deleted = 0', [orderId])
  if (rows.length === 0) return response.badArgument()

  const order = rows[0]
  if (order.order_status !== STATUS.VERIFY_PENDING) {
    return response.fail(403, '订单状态不允许核销')
  }

  if (order.pickup_code !== pickupCode) {
    return response.fail(400, '取货码错误')
  }

  await execute(
    'UPDATE litemall_order SET order_status = ?, confirm_time = NOW() WHERE id = ?',
    [STATUS.VERIFIED, orderId]
  )
  return response.ok()
}

module.exports = { list, detail, ship, refund, reply, delete: deleteFn, overview, channel, express, snapshot, snapshotBySn, pay, verify }
