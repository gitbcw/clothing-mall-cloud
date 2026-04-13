/**
 * 管理端订单接口
 *
 * 迁移自 WxManagerOrderController
 * 接口：list, detail, ship, cancel, refundAgree, refundReject, verify, stats, shippers
 */

const { db, response } = require('layer-base')
const { STATUS, orderStatusText, AS_STATUS, aftersaleStatusText, aftersaleTypeText } = require('../lib/order-util')

function toOrderGoodsCamel(r) {
  return {
    id: r.id, goodsName: r.goods_name, goodsId: r.goods_id,
    number: r.number, picUrl: r.pic_url, specifications: r.specifications,
    price: r.price, productId: r.product_id,
  }
}

function toOrderCamel(r) {
  return {
    id: r.id, orderSn: r.order_sn, orderStatus: r.order_status,
    actualPrice: r.actual_price, consignee: r.consignee, mobile: r.mobile,
    addTime: r.add_time, deliveryType: r.delivery_type,
  }
}

function toOrderDetailCamel(r) {
  return {
    id: r.id, orderSn: r.order_sn, orderStatus: r.order_status,
    aftersaleStatus: r.aftersale_status,
    consignee: r.consignee, mobile: r.mobile, address: r.address, message: r.message,
    goodsPrice: r.goods_price, freightPrice: r.freight_price,
    couponPrice: r.coupon_price, orderPrice: r.order_price, actualPrice: r.actual_price,
    payId: r.pay_id, payTime: r.pay_time,
    shipSn: r.ship_sn, shipChannel: r.ship_channel, shipTime: r.ship_time,
    deliveryType: r.delivery_type,
    pickupStoreId: r.pickup_store_id, pickupContact: r.pickup_contact,
    pickupPhone: r.pickup_phone, pickupTime: r.pickup_time,
    pickupCode: r.pickup_code, pickupStatus: r.pickup_status,
    refundAmount: r.refund_amount, refundType: r.refund_type,
    refundContent: r.refund_content, refundTime: r.refund_time,
    confirmTime: r.confirm_time, endTime: r.end_time,
    addTime: r.add_time, updateTime: r.update_time,
    guideId: r.guide_id,
  }
}

// ==================== Tab 状态映射 ====================

const PENDING_STATUSES = [STATUS.PAY, STATUS.VERIFY_PENDING]
const AFTERSALE_PENDING_STATUSES = [AS_STATUS.REQUEST, AS_STATUS.RECEPT]
const AFTERSALE_DONE_STATUSES = [AS_STATUS.REJECT, AS_STATUS.CANCEL, AS_STATUS.COMPLETED]
const COMPLETED_STATUSES = [
  STATUS.SHIP, STATUS.CONFIRM, STATUS.AUTO_CONFIRM,
  STATUS.VERIFIED, STATUS.CANCEL, STATUS.AUTO_CANCEL, STATUS.ADMIN_CANCEL,
]

// ==================== 订单列表 ====================

async function list(data) {
  const status = data.status || 'pending'
  const page = data.page || 1
  const limit = data.limit || 20
  const offset = (page - 1) * limit

  let statusCodes
  switch (status) {
    case 'pending': statusCodes = PENDING_STATUSES; break
    case 'completed': statusCodes = COMPLETED_STATUSES; break
    default: return response.badArgumentValue()
  }

  // 总数
  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM litemall_order WHERE deleted = 0 AND order_status IN (${statusCodes.map(() => '?').join(',')})`,
    statusCodes
  )
  const total = countResult[0].total

  // 列表
  const orderRows = await db.query(
    `SELECT id, order_sn, order_status, actual_price, consignee, mobile, add_time, delivery_type
     FROM litemall_order WHERE deleted = 0 AND order_status IN (${statusCodes.map(() => '?').join(',')})
     ORDER BY add_time DESC LIMIT ${offset}, ${limit}`,
    statusCodes
  )

  const resultList = []
  for (const order of orderRows) {
    const goodsRows = await db.query(
      `SELECT id, goods_name, number, pic_url, specifications, price
       FROM litemall_order_goods WHERE order_id = ? AND deleted = 0`,
      [order.id]
    )
    for (const g of goodsRows) {
      if (typeof g.specifications === 'string') {
        try { g.specifications = JSON.parse(g.specifications) } catch (e) { /* ignore */ }
      }
    }
    resultList.push({
      ...toOrderCamel(order),
      orderStatusText: orderStatusText(order),
      goodsList: goodsRows.map(toOrderGoodsCamel),
      goodsCount: goodsRows.length,
    })
  }

  // 各 tab 统计
  const [pendingCount, aftersaleCount, completedCount] = await Promise.all([
    db.query(`SELECT COUNT(*) as c FROM litemall_order WHERE deleted = 0 AND order_status IN (${PENDING_STATUSES.map(() => '?').join(',')})`, PENDING_STATUSES),
    db.query(`SELECT COUNT(*) as c FROM litemall_aftersale WHERE deleted = 0 AND status IN (${AFTERSALE_PENDING_STATUSES.map(() => '?').join(',')})`, AFTERSALE_PENDING_STATUSES),
    db.query(`SELECT COUNT(*) as c FROM litemall_order WHERE deleted = 0 AND order_status IN (${COMPLETED_STATUSES.map(() => '?').join(',')})`, COMPLETED_STATUSES),
  ])

  return response.ok({
    list: resultList,
    total,
    pages: Math.ceil(total / limit),
    pendingCount: pendingCount[0].c,
    aftersaleCount: aftersaleCount[0].c,
    completedCount: completedCount[0].c,
  })
}

// ==================== 订单详情 ====================

async function detail(data) {
  const { orderId } = data
  if (!orderId) return response.badArgument()

  const rows = await db.query(
    `SELECT * FROM litemall_order WHERE id = ? AND deleted = 0 LIMIT 1`,
    [orderId]
  )
  if (rows.length === 0) return response.badArgumentValue()

  const order = rows[0]
  const result = { order: toOrderDetailCamel(order) }

  // 自提订单附加门店信息
  if (order.delivery_type === 'pickup' && order.pickup_store_id) {
    const storeRows = await db.query(
      `SELECT id, name, address, phone, business_hours FROM clothing_store WHERE id = ? LIMIT 1`,
      [order.pickup_store_id]
    )
    if (storeRows.length > 0) result.pickupStore = storeRows[0]
  }

  const goodsRows = await db.query(
    `SELECT * FROM litemall_order_goods WHERE order_id = ? AND deleted = 0`,
    [orderId]
  )
  for (const g of goodsRows) {
    if (typeof g.specifications === 'string') {
      try { g.specifications = JSON.parse(g.specifications) } catch (e) { /* ignore */ }
    }
  }
  result.goodsList = goodsRows.map(toOrderGoodsCamel)

  return response.ok(result)
}

// ==================== 发货 ====================

async function ship(data) {
  const { orderId, shipSn, shipChannel } = data
  if (!orderId) return response.badArgument()

  const rows = await db.query(
    `SELECT * FROM litemall_order WHERE id = ? AND deleted = 0 LIMIT 1`,
    [orderId]
  )
  if (rows.length === 0) return response.badArgument()

  const order = rows[0]
  if (order.order_status !== STATUS.PAY) {
    return response.fail(403, '订单状态不允许发货')
  }

  await db.query(
    `UPDATE litemall_order SET order_status = ?, ship_sn = ?, ship_channel = ?, ship_time = NOW()
     WHERE id = ? AND deleted = 0`,
    [STATUS.SHIP, shipSn || '', shipChannel || '', orderId]
  )

  return response.ok()
}

// ==================== 取消订单 ====================

async function cancel(data) {
  const { orderId } = data
  if (!orderId) return response.badArgument()

  const rows = await db.query(
    `SELECT * FROM litemall_order WHERE id = ? AND deleted = 0 LIMIT 1`,
    [orderId]
  )
  if (rows.length === 0) return response.badArgument()

  const order = rows[0]
  if (order.order_status !== STATUS.CREATE && order.order_status !== STATUS.PAY) {
    return response.fail(403, '订单状态不允许取消')
  }

  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    // 已付款订单需退款（占位，微信支付未接入）
    if (order.order_status === STATUS.PAY) {
      // TODO: 接入微信退款
      console.warn(`[wx-manager-order] 取消已付款订单 ${orderId}，微信退款未接入`)
    }

    // 回滚库存
    await rollbackStock(conn, orderId)

    await conn.query(
      `UPDATE litemall_order SET order_status = ?, end_time = NOW() WHERE id = ?`,
      [STATUS.ADMIN_CANCEL, orderId]
    )

    // 返还优惠券
    const couponRows = await conn.query(
      `SELECT id FROM litemall_coupon_user WHERE order_id = ? AND status = 2 AND deleted = 0`,
      [orderId]
    )
    for (const cr of couponRows) {
      await conn.query(
        `UPDATE litemall_coupon_user SET status = 0, update_time = NOW() WHERE id = ?`,
        [cr.id]
      )
    }

    await conn.commit()
    return response.ok()
  } catch (err) {
    await conn.rollback()
    console.error('[wx-manager-order] cancel error:', err)
    return response.serious()
  } finally {
    conn.release()
  }
}

// ==================== 同意退款 ====================

async function refundAgree(data) {
  const { orderId } = data
  if (!orderId) return response.badArgument()

  const rows = await db.query(
    `SELECT * FROM litemall_order WHERE id = ? AND deleted = 0 LIMIT 1`,
    [orderId]
  )
  if (rows.length === 0) return response.badArgument()

  const order = rows[0]
  if (order.order_status !== STATUS.REFUND) {
    return response.fail(403, '订单状态不允许退款')
  }

  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    // 微信退款（占位）
    // TODO: 接入微信退款

    // 释放库存
    await rollbackStock(conn, orderId)

    await conn.query(
      `UPDATE litemall_order SET order_status = ?, end_time = NOW() WHERE id = ?`,
      [STATUS.REFUND_CONFIRM, orderId]
    )

    // 返还优惠券
    const couponRows = await conn.query(
      `SELECT id FROM litemall_coupon_user WHERE order_id = ? AND status = 2 AND deleted = 0`,
      [orderId]
    )
    for (const cr of couponRows) {
      await conn.query(
        `UPDATE litemall_coupon_user SET status = 0, update_time = NOW() WHERE id = ?`,
        [cr.id]
      )
    }

    await conn.commit()
    return response.ok()
  } catch (err) {
    await conn.rollback()
    console.error('[wx-manager-order] refundAgree error:', err)
    return response.serious()
  } finally {
    conn.release()
  }
}

// ==================== 拒绝退款 ====================

async function refundReject(data) {
  const { orderId } = data
  if (!orderId) return response.badArgument()

  const rows = await db.query(
    `SELECT * FROM litemall_order WHERE id = ? AND deleted = 0 LIMIT 1`,
    [orderId]
  )
  if (rows.length === 0) return response.badArgument()

  const order = rows[0]
  if (order.order_status !== STATUS.REFUND) {
    return response.fail(403, '订单状态不正确')
  }

  // 恢复原状态：已发货→301，未发货→201
  const nextStatus = order.ship_time ? STATUS.SHIP : STATUS.PAY

  await db.query(
    `UPDATE litemall_order SET order_status = ? WHERE id = ?`,
    [nextStatus, orderId]
  )

  return response.ok()
}

// ==================== 核销自提 ====================

async function verify(data) {
  const { orderId, pickupCode } = data
  if (!orderId || !pickupCode) return response.badArgument()

  const rows = await db.query(
    `SELECT * FROM litemall_order WHERE id = ? AND deleted = 0 LIMIT 1`,
    [orderId]
  )
  if (rows.length === 0) return response.badArgument()

  const order = rows[0]
  if (order.order_status !== STATUS.VERIFY_PENDING) {
    return response.fail(403, '订单状态不允许核销')
  }

  if (order.pickup_code !== pickupCode) {
    return response.fail(400, '取货码错误')
  }

  await db.query(
    `UPDATE litemall_order SET order_status = ?, confirm_time = NOW() WHERE id = ?`,
    [STATUS.VERIFIED, orderId]
  )

  return response.ok()
}

// ==================== 统计数据 ====================

async function stats() {
  const [pendingRows, aftersaleRows, draftRows, pendingGoodsRows] = await Promise.all([
    db.query(`SELECT COUNT(*) as c FROM litemall_order WHERE deleted = 0 AND order_status IN (${PENDING_STATUSES.map(() => '?').join(',')})`, PENDING_STATUSES),
    db.query(`SELECT COUNT(*) as c FROM litemall_aftersale WHERE deleted = 0 AND status IN (${AFTERSALE_PENDING_STATUSES.map(() => '?').join(',')})`, AFTERSALE_PENDING_STATUSES),
    db.query(`SELECT COUNT(*) as c FROM litemall_goods WHERE deleted = 0 AND status = 'draft'`),
    db.query(`SELECT COUNT(*) as c FROM litemall_goods WHERE deleted = 0 AND status = 'pending'`),
  ])

  // 最近 5 条待处理订单
  const recentRows = await db.query(
    `SELECT id, order_sn, order_status, actual_price, consignee, add_time
     FROM litemall_order WHERE deleted = 0 AND order_status IN (${PENDING_STATUSES.map(() => '?').join(',')})
     ORDER BY add_time DESC LIMIT 5`,
    PENDING_STATUSES
  )
  const recentOrders = recentRows.map(o => ({
    ...toOrderCamel(o),
    orderStatusText: orderStatusText(o),
  }))

  return response.ok({
    pendingOrderCount: pendingRows[0].c,
    aftersaleCount: aftersaleRows[0].c,
    pendingGoodsCount: draftRows[0].c + pendingGoodsRows[0].c,
    recentOrders,
  })
}

// ==================== 快递公司列表 ====================

async function shippers() {
  const rows = await db.query(
    `SELECT id, name, code FROM litemall_shipper WHERE deleted = 0 AND enabled = 1 ORDER BY sort_order ASC`
  )
  return response.ok(rows.map(r => ({ id: r.id, name: r.name, code: r.code })))
}

// ==================== 内部方法 ====================

async function rollbackStock(conn, orderId) {
  const goodsRows = await conn.query(
    `SELECT product_id, number FROM litemall_order_goods WHERE order_id = ? AND deleted = 0`,
    [orderId]
  )
  for (const g of goodsRows) {
    if (!g.product_id || g.product_id <= 0) continue
    await conn.query(
      `UPDATE litemall_goods_product SET number = number + ? WHERE id = ?`,
      [g.number, g.product_id]
    )
  }
}

module.exports = {
  list, detail, ship, cancel, refundAgree, refundReject, verify, stats, shippers,
}
