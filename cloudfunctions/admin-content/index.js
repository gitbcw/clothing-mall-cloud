/**
 * admin-content 云函数入口
 *
 * 内容管理：ad/topic/notice/feedback/issue/keyword
 */

const { response } = require('layer-base')
const { adminAuth } = require('layer-auth')

const { list: adList, create: adCreate, read: adRead, update: adUpdate, delete: adDelete } = require('./service/ad')
const { list: topicList, read: topicRead, create: topicCreate, update: topicUpdate, delete: topicDelete, batchDelete: topicBatchDelete } = require('./service/topic')
const { list: noticeList, read: noticeRead, create: noticeCreate, update: noticeUpdate, delete: noticeDelete, batchDelete: noticeBatchDelete } = require('./service/notice')
const { list: feedbackList } = require('./service/feedback')
const { list: issueList, create: issueCreate, read: issueRead, update: issueUpdate, delete: issueDelete } = require('./service/issue')
const { list: keywordList, create: keywordCreate, read: keywordRead, update: keywordUpdate, delete: keywordDelete } = require('./service/keyword')

const { query } = require('layer-base').db
async function checkPermission(admin, permission) {
  if (!admin || !admin.roleIds || admin.roleIds.length === 0) return false
  if (admin.roleIds.includes(1)) return true
  const placeholders = admin.roleIds.map(() => '?').join(',')
  const rows = await query(
    `SELECT id FROM litemall_permission WHERE role_id IN (${placeholders}) AND permission = ? AND deleted = 0`,
    [...admin.roleIds, permission]
  )
  return rows.length > 0
}

const routes = {
  // 广告
  adList:   { handler: adList,   permission: 'admin:ad:list' },
  adCreate: { handler: adCreate, permission: 'admin:ad:create' },
  adRead:   { handler: adRead,   permission: 'admin:ad:read' },
  adUpdate: { handler: adUpdate, permission: 'admin:ad:update' },
  adDelete: { handler: adDelete, permission: 'admin:ad:delete' },

  // 专题
  topicList:        { handler: topicList,        permission: 'admin:topic:list' },
  topicRead:        { handler: topicRead,        permission: 'admin:topic:read' },
  topicCreate:      { handler: topicCreate,      permission: 'admin:topic:create' },
  topicUpdate:      { handler: topicUpdate,      permission: 'admin:topic:update' },
  topicDelete:      { handler: topicDelete,      permission: 'admin:topic:delete' },
  topicBatchDelete: { handler: topicBatchDelete, permission: 'admin:topic:batch-delete' },

  // 通知
  noticeList:        { handler: noticeList,        permission: 'admin:notice:list' },
  noticeRead:        { handler: noticeRead,        permission: 'admin:notice:read' },
  noticeCreate:      { handler: noticeCreate,      permission: 'admin:notice:create' },
  noticeUpdate:      { handler: noticeUpdate,      permission: 'admin:notice:update' },
  noticeDelete:      { handler: noticeDelete,      permission: 'admin:notice:delete' },
  noticeBatchDelete: { handler: noticeBatchDelete, permission: 'admin:notice:batch-delete' },

  // 反馈
  feedbackList: { handler: feedbackList, permission: 'admin:feedback:list' },

  // 问题
  issueList:   { handler: issueList,   permission: 'admin:issue:list' },
  issueCreate: { handler: issueCreate, permission: 'admin:issue:create' },
  issueRead:   { handler: issueRead,   permission: 'admin:issue:read' },
  issueUpdate: { handler: issueUpdate, permission: 'admin:issue:update' },
  issueDelete: { handler: issueDelete, permission: 'admin:issue:delete' },

  // 关键词
  keywordList:   { handler: keywordList,   permission: 'admin:keyword:list' },
  keywordCreate: { handler: keywordCreate, permission: 'admin:keyword:create' },
  keywordRead:   { handler: keywordRead,   permission: 'admin:keyword:read' },
  keywordUpdate: { handler: keywordUpdate, permission: 'admin:keyword:update' },
  keywordDelete: { handler: keywordDelete, permission: 'admin:keyword:delete' },
}

exports.main = async (event, context) => {
  const { action, data } = event
  const route = routes[action]
  if (!route) return response.fail(404, `未知接口: ${action}`)

  const authResult = await adminAuth.adminAuthMiddleware(event)
  if (authResult) return authResult

  if (route.permission) {
    const has = await checkPermission(event._admin, route.permission)
    if (!has) return response.unauthz()
  }

  context._adminId = event._adminId
  context._admin = event._admin

  try {
    return await route.handler(data || {}, context)
  } catch (err) {
    console.error(`[admin-content] action=${action} error:`, err)
    return response.serious()
  }
}
