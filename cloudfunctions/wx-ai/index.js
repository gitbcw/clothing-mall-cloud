/**
 * wx-ai 云函数 — AI 识别（真实接入）
 *
 * 接口：status, recognizeTag, recognizeImage
 * 支持 MiniMax VLM / 火山引擎 ARK Vision API
 */

const { db, response } = require('layer-base')
const { loadConfigs, getConfig } = require('layer-base').systemConfig
const { wxAuth } = require('layer-auth')
const { recognizeTag, recognizeImage } = require('layer-wechat/lib/ai')

// ==================== 云存储文件处理 ====================

const COS_BASE = 'https://636c-cloudbase-d3g1zmq7r388144eb-1427677265.tcb.qcloud.la/'
const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com'

/**
 * 将 cloudPath 或 fileID 转为 HTTP URL
 */
function getFileUrl(fileID) {
  if (!fileID) throw new Error('文件路径为空')
  // 已经是完整 URL
  if (fileID.startsWith('http')) return fileID
  // cloud:// fileID → 提取 cloudPath 拼接
  if (fileID.startsWith('cloud://')) {
    const match = fileID.match(/^cloud:\/\/[^/]+\/(.+)$/)
    if (match) return COS_BASE + match[1]
  }
  // cloudPath（如 ai/xxx.jpg）直接拼接
  return COS_BASE + fileID
}

async function getImageForAi(fileID) {
  const imageUrl = getFileUrl(fileID)
  if (typeof fileID === 'string' && fileID.indexOf('ai/') === 0) {
    const resp = await fetch(imageUrl)
    if (!resp.ok) {
      throw new Error(`AI 图片下载失败: ${resp.status}`)
    }
    return Buffer.from(await resp.arrayBuffer())
  }
  return imageUrl
}

async function getImageDataUrl(fileID) {
  const imageUrl = getFileUrl(fileID)
  const resp = await fetch(imageUrl)
  if (!resp.ok) {
    throw new Error(`AI 图片下载失败: ${resp.status}`)
  }
  const contentType = (resp.headers.get('content-type') || 'image/jpeg').split(';')[0].trim()
  const buffer = Buffer.from(await resp.arrayBuffer())
  return `data:${contentType};base64,${buffer.toString('base64')}`
}

function stripJsonMarkdown(content) {
  let text = String(content || '').trim()
  if (text.startsWith('```json')) text = text.slice(7)
  else if (text.startsWith('```')) text = text.slice(3)
  if (text.endsWith('```')) text = text.slice(0, -3)
  return text.trim()
}

function parseAiJson(content) {
  const text = stripJsonMarkdown(content)
  try {
    return JSON.parse(text)
  } catch (err) {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw err
  }
}

function buildMinimaxImagePrompt(categories, scenes) {
  return `你是一个专业的服装商品图片识别助手。请只返回合法 JSON，不要 Markdown，不要解释。
JSON 结构：
{
  "name": "商品名称，简洁具体，包含颜色、款式、材质等关键信息",
  "price": "建议售价，纯数字字符串；如果无法判断，返回空字符串",
  "brief": "商品简介，20字以内",
  "category": "分类名称",
  "scenes": ["适用场景"]
}
分类必须优先从以下选项中选择一个最匹配项；没有匹配则返回空字符串：
${(categories || []).join('、') || '上衣、裙子、裤子、外套、配饰'}
适用场景必须优先从以下选项中选择，可多选；没有匹配则返回空数组：
${(scenes || []).join('、') || '通勤、约会、休闲、运动、正式、度假'}`
}

function buildMinimaxTagPrompt() {
  return `你是一个专业的服装吊牌识别助手。请只返回合法 JSON，不要 Markdown，不要解释。
请从吊牌/价签图片中提取商品信息，优先读取吊牌上的明确文字，不要根据服装外观编造。
JSON 结构：
{
  "name": "吊牌上的商品名称；无法识别返回空字符串",
  "price": "吊牌上的一口价/标价/零售价，纯数字字符串；无法识别返回空字符串",
  "category": "吊牌可明确判断的商品类别；无法识别返回空字符串",
  "color": "吊牌可明确判断的颜色；无法识别返回空字符串",
  "brand": "吊牌可明确判断的品牌；无法识别返回空字符串",
  "confidence": 0.0
}
price 只保留数字和小数点，不要包含人民币符号、元、逗号或其他文字。
confidence 使用 0 到 1 的数字，表示对 name 和 price 的综合置信度。`
}

function normalizeTagPrice(price) {
  const text = String(price == null ? '' : price).trim()
  if (!text) return ''
  const match = text.replace(/,/g, '').match(/\d+(?:\.\d+)?/)
  return match ? match[0] : ''
}

async function callMinimaxVlm(prompt, fileID) {
  const apiKey = process.env.MINIMAX_API_KEY
  if (!apiKey) {
    throw new Error('MiniMax 识别功能缺少 API Key')
  }

  const imageUrl = await getImageDataUrl(fileID)
  const body = {
    prompt,
    image_url: imageUrl,
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 45000)
  try {
    const resp = await fetch(`${MINIMAX_BASE_URL}/v1/coding_plan/vlm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!resp.ok) {
      const errorText = await resp.text()
      throw new Error(`MiniMax 请求失败，状态码: ${resp.status}, 响应: ${errorText}`)
    }

    const payload = await resp.json()
    if (payload.base_resp && payload.base_resp.status_code && payload.base_resp.status_code !== 0) {
      throw new Error(payload.base_resp.status_msg || 'MiniMax API 返回错误')
    }

    return parseAiJson(payload.content)
  } finally {
    clearTimeout(timer)
  }
}

async function recognizeTagByMinimax(fileID) {
  const result = await callMinimaxVlm(buildMinimaxTagPrompt(), fileID)
  return {
    name: result.name || '',
    price: normalizeTagPrice(result.price),
    category: result.category || '',
    color: result.color || '',
    brand: result.brand || '',
    confidence: typeof result.confidence === 'number' ? result.confidence : 0,
    provider: 'minimax',
    isMock: false,
  }
}

async function recognizeImageByMinimax(fileID, categories, scenes) {
  const result = await callMinimaxVlm(buildMinimaxImagePrompt(categories, scenes), fileID)
  return {
    name: result.name || '',
    price: result.price != null ? String(result.price) : '',
    brief: result.brief || '',
    category: result.category || '',
    scenes: Array.isArray(result.scenes) ? result.scenes : [],
    provider: 'minimax',
    isMock: false,
  }
}

function getAiProvider() {
  return (getConfig('litemall_ai_provider') || process.env.AI_PROVIDER || 'doubao').toLowerCase()
}

// ==================== AI 服务状态 ====================

async function status() {
  const enabled = getConfig('litemall_ai_enabled')
  const provider = getAiProvider()

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

  const provider = getAiProvider()
  if (provider === 'minimax') {
    try {
      const result = await recognizeTagByMinimax(fileID)
      return response.ok(result)
    } catch (err) {
      console.warn('[wx-ai] MiniMax recognizeTag failed, fallback to ARK:', err.message || err)
    }
  }

  const image = await getImageForAi(fileID)
  const result = await recognizeTag(image)
  return response.ok({
    ...result,
    provider: result.provider || 'ark',
  })
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

  const provider = getAiProvider()
  const result = provider === 'minimax'
    ? await recognizeImageByMinimax(fileID, categories, scenes)
    : await recognizeImage(await getImageForAi(fileID), categories, scenes)
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
