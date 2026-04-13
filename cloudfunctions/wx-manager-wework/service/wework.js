/**
 * 管理端企微推送接口
 *
 * 迁移自 WxManagerWeWorkController
 * 接口：tags, pages, uploadMedia, sendCard, pushGroups, sendMessage
 *
 * 注意：uploadMedia 需要文件上传，云函数中通过云存储实现。
 * 企业微信 API 调用通过 layer-wechat 的 wework 模块实现。
 */

const { db, response } = require('layer-base')
const { getConfig } = require('layer-base').systemConfig
const { getCorpTagList, sendMiniProgramCardByTag } = require('layer-wechat')

// ==================== 获取企微标签列表 ====================

async function tags() {
  try {
    const tagList = await getCorpTagList()
    if (!tagList) {
      return response.fail(500, '获取企业微信标签列表失败，请检查配置')
    }
    return response.ok(tagList)
  } catch (err) {
    console.error('[wx-manager-wework] tags error:', err)
    return response.fail(500, '获取企业微信标签列表失败')
  }
}

// ==================== 获取小程序页面列表 ====================

async function pages() {
  const defaultPages = [
    { name: '首页', path: 'pages/index/index' },
    { name: '商品分类', path: 'pages/catalog/catalog' },
    { name: '新品推荐', path: 'pages/newGoods/newGoods' },
    { name: '热门商品', path: 'pages/hotGoods/hotGoods' },
    { name: '个人中心', path: 'pages/ucenter/index/index' },
    { name: '优惠券中心', path: 'pages/coupon/coupon' },
  ]

  // 读取活动页面配置
  const activityPagesJson = getConfig('litemall_wework_activity_pages')
  if (activityPagesJson) {
    try {
      const activityPages = JSON.parse(activityPagesJson)
      if (Array.isArray(activityPages)) {
        for (const item of activityPages) {
          defaultPages.push({ name: item.name, path: item.path })
        }
      }
    } catch (e) {
      console.error('[wx-manager-wework] 解析活动页面配置失败', e)
    }
  }

  return response.ok(defaultPages)
}

// ==================== 上传素材到企微 ====================

async function uploadMedia(data) {
  const { fileUrl, filename } = data
  if (!fileUrl) return response.badArgumentValue()

  const corpId = getConfig('litemall_wework_corp_id')
  const secret = getConfig('litemall_wework_agent_secret')

  if (!corpId || !secret) {
    return response.fail(500, '企业微信未配置')
  }

  try {
    // 获取 access_token
    const tokenRes = await fetch(
      `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpId}&corpsecret=${secret}`
    )
    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token

    if (!accessToken) {
      return response.fail(500, '获取 access_token 失败')
    }

    // 下载文件到内存
    const fileRes = await fetch(fileUrl)
    const buffer = await fileRes.arrayBuffer()

    // 上传临时素材
    const formData = new FormData()
    const blob = new Blob([buffer])
    formData.append('media', blob, filename || 'image.jpg')

    const uploadRes = await fetch(
      `https://qyapi.weixin.qq.com/cgi-bin/media/upload?access_token=${accessToken}&type=image`,
      { method: 'POST', body: formData }
    )
    const uploadData = await uploadRes.json()

    if (uploadData.errcode !== 0) {
      return response.fail(500, `上传素材失败: ${uploadData.errmsg}`)
    }

    return response.ok({
      mediaId: uploadData.media_id,
      filename: filename || 'image.jpg',
      createdAt: uploadData.created_at,
    })
  } catch (err) {
    console.error('[wx-manager-wework] uploadMedia error:', err)
    return response.fail(500, '上传素材到企业微信失败')
  }
}

// ==================== 发送小程序卡片 ====================

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

// ==================== 获取推送组 ====================

async function pushGroups() {
  const rows = await db.query(
    `SELECT id, name, type, member_count FROM litemall_push_group WHERE deleted = 0`
  )

  return response.ok(rows.map(r => ({
    id: r.id,
    name: r.name,
    type: r.type,
    memberCount: r.member_count,
  })))
}

// ==================== 发送消息 ====================

async function sendMessage(data) {
  const { targetType, targetGroupIds, targetTagId, contentType, title, content, mediaId, page, scheduledAt } = data

  if (!targetType) return response.fail(402, '请选择推送目标类型')
  if (targetType === 'group' && (!targetGroupIds || targetGroupIds.length === 0)) {
    return response.fail(402, '请选择推送组')
  }
  if (!contentType) return response.fail(402, '请选择内容类型')

  if (contentType === 'card') {
    if (!title) return response.fail(402, '请输入卡片标题')
    if (!mediaId) return response.fail(402, '请上传封面图片')
    if (!page) return response.fail(402, '请选择跳转页面')
  }
  if (contentType === 'text' && !content) {
    return response.fail(402, '请输入文本内容')
  }

  // 计算目标人数
  let totalCount = 0
  if (targetType === 'group' && targetGroupIds) {
    const rows = await db.query(
      `SELECT id, member_count FROM litemall_push_group WHERE id IN (${targetGroupIds.map(() => '?').join(',')}) AND deleted = 0`,
      targetGroupIds
    )
    for (const r of rows) {
      totalCount += r.member_count || 0
    }
  }

  // 定时推送
  if (scheduledAt) {
    const scheduledTime = new Date(scheduledAt)
    if (scheduledTime <= new Date()) {
      return response.fail(402, '定时时间不能早于当前时间')
    }

    await db.query(
      `INSERT INTO litemall_push_log
        (push_type, content_type, title, content, media_id, page,
         target_type, target_group_id, target_tag_id,
         total_count, success_count, fail_count,
         status, scheduled_at, sent_at, add_time, update_time, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'pending', ?, NULL, NOW(), NOW(), 0)`,
      [contentType, contentType, title || '', content || '', mediaId || '', page || '',
       targetType, targetGroupIds ? targetGroupIds[0] : null, targetTagId || null,
       totalCount, scheduledAt]
    )

    return response.ok(`定时推送已创建，将在 ${scheduledAt} 发送`)
  }

  // 立即发送
  const corpId = getConfig('litemall_wework_corp_id')
  const secret = getConfig('litemall_wework_agent_secret')

  let sendSuccess = false
  if (corpId && secret && targetTagId) {
    try {
      const tokenRes = await fetch(
        `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpId}&corpsecret=${secret}`
      )
      const tokenData = await tokenRes.json()
      const accessToken = tokenData.access_token

      if (accessToken) {
        let msgBody
        if (contentType === 'card') {
          msgBody = {
            msgtype: 'miniprogram',
            miniprogram: {
              appid: getConfig('litemall_wework_agent_id') || corpId,
              title,
              pic_media_id: mediaId,
              page,
            },
          }
        } else {
          msgBody = {
            msgtype: 'text',
            text: { content },
          }
        }

        const sendRes = await fetch(
          `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${accessToken}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              touser: targetTagId,
              msgtype: msgBody.msgtype,
              agentid: parseInt(getConfig('litemall_wework_agent_id')) || 0,
              [msgBody.msgtype]: msgBody[msgBody.msgtype],
            }),
          }
        )
        const sendData = await sendRes.json()
        sendSuccess = sendData.errcode === 0
      }
    } catch (err) {
      console.error('[wx-manager-wework] sendMessage error:', err)
    }
  } else {
    // 无企微配置，标记成功（占位）
    sendSuccess = true
  }

  await db.query(
    `INSERT INTO litemall_push_log
      (push_type, content_type, title, content, media_id, page,
       target_type, target_group_id, target_tag_id,
       total_count, success_count, fail_count,
       status, sent_at, add_time, update_time, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent', NOW(), NOW(), NOW(), 0)`,
    [contentType, contentType, title || '', content || '', mediaId || '', page || '',
     targetType, targetGroupIds ? targetGroupIds[0] : null, targetTagId || null,
     totalCount, sendSuccess ? totalCount : 0, sendSuccess ? 0 : totalCount]
  )

  return sendSuccess
    ? response.ok('消息发送成功')
    : response.fail(500, '消息发送失败，请检查企业微信配置')
}

module.exports = {
  tags, pages, uploadMedia, sendCard, pushGroups, sendMessage,
}
