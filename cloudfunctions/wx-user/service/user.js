/**
 * 用户信息接口
 *
 * 迁移自 WxUserController
 * 接口：index, info, profile, role, isManager
 */

const { db, response } = require('layer-base')
const { getConfig } = require('layer-base').systemConfig

// 订单状态常量
const STATUS = {
  CREATE: 101,
  PAY: 201,
  SHIP: 301,
  VERIFY_PENDING: 501,
}

// ==================== 用户首页订单统计 ====================

async function index(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const [unpaidRows, unshipRows, unrecvRows] = await Promise.all([
    db.query(
      `SELECT COUNT(*) as total FROM litemall_order WHERE user_id = ? AND order_status = ? AND deleted = 0`,
      [userId, STATUS.CREATE]
    ),
    db.query(
      `SELECT COUNT(*) as total FROM litemall_order WHERE user_id = ? AND order_status = ? AND deleted = 0`,
      [userId, STATUS.PAY]
    ),
    db.query(
      `SELECT COUNT(*) as total FROM litemall_order WHERE user_id = ? AND order_status IN (?, ?) AND deleted = 0`,
      [userId, STATUS.SHIP, STATUS.VERIFY_PENDING]
    ),
  ])

  return response.ok({
    order: {
      unpaid: unpaidRows[0].total,
      unship: unshipRows[0].total,
      unrecv: unrecvRows[0].total,
    },
  })
}

// ==================== 用户信息 ====================

async function info(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const rows = await db.query(
    `SELECT id, nickname, avatar, mobile, birthday, gender, role, store_id, guide_id
     FROM litemall_user WHERE id = ? AND deleted = 0 LIMIT 1`,
    [userId]
  )
  if (rows.length === 0) return response.badArgumentValue()

  const user = rows[0]
  return response.ok({
    id: user.id,
    nickname: user.nickname,
    avatar: user.avatar,
    mobile: user.mobile,
    birthday: user.birthday,
    gender: user.gender,
    role: user.role,
    storeId: user.store_id,
    guideId: user.guide_id,
  })
}

// ==================== 更新用户资料 ====================

async function profile(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const { nickname, avatar, birthday } = data

  // 查询当前用户
  const userRows = await db.query(
    `SELECT * FROM litemall_user WHERE id = ? AND deleted = 0 LIMIT 1`,
    [userId]
  )
  if (userRows.length === 0) return response.badArgumentValue()
  const user = userRows[0]

  // 构建更新字段
  const fields = []
  const params = []

  if (nickname != null) {
    fields.push('nickname = ?')
    params.push(nickname)
  }
  if (avatar != null) {
    fields.push('avatar = ?')
    params.push(avatar)
  }
  if (birthday != null) {
    fields.push('birthday = ?')
    params.push(birthday)
  }

  if (fields.length === 0) return response.ok()

  // 生日首填检测
  let couponResult = null
  if (birthday && !user.birthday) {
    const birthdayCouponEnabled = getConfig('litemall_birthday_coupon_status')
    if (birthdayCouponEnabled === 'true' || birthdayCouponEnabled === '1') {
      const couponId = parseInt(getConfig('litemall_birthday_coupon_id'))
      const days = parseInt(getConfig('litemall_birthday_coupon_days')) || 30

      if (couponId) {
        // 检查是否已有该生日券
        const existRows = await db.query(
          `SELECT id FROM litemall_coupon_user WHERE user_id = ? AND coupon_id = ? AND deleted = 0 LIMIT 1`,
          [userId, couponId]
        )
        if (existRows.length === 0) {
          // 发放生日券
          await db.query(
            `INSERT INTO litemall_coupon_user (user_id, coupon_id, status, start_time, end_time, add_time, update_time, deleted)
             VALUES (?, ?, 0, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), NOW(), NOW(), 0)`,
            [userId, couponId, days]
          )
          // 查询券信息返回
          const couponRows = await db.query(
            `SELECT id, name, discount, discount_type, description FROM litemall_coupon WHERE id = ? AND deleted = 0 LIMIT 1`,
            [couponId]
          )
          if (couponRows.length > 0) {
            couponResult = {
              name: couponRows[0].name,
              discount: couponRows[0].discount,
              discountType: couponRows[0].discount_type,
              desc: couponRows[0].description,
              tag: '生日',
            }
          }
        }
      }
    }
  }

  fields.push('update_time = NOW()')
  params.push(userId)

  await db.query(
    `UPDATE litemall_user SET ${fields.join(', ')} WHERE id = ?`,
    params
  )

  if (couponResult) {
    return response.ok({ coupon: couponResult })
  }
  return response.ok()
}

// ==================== 用户角色 ====================

async function role(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const rows = await db.query(
    `SELECT role FROM litemall_user WHERE id = ? AND deleted = 0 LIMIT 1`,
    [userId]
  )
  if (rows.length === 0) return response.badArgumentValue()

  const role = rows[0].role || 'user'

  return response.ok({
    role,
    isOwner: role === 'owner',
    isGuide: role === 'guide',
    isManager: role === 'owner' || role === 'guide',
  })
}

// ==================== 是否管理员 ====================

async function isManager(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const rows = await db.query(
    `SELECT role FROM litemall_user WHERE id = ? AND deleted = 0 LIMIT 1`,
    [userId]
  )
  if (rows.length === 0) return response.badArgumentValue()

  const role = rows[0].role || 'user'
  const isManager = role === 'owner' || role === 'guide'

  return response.ok({ isManager, role })
}

module.exports = { index, info, profile, role, isManager }
