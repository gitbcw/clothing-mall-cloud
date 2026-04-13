/**
 * wx-ai 云函数 — AI 识别（真实接入）
 *
 * 接口：status, recognizeTag, recognizeImage
 * 使用火山引擎 ARK Vision API
 */

const { db, response } = require('layer-base')
const { loadConfigs, getConfig } = require('layer-base').systemConfig
const { wxAuth } = require('layer-auth')
const { recognizeTag, recognizeImage } = require('layer-wechat/lib/ai')

// ==================== 云存储文件处理 ====================

/**
 * 将云存储 fileID 转为可公开访问的临时 URL
 */
async function getTempUrl(fileID) {
  const tcb = require('@cloudbase/node-sdk')
  const app = tcb.init()
  const { fileList } = await app.getTempFileURL({ fileList: [fileID] })
  if (!fileList || !fileList[0] || !fileList[0].tempFileURL) {
    throw new Error('无法获取文件临时链接: ' + fileID)
  }
  return fileList[0].tempFileURL
}

// ==================== AI 服务状态 ====================

async function status() {
  const enabled = getConfig('litemall_ai_enabled')
  const provider = getConfig('litemall_ai_provider') || 'doubao'

  return response.ok({
    enabled: enabled === 'true' || enabled === '1',
    provider,
  })
}

// ==================== 标签识别 ====================

async function recognizeTagHandler(data) {
  const enabled = getConfig('litemall_ai_enabled')
  if (enabled !== 'true' && enabled !== '1') {
    return response.fail(501, 'AI 识别功能未启用')
  }

  const { fileID } = data
  if (!fileID) return response.badArgument()

  const imageUrl = await getTempUrl(fileID)
  const result = await recognizeTag(imageUrl)
  return response.ok(result)
}

// ==================== 主图识别 ====================

async function recognizeImageHandler(data, context) {
  const enabled = getConfig('litemall_ai_enabled')
  if (enabled !== 'true' && enabled !== '1') {
    return response.fail(501, 'AI 识别功能未启用')
  }

  const { fileID } = data
  if (!fileID) return response.badArgument()

  // 从 DB 获取分类和场景列表，提升识别准确率
  const [catRows, sceneRows] = await Promise.all([
    db.query('SELECT name FROM litemall_category WHERE level = ? AND deleted = 0 ORDER BY sort_order', ['L1']),
    db.query('SELECT name FROM clothing_scene WHERE enabled = 1 AND deleted = 0 ORDER BY sort_order'),
  ])
  const categories = catRows.map(r => r.name)
  const scenes = sceneRows.map(r => r.name)

  const imageUrl = await getTempUrl(fileID)
  const result = await recognizeImage(imageUrl, categories, scenes)
  return response.ok(result)
}

// ==================== 路由 ====================

const routes = {
  status,
  recognizeTag: recognizeTagHandler,
  recognizeImage: recognizeImageHandler,
}

const AUTH_REQUIRED = ['recognizeTag', 'recognizeImage']

exports.main = async (event, context) => {
  const openId = (event.userInfo && event.userInfo.openId) || null
  if (openId && !context.OPENID) {
    context.OPENID = openId
  }

  const { action, data } = event

  const handler = routes[action]
  if (!handler) {
    return response.fail(404, `未知接口: ${action}`)
  }

  // 加载系统配置到内存
  await loadConfigs()

  if (AUTH_REQUIRED.includes(action)) {
    const authResult = await wxAuth.wxAuthMiddleware(event, context)
    if (authResult) return authResult
    context._userId = event._userId
    context._user = event._user
  }

  try {
    return await handler(data || {}, context)
  } catch (err) {
    console.error(`[wx-ai] action=${action} error:`, err)
    return response.fail(500, err.message || 'AI 识别服务异常')
  }
}
