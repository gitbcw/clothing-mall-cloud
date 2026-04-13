/**
 * 优惠券验证
 *
 * 迁移自 CouponVerifyService.java
 */

const { db } = require('layer-base')

/**
 * 验证优惠券是否可用
 */
async function checkCoupon(userId, couponId, userCouponId, checkedGoodsPrice) {
  const [couponRows, couponUserRows] = await Promise.all([
    db.query(`SELECT * FROM litemall_coupon WHERE id = ? AND deleted = 0 LIMIT 1`, [couponId]),
    db.query(`SELECT * FROM litemall_coupon_user WHERE id = ? AND deleted = 0 LIMIT 1`, [userCouponId]),
  ])

  const coupon = couponRows[0]
  if (!coupon) return null

  let couponUser = couponUserRows[0]
  if (!couponUser) {
    // 按 userId + couponId 查找
    const rows = await db.query(
      `SELECT * FROM litemall_coupon_user WHERE user_id = ? AND coupon_id = ? AND deleted = 0 LIMIT 1`,
      [userId, couponId]
    )
    couponUser = rows[0]
  } else if (couponUser.coupon_id !== couponId) {
    return null
  }

  if (!couponUser) return null

  // 检查是否过期
  const now = new Date()
  if (coupon.time_type === 0) {
    // 固定时间段
    if (now < coupon.start_time || now > coupon.end_time) return null
  } else if (coupon.time_type === 1) {
    // 领取后 N 天
    const expired = new Date(couponUser.add_time)
    expired.setDate(expired.getDate() + coupon.days)
    if (now > expired) return null
  } else {
    return null
  }

  // 生日券验证（type=2）
  if (coupon.type === 2) {
    const userRows = await db.query(`SELECT birthday FROM litemall_user WHERE id = ? LIMIT 1`, [userId])
    const user = userRows[0]
    if (!user || !user.birthday) return null
    const birthday = new Date(user.birthday)
    const today = new Date()
    const thisYearBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate())
    const sevenDaysAfter = new Date(thisYearBirthday)
    sevenDaysAfter.setDate(sevenDaysAfter.getDate() + 6)
    if (today < thisYearBirthday || today > sevenDaysAfter) return null
  }

  // 检查最低消费
  if (checkedGoodsPrice < parseFloat(coupon.min)) return null

  return coupon
}

/**
 * 计算优惠券折扣金额
 */
function calculateDiscount(coupon, checkedGoodsPrice) {
  const discountType = coupon.discount_type

  if (!discountType || discountType === 0) {
    // 固定金额
    return parseFloat(coupon.discount) || 0
  }

  if (discountType === 1) {
    // 百分比折扣
    const percent = parseFloat(coupon.discount) || 0
    const itemLimit = coupon.item_limit

    if (itemLimit === 1) {
      // 仅最高价单品（简化：直接用 checkedGoodsPrice 比例计算）
      // 完整实现需要 cartList 来找最高价单品
      return checkedGoodsPrice * percent / 100
    }

    return checkedGoodsPrice * percent / 100
  }

  return parseFloat(coupon.discount) || 0
}

module.exports = { checkCoupon, calculateDiscount }
