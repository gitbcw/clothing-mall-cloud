/**
 * 企业微信客户消息推送服务
 *
 * 移植自 Java WeWorkService
 * 使用 Node.js 内置 fetch（Node 18+），无额外依赖。
 *
 * 配置来源：layer-base 的 systemConfig（litemall_system_config 表）
 */

const systemConfig = require('layer-base').systemConfig

// Token 缓存
let cachedAccessToken = null
let tokenExpireTime = 0

/**
 * 获取 access_token（带缓存，约 2 小时有效期）
 */
async function getAccessToken() {
  const corpId = systemConfig.getConfig(systemConfig.CONFIG_KEYS.WEWORK_CORP_ID)
  const secret = systemConfig.getConfig(systemConfig.CONFIG_KEYS.WEWORK_CONTACT_SECRET)

  if (!corpId || !secret) {
    console.warn('企业微信配置缺失：corpId 或 secret')
    return null
  }

  if (cachedAccessToken && tokenExpireTime > Date.now() / 1000) {
    return cachedAccessToken
  }

  const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpId}&corpsecret=${secret}`
  try {
    const resp = await fetch(url)
    const result = await resp.json()
    if (result.errcode === 0) {
      cachedAccessToken = result.access_token
      tokenExpireTime = Date.now() / 1000 + 7000
      console.info('获取企微 access_token 成功')
      return cachedAccessToken
    }
    console.error('获取企微 access_token 失败:', result)
  } catch (e) {
    console.error('获取企微 access_token 异常:', e)
  }
  return null
}

/**
 * 发送订单发货通知
 */
async function sendShipNotification(externalUserId, orderSn, shipChannel, shipSn) {
  const accessToken = await getAccessToken()
  if (!accessToken) return false

  const sender = systemConfig.getConfig(systemConfig.CONFIG_KEYS.WEWORK_SENDER_ID)
  if (!sender) {
    console.warn('企微推送失败：未配置发送者账号')
    return false
  }

  return postMessageTemplate(accessToken, {
    chat_type: 'single',
    external_userid: [externalUserId],
    sender,
    text: { content: `您好，您的订单 ${orderSn} 已发货！\n快递公司：${shipChannel}\n快递单号：${shipSn}` },
  })
}

/**
 * 按标签群发活动消息
 */
async function sendPromotionByTag(tagId, content) {
  const accessToken = await getAccessToken()
  if (!accessToken) return false

  const sender = systemConfig.getConfig(systemConfig.CONFIG_KEYS.WEWORK_SENDER_ID)
  if (!sender) return false

  return postMessageTemplate(accessToken, {
    chat_type: 'single',
    sender,
    filter: { tag_list: [tagId] },
    text: { content },
  })
}

/**
 * 发送生日祝福
 */
async function sendBirthdayGreeting(externalUserId, userName) {
  const accessToken = await getAccessToken()
  if (!accessToken) return false

  const sender = systemConfig.getConfig(systemConfig.CONFIG_KEYS.WEWORK_SENDER_ID)
  if (!sender) return false

  return postMessageTemplate(accessToken, {
    chat_type: 'single',
    external_userid: [externalUserId],
    sender,
    text: { content: `亲爱的 ${userName}，祝您生日快乐！专属生日优惠券已发放到您的账户，快来选购心仪的商品吧！` },
  })
}

/**
 * 发送小程序卡片（单发）
 */
async function sendMiniProgramCard(externalUserId, title, mediaId, page, appid) {
  const accessToken = await getAccessToken()
  if (!accessToken) return false

  const sender = systemConfig.getConfig(systemConfig.CONFIG_KEYS.WEWORK_SENDER_ID)
  if (!sender) return false

  const effectiveAppId = appid || systemConfig.getConfig(systemConfig.CONFIG_KEYS.WEWORK_MINIPROGRAM_APPID)
  if (!effectiveAppId) {
    console.warn('企微小程序卡片推送失败：未配置小程序 AppID')
    return false
  }

  return postMessageTemplate(accessToken, {
    chat_type: 'single',
    external_userid: [externalUserId],
    sender,
    miniprogram: { title, thumb_media_id: mediaId, appid: effectiveAppId, page },
  })
}

/**
 * 按标签群发小程序卡片
 */
async function sendMiniProgramCardByTag(tagId, title, mediaId, page, appid) {
  const accessToken = await getAccessToken()
  if (!accessToken) return false

  const sender = systemConfig.getConfig(systemConfig.CONFIG_KEYS.WEWORK_SENDER_ID)
  if (!sender) return false

  const effectiveAppId = appid || systemConfig.getConfig(systemConfig.CONFIG_KEYS.WEWORK_MINIPROGRAM_APPID)
  if (!effectiveAppId) return false

  return postMessageTemplate(accessToken, {
    chat_type: 'single',
    sender,
    filter: { tag_list: [tagId] },
    miniprogram: { title, thumb_media_id: mediaId, appid: effectiveAppId, page },
  })
}

/**
 * 获取企业客户标签列表
 */
async function getCorpTagList() {
  const accessToken = await getAccessToken()
  if (!accessToken) return null

  const url = `https://qyapi.weixin.qq.com/cgi-bin/externalcontact/get_corp_tag_list?access_token=${accessToken}`
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_id: [] }),
    })
    const result = await resp.json()
    if (result.errcode === 0 && result.tag_group) {
      const allTags = []
      for (const group of result.tag_group) {
        const groupName = group.name
        if (group.tag) {
          for (const tag of group.tag) {
            allTags.push({ id: tag.id, name: tag.name, groupName })
          }
        }
      }
      console.info(`获取企微标签列表成功，共 ${allTags.length} 个标签`)
      return allTags
    }
    console.error('获取企微标签列表失败:', result)
  } catch (e) {
    console.error('获取企微标签列表异常:', e)
  }
  return null
}

/**
 * 调用企微消息模板 API（内部方法）
 */
async function postMessageTemplate(accessToken, message) {
  const url = `https://qyapi.weixin.qq.com/cgi-bin/externalcontact/add_msg_template?access_token=${accessToken}`
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    })
    const result = await resp.json()
    if (result.errcode === 0) {
      console.info('企微消息推送成功')
      return true
    }
    console.error('企微消息推送失败:', result)
  } catch (e) {
    console.error('企微消息推送异常:', e)
  }
  return false
}

module.exports = {
  getAccessToken,
  sendShipNotification,
  sendPromotionByTag,
  sendBirthdayGreeting,
  sendMiniProgramCard,
  sendMiniProgramCardByTag,
  getCorpTagList,
}
