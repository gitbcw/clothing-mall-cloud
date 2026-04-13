/**
 * admin-wework/service/wework.js — 企业微信管理
 */
const { db, response } = require('layer-base')
const { query, execute } = db
const { sendMiniProgramCardByTag, getCorpTagList } = require('layer-wechat')

// 企微标签
async function tags() {
  try {
    const tagList = await getCorpTagList()
    return response.ok(tagList || [])
  } catch (err) {
    console.error('[admin-wework] tags error:', err)
    return response.ok([])
  }
}

// 小程序页面列表
async function pages() {
  const defaultPages = [
    { path: '/pages/index/index', name: '首页' },
    { path: '/pages/catalog/catalog', name: '商品分类' },
    { path: '/pages/newGoods/newGoods', name: '新品推荐' },
    { path: '/pages/hotGoods/hotGoods', name: '热门商品' },
    { path: '/pages/ucenter/index/index', name: '个人中心' },
    { path: '/pages/coupon/coupon', name: '优惠券中心' },
  ]

  try {
    const configRows = await query("SELECT config_value FROM litemall_system WHERE config_key = ? AND deleted = 0", ['litemall_wework_activity_pages'])
    if (configRows.length > 0 && configRows[0].config_value) {
      const activityPages = JSON.parse(configRows[0].config_value)
      return response.ok([...defaultPages, ...activityPages])
    }
  } catch (e) { /* ignore */ }

  return response.ok(defaultPages)
}

// 上传素材（占位，需前端配合）
async function uploadMedia(data) {
  return response.fail(702, '请使用前端上传接口')
}

// 发送小程序卡片
async function sendCard(data) {
  const { tagId, title, mediaId, page } = data
  if (!tagId) return response.fail(402, '请选择要发送的客户标签')
  if (!title) return response.fail(402, '请输入卡片标题')
  if (!mediaId) return response.fail(402, '请上传封面图片')
  if (!page) return response.fail(402, '请选择跳转页面')

  const success = await sendMiniProgramCardByTag(tagId, title, mediaId, page)
  if (!success) {
    return response.fail(500, '创建群发任务失败，请检查企业微信配置')
  }

  return response.ok('群发任务已创建，请在企业微信手机端确认发送')
}

// 推送组列表
async function pushGroups() {
  const rows = await query('SELECT id, name, type, member_count FROM litemall_push_group WHERE deleted = 0 ORDER BY id ASC')
  return response.okList(rows, rows.length, 1, rows.length)
}

// 发送消息
async function sendMessage(data) {
  const { targetType, contentType, title, mediaId, page, content, scheduledAt } = data
  if (!targetType || !contentType) return response.badArgument()

  let totalMemberCount = 0
  let pushStatus = 'sent'

  if (scheduledAt) {
    pushStatus = 'pending'
  }

  const result = await execute(
    'INSERT INTO litemall_push_log (target_type, content_type, title, media_id, page_path, content, scheduled_at, status, total_member_count, add_time, update_time, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)',
    [targetType, contentType, title || '', mediaId || '', page || '', content || '', scheduledAt || null, pushStatus, totalMemberCount]
  )

  return response.ok({ id: result.insertId })
}

module.exports = { tags, pages, uploadMedia, sendCard, pushGroups, sendMessage }
