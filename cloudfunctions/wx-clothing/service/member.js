/**
 * 服装会员接口
 *
 * 迁移自 WxClothingUserController
 * 接口：info, bindGuide
 */

const { db, response } = require('layer-base')

// ==================== 会员信息 ====================

async function memberInfo(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const rows = await db.query(
    `SELECT nickname, avatar, mobile, total_points, available_points, guide_id, store_id
     FROM litemall_user WHERE id = ? AND deleted = 0 LIMIT 1`,
    [userId]
  )
  if (rows.length === 0) return response.badArgumentValue()

  const user = rows[0]
  return response.ok({
    nickname: user.nickname,
    avatar: user.avatar,
    mobile: user.mobile,
    totalPoints: user.total_points,
    availablePoints: user.available_points,
    guideId: user.guide_id,
    storeId: user.store_id,
  })
}

// ==================== 绑定导购 ====================

async function memberBindGuide(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const { guideId } = data
  if (!guideId) return response.badArgument()

  // 验证导购存在
  const guideRows = await db.query(
    `SELECT id, role FROM litemall_user WHERE id = ? AND deleted = 0 LIMIT 1`,
    [guideId]
  )
  if (guideRows.length === 0) return response.badArgumentValue()
  if (guideRows[0].role !== 'guide') return response.fail(700, '该用户不是导购')

  await db.query(
    `UPDATE litemall_user SET guide_id = ?, update_time = NOW() WHERE id = ?`,
    [guideId, userId]
  )

  return response.ok()
}

module.exports = { memberInfo, memberBindGuide }
