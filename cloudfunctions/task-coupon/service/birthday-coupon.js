/**
 * 生日券发放
 *
 * 每日检查当天生日的用户，为未领取本年度生日券的用户自动发放。
 * 移植自 Java BirthdayCouponJob。
 */
const { query, execute } = require('layer-base').db
const { systemConfig } = require('layer-base')

async function birthdayCoupon() {
  await systemConfig.loadConfigs()

  // 1. 检查功能开关
  const enabled = systemConfig.getConfigBool(systemConfig.CONFIG_KEYS.BIRTHDAY_COUPON_STATUS, false)
  if (!enabled) {
    console.info('[birthday-coupon] 生日券功能未启用')
    return { issued: 0, reason: 'disabled' }
  }

  // 2. 读取配置
  const couponId = systemConfig.getConfigInt(systemConfig.CONFIG_KEYS.BIRTHDAY_COUPON_ID, 0)
  const validDays = systemConfig.getConfigInt(systemConfig.CONFIG_KEYS.BIRTHDAY_COUPON_DAYS, 30)

  if (!couponId) {
    console.warn('[birthday-coupon] 未配置生日券模板 ID')
    return { issued: 0, reason: 'no_coupon_id' }
  }

  // 3. 验证优惠券模板存在且未过期
  const templates = await query(
    `SELECT id, status FROM litemall_coupon WHERE id = ? AND deleted = 0`,
    [couponId]
  )
  if (!templates.length) {
    console.warn('[birthday-coupon] 优惠券模板不存在:', couponId)
    return { issued: 0, reason: 'template_not_found' }
  }
  if (templates[0].status === 1) {
    console.warn('[birthday-coupon] 优惠券模板已过期:', couponId)
    return { issued: 0, reason: 'template_expired' }
  }

  // 4. 查询当天生日的用户
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const year = now.getFullYear()

  const users = await query(
    `SELECT id, username, birthday FROM litemall_user WHERE deleted = 0 AND MONTH(birthday) = ? AND DAY(birthday) = ?`,
    [month, day]
  )

  if (!users.length) {
    console.info('[birthday-coupon] 今天没有过生日的用户')
    return { issued: 0, reason: 'no_birthday_today' }
  }

  // 5. 逐用户发放
  const yearStart = `${year}-01-01 00:00:00`
  const yearEnd = `${year}-12-31 23:59:59`
  let issued = 0

  for (const user of users) {
    try {
      // 检查是否已领取本年度
      const existing = await query(
        `SELECT id FROM litemall_coupon_user
         WHERE user_id = ? AND coupon_id = ?
           AND add_time >= ? AND add_time < ?
           AND deleted = 0
         LIMIT 1`,
        [user.id, couponId, yearStart, yearEnd]
      )
      if (existing.length > 0) continue

      // 发放
      await execute(
        `INSERT INTO litemall_coupon_user
         (coupon_id, user_id, status, start_time, end_time, add_time, update_time)
         VALUES (?, ?, 0, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), NOW(), NOW())`,
        [couponId, user.id, validDays]
      )
      issued++
      console.info(`[birthday-coupon] 用户 ${user.username}(${user.id}) 生日券已发放`)
    } catch (err) {
      console.error(`[birthday-coupon] 用户 ${user.id} 发放失败:`, err.message)
    }
  }

  console.info(`[birthday-coupon] 完成：生日用户 ${users.length} 人，发放 ${issued} 张`)
  return { birthdayUsers: users.length, issued }
}

module.exports = birthdayCoupon
