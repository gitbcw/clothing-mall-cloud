/**
 * 购物车接口
 *
 * 迁移自 WxCartController
 * 接口：index, add, fastadd, update, checked, delete, goodscount, clear
 */

const { db, response } = require('layer-base')
const { calculateFreight } = require('../lib/freight')

// ==================== 内部工具方法 ====================

/**
 * 检查商品是否已上架
 */
async function checkGoodsOnSale(goodsId) {
  const rows = await db.query(
    `SELECT id, name, goods_sn, pic_url, is_special_price, special_price,
            retail_price, status
     FROM litemall_goods WHERE id = ? AND deleted = 0 LIMIT 1`,
    [goodsId]
  )
  if (rows.length === 0) return null
  const goods = rows[0]
  if (goods.status !== 'published') return null
  return goods
}

/**
 * 获取商品价格（特价优先）
 */
function getGoodsPrice(goods) {
  if (goods.is_special_price && goods.special_price) return goods.special_price
  return goods.retail_price || '0'
}

/**
 * 获取购物车总件数
 */
async function getCartGoodsCount(userId) {
  const rows = await db.query(
    `SELECT COALESCE(SUM(number), 0) as total FROM litemall_cart
     WHERE user_id = ? AND deleted = 0`,
    [userId]
  )
  return rows[0].total
}

/**
 * 查询用户购物车列表（含商品信息）
 */
async function getCartList(userId) {
  return db.query(
    `SELECT id, user_id, goods_id, goods_sn, goods_name, product_id, sku_id,
            color, size, price, number, specifications, checked, pic_url, add_time, update_time
     FROM litemall_cart
     WHERE user_id = ? AND deleted = 0`,
    [userId]
  )
}

/**
 * 自动清理已下架的购物车项
 */
async function cleanInvalidItems(cartList) {
  for (const item of cartList) {
    const goods = await checkGoodsOnSale(item.goods_id)
    if (!goods) {
      await db.query(
        `UPDATE litemall_cart SET deleted = 1 WHERE id = ?`,
        [item.id]
      )
      item._deleted = true
    }
  }
  return cartList.filter(item => !item._deleted)
}

/**
 * 计算购物车统计
 */
function calcCartTotal(cartList) {
  let goodsCount = 0, goodsAmount = 0
  let checkedGoodsCount = 0, checkedGoodsAmount = 0
  for (const item of cartList) {
    const n = item.number || 0
    const p = parseFloat(item.price) || 0
    goodsCount += n
    goodsAmount += n * p
    if (item.checked) {
      checkedGoodsCount += n
      checkedGoodsAmount += n * p
    }
  }
  return {
    goodsCount, goodsAmount: goodsAmount.toFixed(2),
    checkedGoodsCount, checkedGoodsAmount: checkedGoodsAmount.toFixed(2),
  }
}

// ==================== 购物车详情 ====================

async function index(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const cartList = await getCartList(userId)
  const validList = await cleanInvalidItems(cartList)

  // 解析 specifications JSON
  for (const item of validList) {
    if (typeof item.specifications === 'string') {
      try { item.specifications = JSON.parse(item.specifications) } catch (e) { /* ignore */ }
    }
  }

  // 字段转换 snake_case -> camelCase
  const camelList = validList.map(item => ({
    id: item.id,
    goodsId: item.goods_id,
    goodsSn: item.goods_sn,
    goodsName: item.goods_name,
    productId: item.product_id,
    skuId: item.sku_id,
    color: item.color,
    size: item.size,
    price: item.price,
    number: item.number,
    specifications: item.specifications,
    checked: !!item.checked,
    picUrl: item.pic_url,
    addTime: item.add_time,
    updateTime: item.update_time,
  }))

  const cartTotal = calcCartTotal(camelList)

  return response.ok({ cartList: camelList, cartTotal })
}

// ==================== 加入购物车（累加） ====================

async function add(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const { goodsId, number, size } = data
  if (!goodsId || !number || number <= 0) return response.badArgument()

  const goods = await checkGoodsOnSale(goodsId)
  if (!goods) return response.fail(700, '商品已下架')

  // 查找已有购物车项（同商品同尺码）
  const existRows = await db.query(
    `SELECT id, number FROM litemall_cart
     WHERE user_id = ? AND goods_id = ? AND deleted = 0
       ${size ? 'AND size = ?' : ''} LIMIT 1`,
    size ? [userId, goodsId, size] : [userId, goodsId]
  )

  if (existRows.length > 0) {
    // 已存在：累加数量
    await db.query(
      `UPDATE litemall_cart SET number = ?, update_time = NOW() WHERE id = ?`,
      [existRows[0].number + number, existRows[0].id]
    )
  } else {
    // 不存在：新建
    await db.query(
      `INSERT INTO litemall_cart
        (user_id, goods_id, goods_sn, goods_name, product_id, sku_id, color, size,
         price, number, specifications, checked, pic_url, add_time, update_time, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW(), NOW(), 0)`,
      [userId, goodsId, goods.goods_sn || '', goods.name || '', null, null,
       null, size || '', getGoodsPrice(goods), number, null,
       goods.pic_url || '']
    )
  }

  const count = await getCartGoodsCount(userId)
  return response.ok(count)
}

// ==================== 立即购买（覆盖） ====================

async function fastadd(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const { goodsId, number, size } = data
  if (!goodsId || !number || number <= 0) return response.badArgument()

  const goods = await checkGoodsOnSale(goodsId)
  if (!goods) return response.fail(700, '商品已下架')

  // 查找已有购物车项
  const existRows = await db.query(
    `SELECT id FROM litemall_cart
     WHERE user_id = ? AND goods_id = ? AND deleted = 0
       ${size ? 'AND size = ?' : ''} LIMIT 1`,
    size ? [userId, goodsId, size] : [userId, goodsId]
  )

  if (existRows.length > 0) {
    // 已存在：覆盖数量
    await db.query(
      `UPDATE litemall_cart SET number = ?, update_time = NOW() WHERE id = ?`,
      [number, existRows[0].id]
    )
    return response.ok(existRows[0].id)
  } else {
    // 不存在：新建
    const result = await db.query(
      `INSERT INTO litemall_cart
        (user_id, goods_id, goods_sn, goods_name, product_id, sku_id, color, size,
         price, number, specifications, checked, pic_url, add_time, update_time, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW(), NOW(), 0)`,
      [userId, goodsId, goods.goods_sn || '', goods.name || '', null, null,
       null, size || '', getGoodsPrice(goods), number, null,
       goods.pic_url || '']
    )
    return response.ok(result.insertId)
  }
}

// ==================== 修改数量 ====================

async function update(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const { id, goodsId, number } = data
  if (!id || !goodsId || !number || number <= 0) return response.badArgument()

  // 确认购物车项属于当前用户
  const cartRows = await db.query(
    `SELECT id, goods_id FROM litemall_cart WHERE id = ? AND user_id = ? AND deleted = 0 LIMIT 1`,
    [id, userId]
  )
  if (cartRows.length === 0) return response.badArgument()
  if (cartRows[0].goods_id !== goodsId) return response.badArgument()

  // 检查商品未下架
  const goods = await checkGoodsOnSale(goodsId)
  if (!goods) return response.fail(700, '商品已下架')

  await db.query(
    `UPDATE litemall_cart SET number = ?, update_time = NOW() WHERE id = ?`,
    [number, id]
  )

  return response.ok()
}

// ==================== 批量勾选/取消 ====================

async function checked(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const { productIds, isChecked } = data
  if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
    return response.badArgument()
  }

  const checked = isChecked ? 1 : 0
  const _ph = productIds.map(() => '?').join(',')
  await db.query(
    `UPDATE litemall_cart SET checked = ?, update_time = NOW()
     WHERE user_id = ? AND id IN (${_ph}) AND deleted = 0`,
    [checked, userId, ...productIds]
  )

  // 返回更新后的完整购物车
  return index({}, context)
}

// ==================== 批量删除 ====================

async function deleteCart(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const { productIds } = data
  if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
    return response.badArgument()
  }

  const _ph = productIds.map(() => '?').join(',')
  await db.query(
    `UPDATE litemall_cart SET deleted = 1 WHERE user_id = ? AND id IN (${_ph})`,
    [userId, ...productIds]
  )

  return index({}, context)
}

// ==================== 购物车总件数 ====================

async function goodscount(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const count = await getCartGoodsCount(userId)
  return response.ok(count)
}

// ==================== 清空已勾选项 ====================

async function clear(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  await db.query(
    `UPDATE litemall_cart SET deleted = 1 WHERE user_id = ? AND checked = 1`,
    [userId]
  )

  return response.ok()
}

// ==================== 结算信息 ====================

/**
 * 检查优惠券是否有效
 */
function checkCouponValid(coupon, couponUser, checkedGoodsPrice) {
  const now = new Date()
  // 时间校验
  if (coupon.time_type === 1) {
    if (coupon.start_time && now < new Date(coupon.start_time)) return false
    if (coupon.end_time && now > new Date(coupon.end_time)) return false
  } else {
    const endTime = new Date(new Date(couponUser.add_time).getTime() + (coupon.days || 30) * 24 * 60 * 60 * 1000)
    if (now > endTime) return false
  }
  // 状态
  if (coupon.status !== 0) return false
  // 最低消费
  if (checkedGoodsPrice < parseFloat(coupon.min)) return false
  return true
}

/**
 * 计算优惠券折扣金额
 */
function calcCouponDiscount(coupon, checkedGoodsPrice) {
  if (coupon.discount_type === 1) {
    // 折扣率：discount=30 表示打 7 折（30% off）
    return checkedGoodsPrice * parseFloat(coupon.discount) / 100
  }
  // 满减：直接减 discount 金额
  return parseFloat(coupon.discount)
}

/**
 * 格式化地址对象
 */
function formatAddress(addr) {
  if (!addr) return { id: 0 }
  return {
    id: addr.id,
    name: addr.name,
    mobile: addr.tel,
    tel: addr.tel,
    province: addr.province,
    city: addr.city,
    county: addr.county,
    areaCode: addr.area_code,
    addressDetail: addr.address_detail,
    postalCode: addr.postal_code,
    isDefault: !!addr.is_default,
  }
}

/**
 * 格式化购物车项
 */
function formatCartItem(item) {
  let specs = item.specifications
  if (typeof specs === 'string') {
    try { specs = JSON.parse(specs) } catch (e) { specs = [] }
  }
  return {
    id: item.id,
    goodsId: item.goods_id,
    goodsSn: item.goods_sn,
    goodsName: item.goods_name,
    productId: item.product_id,
    skuId: item.sku_id,
    color: item.color,
    size: item.size,
    price: item.price,
    number: item.number,
    specifications: specs || [],
    checked: !!item.checked,
    picUrl: item.pic_url,
  }
}

async function checkout(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const { cartId, addressId, couponId, userCouponId, deliveryType } = data

  // ---------- 1. 收货地址 ----------
  let checkedAddress = null
  if (addressId && addressId !== 0) {
    const addrRows = await db.query(
      `SELECT * FROM litemall_address WHERE id = ? AND user_id = ? AND deleted = 0 LIMIT 1`,
      [addressId, userId]
    )
    if (addrRows.length > 0) checkedAddress = addrRows[0]
  }
  if (!checkedAddress) {
    const defaultRows = await db.query(
      `SELECT * FROM litemall_address WHERE user_id = ? AND is_default = 1 AND deleted = 0 LIMIT 1`,
      [userId]
    )
    if (defaultRows.length > 0) checkedAddress = defaultRows[0]
  }
  const finalAddressId = checkedAddress ? checkedAddress.id : 0

  // ---------- 2. 商品列表 ----------
  let checkedGoodsList = []
  if (!cartId || cartId === 0) {
    checkedGoodsList = await db.query(
      `SELECT * FROM litemall_cart WHERE user_id = ? AND checked = 1 AND deleted = 0`,
      [userId]
    )
  } else {
    const cartRows = await db.query(
      `SELECT * FROM litemall_cart WHERE id = ? AND user_id = ? AND deleted = 0 LIMIT 1`,
      [cartId, userId]
    )
    if (cartRows.length === 0) return response.badArgumentValue()
    checkedGoodsList = cartRows
  }

  // 清理已下架商品
  const validList = []
  for (const item of checkedGoodsList) {
    const goods = await checkGoodsOnSale(item.goods_id)
    if (!goods) {
      await db.query(`UPDATE litemall_cart SET deleted = 1 WHERE id = ?`, [item.id])
    } else {
      validList.push(item)
    }
  }
  checkedGoodsList = validList

  // ---------- 3. 计算商品总价 ----------
  let checkedGoodsPrice = 0
  for (const cart of checkedGoodsList) {
    checkedGoodsPrice += parseFloat(cart.price) * cart.number
  }

  // ---------- 4. 优惠券计算 ----------
  const couponUserRows = await db.query(
    `SELECT * FROM litemall_coupon_user WHERE user_id = ? AND status = 0 AND deleted = 0`,
    [userId]
  )

  const couponIds = couponUserRows.map(r => r.coupon_id).filter(Boolean)
  const couponMap = {}
  if (couponIds.length > 0) {
    const couponRows = await db.query(
      `SELECT * FROM litemall_coupon WHERE id IN (${couponIds.map(() => '?').join(',')}) AND deleted = 0`,
      couponIds
    )
    for (const c of couponRows) couponMap[c.id] = c
  }

  let tmpCouponPrice = 0, tmpCouponId = 0, tmpUserCouponId = 0, tmpCouponLength = 0
  for (const cu of couponUserRows) {
    const coupon = couponMap[cu.coupon_id]
    if (!coupon) continue
    if (!checkCouponValid(coupon, cu, checkedGoodsPrice)) continue
    tmpCouponLength++
    const discount = calcCouponDiscount(coupon, checkedGoodsPrice)
    if (discount > tmpCouponPrice) {
      tmpCouponPrice = discount
      tmpCouponId = coupon.id
      tmpUserCouponId = cu.id
    }
  }

  let finalCouponPrice = 0, finalCouponId = 0, finalUserCouponId = 0
  if (couponId == null || couponId === -1) {
    finalCouponId = -1
    finalUserCouponId = -1
  } else if (!couponId || couponId === 0) {
    finalCouponPrice = tmpCouponPrice
    finalCouponId = tmpCouponId
    finalUserCouponId = tmpUserCouponId
  } else {
    const cu = couponUserRows.find(r => r.coupon_id === couponId && r.id === userCouponId)
    const coupon = cu ? couponMap[cu.coupon_id] : null
    if (cu && coupon && checkCouponValid(coupon, cu, checkedGoodsPrice)) {
      finalCouponPrice = calcCouponDiscount(coupon, checkedGoodsPrice)
      finalCouponId = couponId
      finalUserCouponId = userCouponId
    } else {
      finalCouponPrice = tmpCouponPrice
      finalCouponId = tmpCouponId
      finalUserCouponId = tmpUserCouponId
    }
  }

  // ---------- 5. 运费 ----------
  const totalPieceCount = checkedGoodsList.reduce((sum, c) => sum + c.number, 0)
  const freightPrice = (deliveryType === 'pickup') ? 0 : calculateFreight(checkedGoodsPrice, totalPieceCount)

  // ---------- 6. 订单价格 ----------
  const orderTotalPrice = Math.max(0, checkedGoodsPrice + freightPrice - finalCouponPrice)
  const actualPrice = orderTotalPrice

  // ---------- 7. 组装返回 ----------
  const result = {
    addressId: finalAddressId,
    couponId: finalCouponId,
    userCouponId: finalUserCouponId,
    cartId: cartId || 0,
    checkedAddress: formatAddress(checkedAddress),
    availableCouponLength: tmpCouponLength,
    goodsTotalPrice: checkedGoodsPrice.toFixed(2),
    freightPrice: freightPrice.toFixed(2),
    couponPrice: finalCouponPrice.toFixed(2),
    orderTotalPrice: orderTotalPrice.toFixed(2),
    actualPrice: actualPrice.toFixed(2),
    checkedGoodsList: checkedGoodsList.map(formatCartItem),
    deliveryType: deliveryType || 'express',
  }

  // 自提模式返回门店列表
  if (deliveryType === 'pickup') {
    const stores = await db.query(
      `SELECT * FROM clothing_store WHERE status = 1 AND deleted = 0`
    )
    result.stores = stores.map(s => ({
      id: s.id, name: s.name, address: s.address, phone: s.phone,
      businessHours: s.business_hours, imageUrl: s.image_url,
      latitude: s.latitude, longitude: s.longitude,
    }))
  }

  return response.ok(result)
}

module.exports = { index, add, fastadd, update, checked, delete: deleteCart, goodscount, clear, checkout }
