/**
 * wx-auth 云函数 — 小程序商城端认证
 *
 * 迁移自 Java WxAuthController
 * 对应接口：login, loginByWeixin, loginByAccount, register, info, profile, logout
 *
 * 调用方式：
 *   wx.cloud.callFunction({
 *     name: 'wx-auth',
 *     data: { action: 'loginByWeixin', data: { nickName: '', avatarUrl: '', gender: 0 } }
 *   })
 */

const { db, response } = require('layer-base')
const { adminAuth } = require('layer-auth')

// ==================== OPENID 获取 ====================

/**
 * 从 CloudBase context 获取 OPENID（标准方式）
 */
function getOpenId(context) {
  // 方式1: context 直属字段
  if (context.OPENID) return context.OPENID
  if (context.openid) return context.openid

  // 方式2: context.WX_CONTEXT 字符串（部分版本）
  if (context.WX_CONTEXT) {
    try {
      const wxCtx = JSON.parse(context.WX_CONTEXT)
      if (wxCtx.OPENID) return wxCtx.OPENID
    } catch (e) {}
  }

  // 方式3: context.getWXContext() 方法
  if (typeof context.getWXContext === 'function') {
    try {
      const wx = context.getWXContext()
      if (wx && wx.OPENID) return wx.OPENID
    } catch (e) {}
  }

  // 方式4: CloudBase environ 对象（Event 函数常见）
  try {
    const env = context.environ || context.environment || {}
    if (env && env.OPENID) return env.OPENID
  } catch (e) {}

  return null
}

/**
 * 根据 OPENID 查找/创建用户
 */
async function ensureUser(openId) {
  let rows = await db.query(
    'SELECT * FROM litemall_user WHERE weixin_openid = ? AND deleted = 0 LIMIT 1',
    [openId]
  )
  if (rows.length > 0) return rows[0]

  // 首次使用，自动注册
  const now = new Date()
  await db.query(
    `INSERT INTO litemall_user
      (username, password, gender, birthday, last_login_time, last_login_ip,
       user_level, nickname, mobile, avatar, weixin_openid, session_key,
       status, add_time, update_time, deleted)
     VALUES (?, '', 0, null, ?, '', 0, '微信用户', '', '', ?, '', 0, ?, ?, 0)`,
    [
      `wx_${openId.slice(0, 16)}`,
      now, openId, now, now,
    ]
  )
  rows = await db.query(
    'SELECT * FROM litemall_user WHERE weixin_openid = ? LIMIT 1',
    [openId]
  )
  return rows[0] || null
}

/**
 * 认证中间件：获取 OPENID → 查/建用户 → 注入 ctx
 */
async function authenticate(event, context) {
  const openId = getOpenId(context)
  if (!openId) {
    console.log('[wx-auth] 无法获取 OPENID, context keys:', Object.keys(context).join(', '))
    return response.unlogin()
  }

  const user = await ensureUser(openId)
  if (!user) return response.serious()

  // 注入到 event 和 context
  event._userId = user.id
  event._openId = openId
  event._user = user
  context._userId = user.id
  context._user = user

  // 更新最后登录时间
  await db.query(
    'UPDATE litemall_user SET last_login_time = NOW() WHERE id = ?',
    [user.id]
  )

  return null // 认证通过
}

// ==================== 路由注册 ====================

const routes = {
  // 微信静默登录（小程序 onLaunch 调用）
  loginByWeixin: async (data, context) => {
    const userId = context._userId
    if (!userId) return response.unlogin()
    const user = context._user
    return response.ok({
      userId: userId,
      userInfo: {
        nickName: user.nickname,
        avatarUrl: user.avatar,
      },
    })
  },

  // 微信登录（云开发场景，OPENID 自动获取）
  login: async (data, context) => {
    const userId = context._userId
    if (!userId) return response.unlogin()
    const user = context._user
    return response.ok({
      userInfo: {
        nickName: user.nickname,
        avatarUrl: user.avatar,
      },
    })
  },

  // 账号密码登录
  loginByAccount: async (data, context) => {
    const { username, password } = data
    if (!username || !password) {
      return response.badArgument()
    }

    const rows = await db.query(
      'SELECT id, username, password, avatar, nickname, weixin_openid FROM litemall_user WHERE username = ? AND deleted = 0',
      [username]
    )

    if (rows.length === 0) {
      return response.fail(605, '账号不存在')
    }
    if (rows.length > 1) {
      return response.serious()
    }

    const user = rows[0]
    const bcrypt = require('bcryptjs')
    if (!bcrypt.compareSync(password, user.password)) {
      return response.fail(605, '账号密码不对')
    }

    // 绑定当前 OPENID 到该用户（打通账号登录与云函数认证）
    const openId = getOpenId(context)
    if (openId) {
      await db.query(
        'UPDATE litemall_user SET weixin_openid = ?, last_login_time = NOW() WHERE id = ?',
        [openId, user.id]
      )
    } else {
      await db.query(
        'UPDATE litemall_user SET last_login_time = NOW() WHERE id = ?',
        [user.id]
      )
    }

    return response.ok({
      userId: user.id,
      userInfo: {
        nickName: user.nickname,
        avatarUrl: user.avatar,
        gender: user.gender,
        mobile: user.mobile,
      },
    })
  },

  // 获取用户信息
  info: async (data, context) => {
    const userId = context._userId
    if (!userId) return response.unlogin()

    const rows = await db.query(
      'SELECT nickname, avatar, gender, mobile FROM litemall_user WHERE id = ? AND deleted = 0',
      [userId]
    )
    if (rows.length === 0) return response.unlogin()

    const user = rows[0]
    return response.ok({
      nickName: user.nickname,
      avatar: user.avatar,
      gender: user.gender,
      mobile: user.mobile,
    })
  },

  // 更新用户信息
  profile: async (data, context) => {
    const userId = context._userId
    if (!userId) return response.unlogin()

    const { avatar, gender, nickname } = data
    const updates = []
    const params = []

    if (avatar !== undefined) { updates.push('avatar = ?'); params.push(avatar) }
    if (gender !== undefined) { updates.push('gender = ?'); params.push(gender) }
    if (nickname !== undefined) { updates.push('nickname = ?'); params.push(nickname) }

    if (updates.length === 0) return response.badArgument()

    params.push(userId)
    const result = await db.query(
      `UPDATE litemall_user SET ${updates.join(', ')} WHERE id = ?`,
      params
    )

    if (result.affectedRows === 0) return response.updatedDataFailed()
    return response.ok()
  },

  // 退出登录
  logout: async (data, context) => {
    const userId = context._userId
    if (!userId) return response.unlogin()
    return response.ok()
  },

  // 手动绑定手机号
  bindPhoneManual: async (data, context) => {
    const userId = context._userId
    if (!userId) return response.unlogin()

    const { mobile } = data
    if (!mobile || !/^1[3-9]\d{9}$/.test(mobile)) {
      return response.badArgument()
    }

    const result = await db.query(
      'UPDATE litemall_user SET mobile = ?, update_time = NOW() WHERE id = ? AND deleted = 0',
      [mobile, userId]
    )
    if (result.affectedRows === 0) return response.updatedDataFailed()
    return response.ok()
  },

  // 微信一键绑定手机号（CloudBase 模式）
  bindPhone: async (data, context) => {
    const userId = context._userId
    if (!userId) return response.unlogin()

    // CloudBase 模式：尝试通过 cloudID 获取手机号
    const cloudID = data.cloudID
    if (cloudID) {
      try {
        const openData = await cloud.getOpenData({ list: [cloudID] })
        const phoneData = openData.list[0]
        if (phoneData && phoneData.data && phoneData.data.phoneNumber) {
          const mobile = phoneData.data.phoneNumber
          await db.query(
            'UPDATE litemall_user SET mobile = ?, update_time = NOW() WHERE id = ? AND deleted = 0',
            [mobile, userId]
          )
          return response.ok()
        }
      } catch (e) {
        console.error('[wx-auth] bindPhone cloudID error:', e)
      }
    }

    // 回退：直接从 data 中取手机号（适配前端传入 encryptedData/iv 的老模式）
    // CloudBase 无法直接解密 encryptedData，建议用户使用手动绑定
    return response.fail(601, '请使用手动输入手机号绑定')
  },
}

// ==================== 入口 ====================

exports.main = async (event, context) => {
  // CloudBase 将 OPENID 放在 event.userInfo.openId，注入到 context
  const openId = (event.userInfo && event.userInfo.openId) || null
  if (openId && !context.OPENID) {
    context.OPENID = openId
  }

  const { action, data } = event

  // 需要微信认证的接口
  const authActions = ['login', 'loginByWeixin', 'info', 'profile', 'logout', 'bindPhoneManual', 'bindPhone']
  if (authActions.includes(action)) {
    const authResult = await authenticate(event, context)
    if (authResult) return authResult
  }

  const handler = routes[action]
  if (!handler) {
    return response.fail(404, `未知接口: ${action}`)
  }

  try {
    return await handler(data || {}, context)
  } catch (err) {
    console.error(`[wx-auth] action=${action} error:`, err)
    return response.serious()
  }
}
