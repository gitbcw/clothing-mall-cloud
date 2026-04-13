/**
 * 售后接口
 *
 * 迁移自 WxAftersaleController
 * 接口：list, detail, submit, cancel
 */

const { db, response } = require('layer-base')
const { STATUS, isConfirmStatus, isAutoConfirmStatus } = require('../lib/order-util')

// 售后状态常量
const AS_STATUS = {
  INIT: 0,       // 可申请
  REQUEST: 1,    // 用户已申请
  RECEPT: 2,     // 管理员审核通过
  SHIPPED: 3,    // 换货已发货
  REJECT: 4,     // 管理员拒绝
  CANCEL: 5,     // 用户取消
  COMPLETED: 6,  // 换货完成
}

// ==================== 售后列表 ====================

async function list(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const status = data.status != null ? data.status : null
  const page = data.page || 1
  const limit = data.limit || 10
  const offset = (page - 1) * limit

  let where = `WHERE user_id = ? AND deleted = 0`
  const params = [userId]

  if (status !== null && status !== '' && status !== undefined) {
    where += ` AND status = ?`
    params.push(status)
  }

  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM litemall_aftersale ${where}`,
    params
  )

  const rows = await db.query(
    `SELECT * FROM litemall_aftersale ${where}
     ORDER BY add_time DESC LIMIT ${offset}, ${limit}`,
    params
  )

  const voList = []
  for (const a of rows) {
    const goodsRows = await db.query(
      `SELECT * FROM litemall_order_goods WHERE order_id = ? AND deleted = 0`,
      [a.order_id]
    )
    for (const g of goodsRows) {
      if (typeof g.specifications === 'string') {
        try { g.specifications = JSON.parse(g.specifications) } catch (e) { /* ignore */ }
      }
    }
    let pics = []
    if (a.pictures) {
      try { pics = JSON.parse(a.pictures) } catch (e) { pics = [] }
    }
    voList.push({
      aftersale: {
        id: a.id, aftersaleSn: a.aftersale_sn, orderId: a.order_id, userId: a.user_id,
        type: a.type, reason: a.reason, amount: a.amount, pictures: pics,
        comment: a.comment, status: a.status,
        newSkuId: a.new_sku_id, newColor: a.new_color, newSize: a.new_size,
        addTime: a.add_time, updateTime: a.update_time,
      },
      goodsList: goodsRows.map(g => ({
        id: g.id, orderId: g.order_id, goodsId: g.goods_id, goodsSn: g.goods_sn,
        productId: g.product_id, skuId: g.sku_id, color: g.color, size: g.size,
        goodsName: g.goods_name, picUrl: g.pic_url, price: g.price,
        number: g.number, specifications: g.specifications, addTime: g.add_time,
      })),
    })
  }

  return response.ok({
    total: countResult[0].total,
    page,
    limit,
    pages: Math.ceil(countResult[0].total / limit),
    list: voList,
  })
}

// ==================== 售后详情 ====================

async function detail(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const { orderId } = data
  if (!orderId) return response.badArgument()

  const orderRows = await db.query(
    `SELECT * FROM litemall_order WHERE id = ? AND user_id = ? AND deleted = 0 LIMIT 1`,
    [orderId, userId]
  )
  if (orderRows.length === 0) return response.badArgumentValue()

  const goodsRows = await db.query(
    `SELECT * FROM litemall_order_goods WHERE order_id = ? AND deleted = 0`,
    [orderId]
  )
  for (const g of goodsRows) {
    if (typeof g.specifications === 'string') {
      try { g.specifications = JSON.parse(g.specifications) } catch (e) { /* ignore */ }
    }
  }

  const aftersaleRows = await db.query(
    `SELECT * FROM litemall_aftersale WHERE order_id = ? AND user_id = ? AND deleted = 0 LIMIT 1`,
    [orderId, userId]
  )

  // 字段转换 snake_case -> camelCase
  const a = aftersaleRows[0] || null
  let pictures = []
  if (a && a.pictures) {
    try { pictures = JSON.parse(a.pictures) } catch (e) { pictures = [] }
  }
  const camelAftersale = a ? {
    id: a.id, aftersaleSn: a.aftersale_sn, orderId: a.order_id, userId: a.user_id,
    type: a.type, reason: a.reason, amount: a.amount, pictures: pictures,
    comment: a.comment, status: a.status,
    newSkuId: a.new_sku_id, newColor: a.new_color, newSize: a.new_size,
    addTime: a.add_time, updateTime: a.update_time,
    shipChannel: a.ship_channel, shipSn: a.ship_sn,
  } : null

  const o = orderRows[0]
  const camelOrder = {
    id: o.id, orderSn: o.order_sn, userId: o.user_id, message: o.message,
    addTime: o.add_time, consignee: o.consignee, mobile: o.mobile, address: o.address,
    goodsPrice: o.goods_price, couponPrice: o.coupon_price, freightPrice: o.freight_price,
    actualPrice: o.actual_price, orderStatus: o.order_status, aftersaleStatus: o.aftersale_status,
    shipChannel: o.ship_channel, shipSn: o.ship_sn, deliveryType: o.delivery_type,
    pickupCode: o.pickup_code, pickupStoreId: o.pickup_store_id,
    pickupContact: o.pickup_contact, pickupPhone: o.pickup_phone,
  }

  const camelGoods = goodsRows.map(g => ({
    id: g.id, orderId: g.order_id, goodsId: g.goods_id, goodsSn: g.goods_sn,
    productId: g.product_id, skuId: g.sku_id, color: g.color, size: g.size,
    goodsName: g.goods_name, picUrl: g.pic_url, price: g.price,
    number: g.number, specifications: g.specifications, addTime: g.add_time,
  }))

  return response.ok({
    aftersale: camelAftersale,
    order: camelOrder,
    orderGoods: camelGoods,
  })
}

// ==================== 申请售后 ====================

async function submit(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const { orderId, type, amount, reason, pictures, comment,
    newSkuId, newColor, newSize } = data

  // 参数验证
  if (type == null || !reason) {
    return response.badArgument()
  }
  if (!orderId) return response.badArgument()

  // 查询订单
  const orderRows = await db.query(
    `SELECT * FROM litemall_order WHERE id = ? AND user_id = ? AND deleted = 0 LIMIT 1`,
    [orderId, userId]
  )
  if (orderRows.length === 0) return response.badArgumentValue()

  const order = orderRows[0]

  // 订单必须已收货或已核销才能申请售后
  const canAftersale = isConfirmStatus(order) || isAutoConfirmStatus(order) || order.order_status === STATUS.VERIFIED
  if (!canAftersale) {
    return response.fail(700, '不能申请售后')
  }

  // amount 缺省取订单实付金额
  const finalAmount = amount != null ? amount : order.actual_price

  // 已有进行中的售后则不能重复申请
  if (order.aftersale_status === AS_STATUS.RECEPT || order.aftersale_status === AS_STATUS.SHIPPED) {
    return response.fail(701, '已申请售后')
  }

  // 删除旧的售后记录（已取消/被拒绝的）
  await db.query(
    `UPDATE litemall_aftersale SET deleted = 1 WHERE order_id = ? AND user_id = ?`,
    [orderId, userId]
  )

  // 生成售后单号
  const now = new Date()
  const aftersaleSn = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}${userId}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`

  await db.query(
    `INSERT INTO litemall_aftersale
      (aftersale_sn, order_id, user_id, type, reason, amount, pictures, comment,
       status, new_sku_id, new_color, new_size, add_time, update_time, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)`,
    [aftersaleSn, orderId, userId, type, reason, finalAmount,
     pictures ? JSON.stringify(pictures) : '[]',
     comment || '', AS_STATUS.REQUEST,
     newSkuId || null, newColor || null, newSize || null]
  )

  // 更新订单售后状态
  await db.query(
    `UPDATE litemall_order SET aftersale_status = ? WHERE id = ?`,
    [AS_STATUS.REQUEST, orderId]
  )

  return response.ok()
}

// ==================== 取消售后 ====================

async function cancel(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const { id } = data
  if (!id) return response.badArgument()

  const rows = await db.query(
    `SELECT * FROM litemall_aftersale WHERE id = ? AND user_id = ? AND deleted = 0 LIMIT 1`,
    [id, userId]
  )
  if (rows.length === 0) return response.badArgument()

  const aftersale = rows[0]

  const orderRows = await db.query(
    `SELECT * FROM litemall_order WHERE id = ? AND user_id = ? AND deleted = 0 LIMIT 1`,
    [aftersale.order_id, userId]
  )
  if (orderRows.length === 0) return response.badArgumentValue()

  const order = orderRows[0]

  // 订单必须已收货或已核销
  const canAftersale = isConfirmStatus(order) || isAutoConfirmStatus(order) || order.order_status === STATUS.VERIFIED
  if (!canAftersale) {
    return response.fail(700, '不支持售后')
  }

  // 只有"已申请"状态才能取消
  if (order.aftersale_status !== AS_STATUS.REQUEST) {
    return response.fail(701, '不能取消售后')
  }

  await db.query(
    `UPDATE litemall_aftersale SET status = ? WHERE id = ?`,
    [AS_STATUS.CANCEL, id]
  )

  await db.query(
    `UPDATE litemall_order SET aftersale_status = ? WHERE id = ?`,
    [AS_STATUS.CANCEL, aftersale.order_id]
  )

  return response.ok()
}

module.exports = { list, detail, submit, cancel }
