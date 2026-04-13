/**
 * 过期优惠券处理
 *
 * 两部分：
 *   1. 优惠券模板（time_type=1 固定日期范围）end_time 过期 → status=1
 *   2. 用户优惠券 end_time 过期 → status=2
 * 移植自 Java CouponJob。
 */
const { query, execute } = require('layer-base').db

const BATCH_SIZE = 200

async function expireCoupon() {
  // 1. 过期优惠券模板
  const templates = await query(
    `SELECT id FROM litemall_coupon
     WHERE status = 0 AND time_type = 1 AND end_time < NOW() AND deleted = 0
     LIMIT ${BATCH_SIZE}`,
    []
  )
  let templateExpired = 0
  for (const tpl of templates) {
    try {
      await execute(
        `UPDATE litemall_coupon SET status = 1, update_time = NOW() WHERE id = ?`,
        [tpl.id]
      )
      templateExpired++
    } catch (err) {
      console.error(`[expire-coupon] 优惠券模板 ${tpl.id} 过期失败:`, err.message)
    }
  }

  // 2. 过期用户优惠券
  const userCoupons = await query(
    `SELECT id FROM litemall_coupon_user
     WHERE status = 0 AND end_time < NOW() AND deleted = 0
     LIMIT ${BATCH_SIZE}`,
    []
  )
  let userExpired = 0
  for (const uc of userCoupons) {
    try {
      await execute(
        `UPDATE litemall_coupon_user SET status = 2, update_time = NOW() WHERE id = ?`,
        [uc.id]
      )
      userExpired++
    } catch (err) {
      console.error(`[expire-coupon] 用户优惠券 ${uc.id} 过期失败:`, err.message)
    }
  }

  console.info(`[expire-coupon] 完成：模板 ${templateExpired} 张，用户券 ${userExpired} 张`)
  return { templateExpired, userExpired }
}

module.exports = expireCoupon
