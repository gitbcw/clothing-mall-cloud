/**
 * 意见反馈接口
 *
 * 迁移自 WxFeedbackController
 * 接口：submit
 */

const { db, response } = require('layer-base')

// ==================== 提交反馈 ====================

async function submit(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const { content, feedType, mobile, hasPicture, picUrls } = data

  if (!content || !feedType || !mobile) return response.badArgument()

  // 手机号简单验证
  if (!/^1[3-9]\d{9}$/.test(mobile)) return response.badArgument()

  // 查询用户名
  const userRows = await db.query(
    `SELECT username FROM litemall_user WHERE id = ? AND deleted = 0 LIMIT 1`,
    [userId]
  )
  const username = userRows.length > 0 ? userRows[0].username : ''

  const pictures = (hasPicture && picUrls && picUrls.length > 0)
    ? JSON.stringify(picUrls)
    : '[]'

  await db.query(
    `INSERT INTO litemall_feedback
      (user_id, username, mobile, feed_type, content, status, has_picture, pic_urls, add_time, update_time, deleted)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?, NOW(), NOW(), 0)`,
    [userId, username, mobile, feedType, content,
     hasPicture ? 1 : 0, pictures]
  )

  return response.ok()
}

module.exports = { submit }
