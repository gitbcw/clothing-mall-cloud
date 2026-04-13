/**
 * 优惠券接口
 *
 * 迁移自 WxCouponController
 * 接口：list, mylist, selectlist, receive, exchange
 */

const { db, response } = require('layer-base')

// 优惠券类型
const TYPE = {
  COMMON: 0,     // 通用券（可领取）
  REGISTER: 1,   // 注册券（自动发放）
  CODE: 2,       // 兑换券（兑换码）
  NEWUSER: 3,    // 新人券
  BIRTHDAY: 4,   // 生日券
}

// 优惠券状态
const STATUS = {
  NORMAL: 0,     // 正常
  EXPIRED: 1,    // 已过期
  OUT: 2,        // 已领完
}

// 用户优惠券状态
const USER_STATUS = {
  USABLE: 0,     // 可用
  USED: 1,       // 已使用
  EXPIRED: 2,    // 已过期
  OUT: 3,        // 已失效
}

// ==================== 优惠券列表（公开） ====================

async function list(data) {
  const page = data.page || 1
  const limit = data.limit || 10
  const sort = data.sort || 'add_time'
  const order = data.order || 'desc'
  const offset = (page - 1) * limit

  const sortWhiteList = ['add_time', 'update_time']
  const safeSort = sortWhiteList.includes(sort) ? sort : 'add_time'
  const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM litemall_coupon WHERE type = ? AND status = ? AND deleted = 0`,
    [TYPE.COMMON, STATUS.NORMAL]
  )

  const rows = await db.query(
    `SELECT id, name, \`desc\`, tag, days, start_time, end_time, discount, min
     FROM litemall_coupon WHERE type = ? AND status = ? AND deleted = 0
     ORDER BY ${safeSort} ${safeOrder} LIMIT ${offset}, ${limit}`,
    [TYPE.COMMON, STATUS.NORMAL]
  )

  return response.ok({
    list: rows,
    total: countResult[0].total,
    pages: Math.ceil(countResult[0].total / limit),
    page,
    limit,
  })
}

// ==================== 我的优惠券 ====================

async function mylist(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const status = data.status != null ? data.status : null
  const page = data.page || 1
  const limit = data.limit || 10
  const sort = data.sort || 'add_time'
  const order = data.order || 'desc'
  const offset = (page - 1) * limit

  const sortWhiteList = ['add_time', 'update_time', 'end_time']
  const safeSort = sortWhiteList.includes(sort) ? sort : 'add_time'
  const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

  let where = `WHERE user_id = ? AND deleted = 0`
  const params = [userId]
  if (status !== null && status !== '' && status !== undefined) {
    where += ` AND status = ?`
    params.push(status)
  }

  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM litemall_coupon_user ${where}`,
    params
  )

  const rows = await db.query(
    `SELECT * FROM litemall_coupon_user ${where}
     ORDER BY ${safeSort} ${safeOrder} LIMIT ${offset}, ${limit}`,
    params
  )

  // 批量查优惠券模板
  const couponIds = rows.map(r => r.coupon_id).filter(Boolean)
  const couponMap = {}
  if (couponIds.length > 0) {
    const couponRows = await db.query(
      `SELECT id, name, \`desc\`, tag, min, discount, discount_type, item_limit, type
       FROM litemall_coupon WHERE id IN (${couponIds.map(() => '?').join(',')}) AND deleted = 0`,
      couponIds
    )
    for (const c of couponRows) {
      couponMap[c.id] = c
    }
  }

  const voList = []
  for (const cu of rows) {
    const coupon = couponMap[cu.coupon_id]
    if (!coupon) continue
    voList.push({
      id: cu.id,
      cid: coupon.id,
      name: coupon.name,
      desc: coupon.desc,
      tag: coupon.tag,
      min: coupon.min,
      discount: coupon.discount,
      discountType: coupon.discount_type,
      itemLimit: coupon.item_limit,
      type: coupon.type,
      startTime: cu.start_time,
      endTime: cu.end_time,
    })
  }

  return response.ok({
    list: voList,
    total: countResult[0].total,
    pages: Math.ceil(countResult[0].total / limit),
    page,
    limit,
  })
}

// ==================== 可用优惠券（下单选择） ====================

async function selectlist(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const { cartId } = data

  // 获取购物车商品
  let cartList = []
  if (cartId == null || cartId === 0) {
    cartList = await db.query(
      `SELECT * FROM litemall_cart WHERE user_id = ? AND checked = 1 AND deleted = 0`,
      [userId]
    )
  } else {
    const rows = await db.query(
      `SELECT * FROM litemall_cart WHERE id = ? AND user_id = ? AND deleted = 0 LIMIT 1`,
      [cartId, userId]
    )
    if (rows.length === 0) return response.badArgumentValue()
    cartList = rows
  }

  // 计算购物车总价
  let checkedGoodsPrice = 0
  for (const c of cartList) {
    checkedGoodsPrice += parseFloat(c.price) * c.number
  }

  // 获取用户可用优惠券
  const couponUserRows = await db.query(
    `SELECT * FROM litemall_coupon_user WHERE user_id = ? AND status = ? AND deleted = 0`,
    [userId, USER_STATUS.USABLE]
  )

  // 批量查优惠券模板
  const couponIds = couponUserRows.map(r => r.coupon_id).filter(Boolean)
  const couponMap = {}
  if (couponIds.length > 0) {
    const couponRows = await db.query(
      `SELECT * FROM litemall_coupon WHERE id IN (${couponIds.map(() => '?').join(',')}) AND deleted = 0`,
      couponIds
    )
    for (const c of couponRows) {
      couponMap[c.id] = c
    }
  }

  const voList = []
  for (const cu of couponUserRows) {
    const coupon = couponMap[cu.coupon_id]
    if (!coupon) continue

    const available = await checkCouponAvailable(userId, coupon, cu, checkedGoodsPrice, cartList)

    voList.push({
      id: cu.id,
      cid: coupon.id,
      name: coupon.name,
      desc: coupon.desc,
      tag: coupon.tag,
      min: coupon.min,
      discount: coupon.discount,
      discountType: coupon.discount_type,
      itemLimit: coupon.item_limit,
      type: coupon.type,
      startTime: cu.start_time,
      endTime: cu.end_time,
      available,
    })
  }

  return response.ok(voList)
}

// ==================== 领取优惠券 ====================

async function receive(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const { couponId } = data
  if (!couponId) return response.badArgument()

  // 查优惠券
  const couponRows = await db.query(
    `SELECT * FROM litemall_coupon WHERE id = ? AND deleted = 0 LIMIT 1`,
    [couponId]
  )
  if (couponRows.length === 0) return response.badArgumentValue()

  const coupon = couponRows[0]

  // 库存检查
  if (coupon.total !== 0) {
    const countRows = await db.query(
      `SELECT COUNT(*) as total FROM litemall_coupon_user WHERE coupon_id = ? AND deleted = 0`,
      [couponId]
    )
    if (countRows[0].total >= coupon.total) {
      return response.fail(740, '优惠券已领完')
    }
  }

  // 领取次数限制
  if (coupon.limit !== 0 && coupon.limit > 0) {
    const countRows = await db.query(
      `SELECT COUNT(*) as total FROM litemall_coupon_user WHERE user_id = ? AND coupon_id = ? AND deleted = 0`,
      [userId, couponId]
    )
    if (countRows[0].total >= coupon.limit) {
      return response.fail(740, '优惠券已经领取过')
    }
  }

  // 类型校验
  if (coupon.type === TYPE.REGISTER) return response.fail(741, '新用户优惠券自动发送')
  if (coupon.type === TYPE.CODE) return response.fail(741, '优惠券只能兑换')
  if (coupon.type !== TYPE.COMMON) return response.fail(741, '优惠券类型不支持')

  // 状态校验
  if (coupon.status === STATUS.OUT) return response.fail(740, '优惠券已领完')
  if (coupon.status === STATUS.EXPIRED) return response.fail(741, '优惠券已经过期')

  // 创建用户优惠券
  await createUserCoupon(userId, coupon)

  return response.ok()
}

// ==================== 兑换优惠券 ====================

async function exchange(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const { code } = data
  if (!code) return response.badArgument()

  // 查优惠券
  const couponRows = await db.query(
    `SELECT * FROM litemall_coupon WHERE code = ? AND type = ? AND status = ? AND deleted = 0 LIMIT 1`,
    [code, TYPE.CODE, STATUS.NORMAL]
  )
  if (couponRows.length === 0) return response.fail(742, '优惠券不正确')

  const coupon = couponRows[0]

  // 库存检查
  if (coupon.total !== 0) {
    const countRows = await db.query(
      `SELECT COUNT(*) as total FROM litemall_coupon_user WHERE coupon_id = ? AND deleted = 0`,
      [coupon.id]
    )
    if (countRows[0].total >= coupon.total) {
      return response.fail(740, '优惠券已兑换')
    }
  }

  // 领取次数限制
  if (coupon.limit !== 0 && coupon.limit > 0) {
    const countRows = await db.query(
      `SELECT COUNT(*) as total FROM litemall_coupon_user WHERE user_id = ? AND coupon_id = ? AND deleted = 0`,
      [userId, coupon.id]
    )
    if (countRows[0].total >= coupon.limit) {
      return response.fail(740, '优惠券已兑换')
    }
  }

  // 类型校验
  if (coupon.type === TYPE.REGISTER) return response.fail(741, '新用户优惠券自动发送')
  if (coupon.type === TYPE.COMMON) return response.fail(741, '优惠券只能领取，不能兑换')
  if (coupon.type !== TYPE.CODE) return response.fail(741, '优惠券类型不支持')

  // 状态校验
  if (coupon.status === STATUS.OUT) return response.fail(740, '优惠券已兑换')
  if (coupon.status === STATUS.EXPIRED) return response.fail(741, '优惠券已经过期')

  // 创建用户优惠券
  await createUserCoupon(userId, coupon)

  return response.ok()
}

// ==================== 内部工具方法 ====================

/**
 * 创建用户优惠券记录
 */
async function createUserCoupon(userId, coupon) {
  let startTime, endTime
  const now = new Date()

  if (coupon.time_type === 1) {
    // 固定时间段
    startTime = coupon.start_time
    endTime = coupon.end_time
  } else {
    // 领取后 N 天
    startTime = now
    endTime = new Date(now.getTime() + (coupon.days || 30) * 24 * 60 * 60 * 1000)
  }

  await db.query(
    `INSERT INTO litemall_coupon_user
      (user_id, coupon_id, status, start_time, end_time, add_time, update_time, deleted)
     VALUES (?, ?, 0, ?, ?, NOW(), NOW(), 0)`,
    [userId, coupon.id, startTime, endTime]
  )
}

/**
 * 检查优惠券是否可用
 */
async function checkCouponAvailable(userId, coupon, couponUser, checkedGoodsPrice, cartList) {
  const now = new Date()

  // 时间有效性
  if (coupon.time_type === 1) {
    if (coupon.start_time && now < coupon.start_time) return false
    if (coupon.end_time && now > coupon.end_time) return false
  } else {
    const endTime = new Date(new Date(couponUser.add_time).getTime() + (coupon.days || 30) * 24 * 60 * 60 * 1000)
    if (now > endTime) return false
  }

  // 优惠券状态
  if (coupon.status !== STATUS.NORMAL) return false

  // 生日券校验
  if (coupon.type === TYPE.BIRTHDAY) {
    const userRows = await db.query(`SELECT birthday FROM litemall_user WHERE id = ? LIMIT 1`, [userId])
    const user = userRows[0]
    if (!user || !user.birthday) return false
    const birthday = new Date(user.birthday)
    const today = new Date()
    const thisYearBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate())
    const sevenDaysAfter = new Date(thisYearBirthday)
    sevenDaysAfter.setDate(sevenDaysAfter.getDate() + 6)
    if (today < thisYearBirthday || today > sevenDaysAfter) return false
  }

  // 商品类型限制
  if (coupon.goods_type === 1 || coupon.goods_type === 2) {
    // goods_value 是逗号分隔的 ID 列表
    const goodsValues = (coupon.goods_value || '').split(',').map(Number).filter(Boolean)
    if (goodsValues.length === 0) return false

    let matchPrice = 0
    for (const c of cartList) {
      const matchId = coupon.goods_type === 1 ? c.category_id : c.goods_id
      if (goodsValues.includes(matchId)) {
        matchPrice += parseFloat(c.price) * c.number
      }
    }
    if (matchPrice === 0) return false
    if (matchPrice < parseFloat(coupon.min)) return false
  }

  // 最低消费
  if (checkedGoodsPrice < parseFloat(coupon.min)) return false

  return true
}

module.exports = { list, mylist, selectlist, receive, exchange }
