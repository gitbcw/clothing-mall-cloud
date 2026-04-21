/**
 * 订单接口
 *
 * 迁移自 WxOrderService
 * 接口：list, detail, submit, cancel, prepay, h5pay, payNotify, refund, confirm, deleteOrder
 */

const { db, response } = require('layer-base')
const { getConfig } = require('layer-base').systemConfig
const { STATUS, orderStatusText, buildHandleOption, orderStatusFilter } = require('../lib/order-util')
const { calculateFreight } = require('../lib/freight')
const { checkCoupon, calculateDiscount } = require('../lib/coupon-verify')

// ==================== 订单列表 ====================

async function list(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const showType = data.showType || 0
  const page = data.page || 1
  const limit = data.limit || 10
  const sort = data.sort || 'id'
  const order = data.order || 'desc'

  const statusList = orderStatusFilter(showType)

  // 安全排序字段白名单
  const sortWhiteList = ['id', 'add_time', 'update_time']
  const safeSort = sortWhiteList.includes(sort) ? sort : 'id'
  const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

  // 已完成订单阶梯展示：>10 件仅展示 30 天内
  let minUpdateTime = null
  if (showType === 4 && statusList) {
    const countRows = await db.query(
      `SELECT COUNT(*) as total FROM litemall_order
       WHERE user_id = ? AND deleted = 0 AND order_status IN (${statusList.map(() => '?').join(',')})`,
      [userId, ...statusList]
    )
    if (countRows[0].total > 10) {
      minUpdateTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    }
  }

  const offset = (page - 1) * limit

  let where = `WHERE user_id = ? AND deleted = 0`
  const params = [userId]

  if (statusList) {
    where += ` AND order_status IN (${statusList.map(() => '?').join(',')})`
    params.push(...statusList)
  }
  if (minUpdateTime) {
    where += ` AND update_time >= ?`
    params.push(minUpdateTime)
  }

  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM litemall_order ${where}`,
    params
  )

  const orderRows = await db.query(
    `SELECT id, order_sn, actual_price, order_status, aftersale_status, add_time
     FROM litemall_order ${where}
     ORDER BY ${safeSort} ${safeOrder} LIMIT ${offset}, ${limit}`,
    params
  )

  const orderVoList = []
  for (const o of orderRows) {
    const goodsRows = await db.query(
      `SELECT id, goods_name, number, pic_url, specifications, price
       FROM litemall_order_goods WHERE order_id = ? AND deleted = 0`,
      [o.id]
    )
    // 解析 specifications JSON
    for (const g of goodsRows) {
      if (typeof g.specifications === 'string') {
        try { g.specifications = JSON.parse(g.specifications) } catch (e) { /* ignore */ }
      }
    }
    orderVoList.push({
      id: o.id,
      orderSn: o.order_sn,
      actualPrice: o.actual_price,
      orderStatusText: orderStatusText(o),
      handleOption: buildHandleOption(o),
      aftersaleStatus: o.aftersale_status,
      goodsList: goodsRows.map(g => ({
        id: g.id, goodsName: g.goods_name, goodsSn: g.goods_sn,
        productId: g.product_id, skuId: g.sku_id, number: g.number,
        price: g.price, specifications: g.specifications, picUrl: g.pic_url,
      })),
    })
  }

  return response.ok({
    total: countResult[0].total,
    page,
    limit,
    pages: Math.ceil(countResult[0].total / limit),
    list: orderVoList,
  })
}

// ==================== 订单详情 ====================

async function detail(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const { orderId } = data
  if (!orderId) return response.badArgument()

  const rows = await db.query(
    `SELECT * FROM litemall_order WHERE id = ? AND user_id = ? AND deleted = 0 LIMIT 1`,
    [orderId, userId]
  )
  if (rows.length === 0) return response.fail(700, '订单不存在')

  const order = rows[0]

  // 查询快递公司名称
  let expName = order.ship_channel || ''
  if (order.ship_channel) {
    const shipperRows = await db.query(
      `SELECT name FROM litemall_shipper WHERE code = ? LIMIT 1`,
      [order.ship_channel]
    )
    if (shipperRows.length > 0) expName = shipperRows[0].name
  }

  const orderVo = {
    id: order.id,
    orderSn: order.order_sn,
    message: order.message,
    addTime: order.add_time,
    consignee: order.consignee,
    mobile: order.mobile,
    address: order.address,
    goodsPrice: order.goods_price,
    couponPrice: order.coupon_price,
    freightPrice: order.freight_price,
    actualPrice: order.actual_price,
    orderStatusText: orderStatusText(order),
    handleOption: buildHandleOption(order),
    aftersaleStatus: order.aftersale_status,
    expCode: order.ship_channel,
    expName: expName,
    expNo: order.ship_sn,
    deliveryType: order.delivery_type,
  }

  // 自提信息
  if (order.delivery_type === 'pickup') {
    orderVo.pickupCode = order.pickup_code
    orderVo.pickupStoreId = order.pickup_store_id
    orderVo.pickupContact = order.pickup_contact
    orderVo.pickupPhone = order.pickup_phone
    if (order.pickup_store_id) {
      const storeRows = await db.query(
        `SELECT id, name, address, phone, business_hours, image_url FROM clothing_store WHERE id = ? LIMIT 1`,
        [order.pickup_store_id]
      )
      if (storeRows.length > 0) {
        const s = storeRows[0]
        orderVo.pickupStore = {
          id: s.id, name: s.name, address: s.address, phone: s.phone,
          businessHours: s.business_hours, imageUrl: s.image_url,
        }
      }
    }
  }

  const goodsRows = await db.query(
    `SELECT * FROM litemall_order_goods WHERE order_id = ? AND deleted = 0`,
    [order.id]
  )
  for (const g of goodsRows) {
    if (typeof g.specifications === 'string') {
      try { g.specifications = JSON.parse(g.specifications) } catch (e) { /* ignore */ }
    }
  }

  // 字段转换 snake_case -> camelCase
  const camelGoods = goodsRows.map(g => ({
    id: g.id, orderId: g.order_id, goodsId: g.goods_id, goodsSn: g.goods_sn,
    productId: g.product_id, skuId: g.sku_id, color: g.color, size: g.size,
    goodsName: g.goods_name, picUrl: g.pic_url, price: g.price,
    number: g.number, specifications: g.specifications, addTime: g.add_time,
  }))

  // 物流信息（有快递单号时返回）
  let expressInfo = []
  if (order.ship_channel && order.ship_sn) {
    const snapRows = await db.query(
      `SELECT * FROM litemall_order_express WHERE order_id = ? LIMIT 1`,
      [order.id]
    )
    if (snapRows.length > 0 && snapRows[0].traces_json) {
      try { expressInfo = JSON.parse(snapRows[0].traces_json) } catch (e) { /* ignore */ }
    }
  }

  return response.ok({
    orderInfo: orderVo,
    orderGoods: camelGoods,
    expressInfo,
  })
}

// ==================== 提交订单 ====================

async function submit(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const { cartId, addressId, couponId, userCouponId, message,
    deliveryType, pickupStoreId, pickupContact, pickupPhone } = data

  if (cartId == null || couponId == null) return response.badArgument()

  const dt = deliveryType || 'express'

  // 自提模式验证
  if (dt === 'pickup' && (!pickupStoreId || pickupStoreId <= 0)) {
    return response.fail(400, '请选择自提门店')
  }

  // 获取地址
  let address = null
  if (addressId && addressId > 0) {
    const rows = await db.query(
      `SELECT * FROM litemall_address WHERE id = ? AND user_id = ? AND deleted = 0 LIMIT 1`,
      [addressId, userId]
    )
    address = rows[0] || null
  }
  if (!address) {
    const rows = await db.query(
      `SELECT * FROM litemall_address WHERE user_id = ? AND is_default = 1 AND deleted = 0 LIMIT 1`,
      [userId]
    )
    address = rows[0] || null
  }
  if (!address) return response.fail(400, '请先添加收货地址')

  // 自提模式取联系人信息
  let finalContact = pickupContact || address.name
  let finalPhone = pickupPhone || address.tel
  if (dt === 'pickup' && (!finalPhone || !/^1[3-9]\d{9}$/.test(finalPhone))) {
    return response.fail(400, '收货地址中手机号不完整，请先完善地址信息')
  }

  // 获取购物车商品
  let cartList = []
  if (cartId === 0) {
    cartList = await db.query(
      `SELECT * FROM litemall_cart WHERE user_id = ? AND checked = 1 AND deleted = 0`,
      [userId]
    )
  } else {
    const rows = await db.query(
      `SELECT * FROM litemall_cart WHERE id = ? AND user_id = ? AND deleted = 0 LIMIT 1`,
      [cartId, userId]
    )
    if (rows.length > 0) cartList = [rows[0]]
  }
  if (cartList.length === 0) return response.badArgumentValue()

  // 计算商品总价
  let checkedGoodsPrice = 0
  for (const c of cartList) {
    checkedGoodsPrice += parseFloat(c.price) * c.number
  }

  // 优惠券
  let couponPrice = 0
  if (couponId !== 0 && couponId !== -1) {
    const coupon = await checkCoupon(userId, couponId, userCouponId, checkedGoodsPrice)
    if (!coupon) return response.badArgumentValue()
    couponPrice = calculateDiscount(coupon, checkedGoodsPrice)
  }

  // 新人首单立减（仅统计有效订单，排除取消和已退款）
  let newuserDiscount = 0
  const cancelStatuses = [STATUS.CANCEL, STATUS.AUTO_CANCEL, STATUS.ADMIN_CANCEL, STATUS.REFUND_CONFIRM]
  const countRows = await db.query(
    `SELECT COUNT(*) as total FROM litemall_order
     WHERE user_id = ? AND deleted = 0 AND order_status NOT IN (${cancelStatuses.map(() => '?').join(',')})`,
    [userId, ...cancelStatuses]
  )
  if (countRows[0].total === 0) {
    const discount = parseFloat(getConfig('litemall_newuser_first_order_discount')) || 0
    if (discount > 0) newuserDiscount = Math.min(discount, checkedGoodsPrice + freightPrice - couponPrice)
  }

  // 运费
  let freightPrice = 0
  if (dt === 'express') {
    const totalPieceCount = cartList.reduce((sum, c) => sum + c.number, 0)
    freightPrice = calculateFreight(checkedGoodsPrice, totalPieceCount)
  }

  // 订单费用
  const orderTotalPrice = Math.max(0, checkedGoodsPrice + freightPrice - couponPrice - newuserDiscount)
  const actualPrice = orderTotalPrice

  // 生成订单编号
  const orderSn = await generateOrderSn(userId)

  // 构建订单数据
  const orderData = {
    user_id: userId,
    order_sn: orderSn,
    order_status: STATUS.CREATE,
    add_time: new Date(),
    update_time: new Date(),
    message: message || '',
    goods_price: checkedGoodsPrice.toFixed(2),
    freight_price: freightPrice.toFixed(2),
    coupon_price: couponPrice.toFixed(2),
    integral_price: 0,
    order_price: orderTotalPrice.toFixed(2),
    actual_price: actualPrice.toFixed(2),
    delivery_type: dt,
    consignee: finalContact,
    mobile: finalPhone,
    address: dt === 'express'
      ? `${address.province || ''}${address.city || ''}${address.county || ''} ${address.address_detail || ''}`
      : (await getStoreAddress(pickupStoreId)),
  }

  // 自提额外字段
  if (dt === 'pickup') {
    orderData.pickup_store_id = pickupStoreId
    orderData.pickup_contact = finalContact
    orderData.pickup_phone = finalPhone
    orderData.pickup_code = generatePickupCode()
  }

  // 创建事务：插入订单 + 订单商品 + 清理购物车 + 扣减库存 + 更新优惠券
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    // 插入订单
    const [orderResult] = await conn.query(`INSERT INTO litemall_order SET ?`, [orderData])
    const orderId = orderResult.insertId

    // 插入订单商品
    for (const cart of cartList) {
      let specs = []
      if (typeof cart.specifications === 'string') {
        try { specs = JSON.parse(cart.specifications) } catch (e) { /* ignore */ }
      }
      if ((!specs || specs.length === 0) && cart.size) {
        specs = [cart.size]
      }
      await conn.query(
        `INSERT INTO litemall_order_goods
          (order_id, goods_id, goods_sn, product_id, sku_id, color, size,
           goods_name, pic_url, price, number, specifications, add_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [orderId, cart.goods_id, cart.goods_sn || '', cart.product_id || 0, cart.sku_id,
         cart.color, cart.size, cart.goods_name, cart.pic_url, cart.price,
         cart.number, JSON.stringify(specs)]
      )
    }

    // 清理购物车
    if (cartId === 0) {
      await conn.query(
        `UPDATE litemall_cart SET deleted = 1 WHERE user_id = ? AND checked = 1`,
        [userId]
      )
    } else {
      await conn.query(
        `UPDATE litemall_cart SET deleted = 1 WHERE id = ? AND user_id = ?`,
        [cartId, userId]
      )
    }

    // 扣减库存（SKU 模式不扣减）
    for (const cart of cartList) {
      if (cart.sku_id) continue
      if (!cart.product_id) continue
      await conn.query(
        `UPDATE litemall_goods_product SET number = GREATEST(number - ?, 0) WHERE id = ?`,
        [cart.number, cart.product_id]
      )
    }

    // 更新优惠券状态
    if (couponId !== 0 && couponId !== -1 && userCouponId) {
      await conn.query(
        `UPDATE litemall_coupon_user SET status = 2, used_time = NOW(), order_id = ? WHERE id = ?`,
        [orderId, userCouponId]
      )
    }

    // 0 元订单直接跳过支付
    let payed = false
    if (actualPrice === 0) {
      payed = true
      const nextStatus = dt === 'pickup' ? STATUS.VERIFY_PENDING : STATUS.PAY
      await conn.query(
        `UPDATE litemall_order SET order_status = ? WHERE id = ?`,
        [nextStatus, orderId]
      )
    }

    await conn.commit()

    return response.ok({ orderId, payed })
  } catch (err) {
    await conn.rollback()
    console.error('[wx-order] submit transaction error:', err)
    return response.fail(500, '下单失败，请稍后重试')
  } finally {
    conn.release()
  }
}

// ==================== 取消订单 ====================

async function cancel(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const { orderId } = data
  if (!orderId) return response.badArgument()

  const rows = await db.query(
    `SELECT * FROM litemall_order WHERE id = ? AND user_id = ? AND deleted = 0 LIMIT 1`,
    [orderId, userId]
  )
  if (rows.length === 0) return response.badArgumentValue()

  const order = rows[0]
  const option = buildHandleOption(order)
  if (!option.cancel) return response.fail(700, '订单不能取消')

  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    // 设置取消状态
    await conn.query(
      `UPDATE litemall_order SET order_status = ?, end_time = NOW() WHERE id = ?`,
      [STATUS.CANCEL, orderId]
    )

    // 恢复库存
    const goodsRows = await db.query(
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

    // 返还优惠券
    await releaseCoupon(conn, orderId)

    await conn.commit()
    return response.ok()
  } catch (err) {
    await conn.rollback()
    console.error('[wx-order] cancel error:', err)
    return response.fail(502, '取消订单失败，请稍后重试')
  } finally {
    conn.release()
  }
}

// ==================== 退款申请 ====================

async function refund(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const { orderId } = data
  if (!orderId) return response.badArgument()

  const rows = await db.query(
    `SELECT * FROM litemall_order WHERE id = ? AND user_id = ? AND deleted = 0 LIMIT 1`,
    [orderId, userId]
  )
  if (rows.length === 0) return response.badArgumentValue()

  const order = rows[0]
  const option = buildHandleOption(order)
  if (!option.refund) return response.fail(700, '订单不能退款')

  await db.query(
    `UPDATE litemall_order SET order_status = ? WHERE id = ?`,
    [STATUS.REFUND, orderId]
  )

  return response.ok()
}

// ==================== 确认收货 ====================

async function confirm(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const { orderId } = data
  if (!orderId) return response.badArgument()

  const rows = await db.query(
    `SELECT * FROM litemall_order WHERE id = ? AND user_id = ? AND deleted = 0 LIMIT 1`,
    [orderId, userId]
  )
  if (rows.length === 0) return response.badArgumentValue()

  const order = rows[0]
  const option = buildHandleOption(order)
  if (!option.confirm) return response.fail(700, '订单不能确认收货')

  await db.query(
    `UPDATE litemall_order SET order_status = ?, confirm_time = NOW() WHERE id = ?`,
    [STATUS.CONFIRM, orderId]
  )

  return response.ok()
}

// ==================== 删除订单 ====================

async function deleteOrder(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const { orderId } = data
  if (!orderId) return response.badArgument()

  const rows = await db.query(
    `SELECT * FROM litemall_order WHERE id = ? AND user_id = ? AND deleted = 0 LIMIT 1`,
    [orderId, userId]
  )
  if (rows.length === 0) return response.badArgumentValue()

  const order = rows[0]
  const option = buildHandleOption(order)
  if (!option.delete) return response.fail(700, '订单不能删除')

  await db.query(
    `UPDATE litemall_order SET deleted = 1 WHERE id = ?`,
    [orderId]
  )
  await db.query(
    `UPDATE litemall_aftersale SET deleted = 1 WHERE order_id = ? AND user_id = ?`,
    [orderId, userId]
  )

  return response.ok()
}

// ==================== 预支付 ====================

async function prepay(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const { orderId } = data
  if (!orderId) return response.badArgument()

  const rows = await db.query(
    `SELECT * FROM litemall_order WHERE id = ? AND user_id = ? AND deleted = 0 LIMIT 1`,
    [orderId, userId]
  )
  if (rows.length === 0) return response.badArgumentValue()

  const order = rows[0]
  const option = buildHandleOption(order)
  if (!option.pay) return response.fail(700, '订单不能支付')

  const mockPay = (process.env.MOCK_PAY || 'true') === 'true'

  if (mockPay) {
    // 模拟支付：直接将订单标记为已付
    const nextStatus = order.delivery_type === 'pickup'
      ? STATUS.VERIFY_PENDING    // 501
      : STATUS.PAY               // 201

    await db.query(
      `UPDATE litemall_order
       SET order_status = ?, pay_id = ?, pay_time = NOW(), update_time = NOW()
       WHERE id = ?`,
      [nextStatus, 'MOCK_' + order.order_sn, orderId]
    )

    console.info(`[wx-order] mock payment: order ${orderId} -> status ${nextStatus}`)
    return response.ok({ mockPay: true })
  }

  // 真实微信支付：调用云支付统一下单
  const openId = context.OPENID
  if (!openId) return response.fail(502, '无法获取用户 OpenID')

  const totalFee = Math.round(parseFloat(order.actual_price) * 100) // 元 → 分

  try {
    const payResult = await cloud.cloudPay.unifiedOrder({
      body: `订单:${order.order_sn}`,
      outTradeNo: order.order_sn,
      spbillCreateIp: '127.0.0.1',
      totalFee: totalFee,
      envId: process.env.TCB_ENV_ID,
      functionName: 'wx-pay-callback',
      nonceStr: Math.random().toString(36).substr(2, 15),
      tradeType: 'JSAPI',
    })

    return response.ok({
      timeStamp: payResult.timeStamp,
      nonceStr: payResult.nonceStr,
      packageValue: payResult.package,
      signType: 'MD5',
      paySign: payResult.paySign,
    })
  } catch (err) {
    console.error('[wx-order] prepay unifiedOrder error:', err)
    return response.fail(502, '支付调起失败，请重试')
  }
}

// ==================== H5支付（代理到 prepay） ====================

async function h5pay(data, context) {
  return prepay(data, context)
}

// ==================== 内部工具方法 ====================

/**
 * 生成订单编号
 */
async function generateOrderSn(userId) {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const mi = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  const ms = String(now.getMilliseconds()).padStart(3, '0')
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `${y}${m}${d}${h}${mi}${s}${ms}${userId}${rand}`
}

/**
 * 生成6位取货码
 */
function generatePickupCode() {
  return String(100000 + Math.floor(Math.random() * 900000))
}

/**
 * 获取门店地址信息
 */
async function getStoreAddress(storeId) {
  if (!storeId) return '到店自提'
  const rows = await db.query(
    `SELECT name FROM clothing_store WHERE id = ? AND deleted = 0 LIMIT 1`,
    [storeId]
  )
  return rows.length > 0 ? `到店自提-${rows[0].name}` : '到店自提'
}

/**
 * 释放优惠券
 */
async function releaseCoupon(conn, orderId) {
  const [rows] = await conn.query(
    `SELECT id FROM litemall_coupon_user WHERE order_id = ? AND status = 2 AND deleted = 0`,
    [orderId]
  )
  for (const row of rows) {
    await conn.query(
      `UPDATE litemall_coupon_user SET status = 0, update_time = NOW() WHERE id = ?`,
      [row.id]
    )
  }
}

module.exports = {
  list, detail, submit, cancel, refund, confirm, deleteOrder,
  prepay, h5pay,
}
