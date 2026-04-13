/**
 * 小程序用户认证 — OPENID → userId 映射
 *
 * 迁移自 Java WxAuthController + UserTokenManager
 *
 * 原流程：wx.login() → code → POST /wx/auth/login_by_weixin → Java 获取 openid → 返回 JWT
 * 新流程：wx.cloud.callFunction() → cloud.getWXContext() 直接拿到 OPENID → 查/建 litemall_user
 */

const { query } = require('layer-base').db
const response = require('layer-base').response

/**
 * 从云函数 context 中提取 OPENID
 */
function getOpenId(context) {
  try {
    const wxContext = context || {}

    // 方式1: CloudBase Event 函数 context.OPENID
    if (wxContext.OPENID) return wxContext.OPENID
    if (wxContext.openid) return wxContext.openid

    // 方式2: wx-server-sdk 的 getWXContext() 挂在 context 上
    if (typeof wxContext.getWXContext === 'function') {
      const wx = wxContext.getWXContext()
      if (wx && wx.OPENID) return wx.OPENID
    }

    // 方式3: TCB 环境变量
    const env = wxContext.environ || wxContext.env || {}
    if (env.OPENID) return env.OPENID

    // 调试：打印 context 结构帮助排查
    console.log('[wx-auth] getOpenId failed, context keys:', Object.keys(wxContext))
    if (wxContext.WX_CONTEXT) console.log('[wx-auth] WX_CONTEXT:', JSON.stringify(wxContext.WX_CONTEXT).slice(0, 200))

    return null
  } catch (e) {
    console.error('[wx-auth] getOpenId error:', e)
    return null
  }
}

/**
 * 根据 OPENID 查找用户
 * @returns {object|null} litemall_user 记录
 */
async function getUserByOpenId(openId) {
  if (!openId) return null
  const rows = await query(
    'SELECT * FROM litemall_user WHERE weixin_openid = ? LIMIT 1',
    [openId]
  )
  return rows[0] || null
}

/**
 * 创建用户（首次使用）
 */
async function createUser(openId, extra = {}) {
  const now = new Date()
  const nickname = extra.nickname || '微信用户'
  const avatar = extra.avatar || ''

  const result = await query(
    `INSERT INTO litemall_user
      (username, password, gender, birthday, last_login_time, last_login_ip,
       user_level, nickname, mobile, avatar, weixin_openid, session_key,
       status, add_time, update_time, deleted)
     VALUES (?, '', 0, null, ?, '', 0, ?, '', ?, ?, '', 0, ?, ?, 0)`,
    [
      `wx_${openId.slice(0, 16)}`,
      now,
      nickname,
      avatar,
      openId,
      now,
      now,
    ]
  )
  return { id: result.insertId, openId }
}

/**
 * 认证中间件：确保用户已登录，将 userId 注入 event._userId
 *
 * 用法：
 *   exports.main = async (event, context) => {
 *     const authResult = await wxAuthMiddleware(event, context)
 *     if (authResult) return authResult  // 未登录，直接返回错误
 *     const userId = event._userId       // 已登录
 *     ...
 *   }
 */
async function wxAuthMiddleware(event, context) {
  // CloudBase 将 OPENID 放在 event.userInfo.openId，注入到 context
  const eventOpenId = (event && event.userInfo && event.userInfo.openId) || null
  if (eventOpenId && !context.OPENID) {
    context.OPENID = eventOpenId
  }

  const openId = getOpenId(context)
  if (!openId) {
    return response.unlogin()
  }

  let user = await getUserByOpenId(openId)
  if (!user) {
    // 首次使用，自动注册
    const created = await createUser(openId)
    user = await getUserByOpenId(openId)
    if (!user) {
      return response.serious()
    }
  }

  // 检查用户状态
  if (user.deleted) {
    return response.fail(501, '用户已注销')
  }

  // 注入 userId 到 event，后续 handler 可直接使用
  event._userId = user.id
  event._openId = openId
  event._user = user

  // 更新最后登录时间
  await query(
    'UPDATE litemall_user SET last_login_time = NOW() WHERE id = ?',
    [user.id]
  )

  return null // null 表示认证通过
}

module.exports = {
  getOpenId,
  getUserByOpenId,
  createUser,
  wxAuthMiddleware,
}
