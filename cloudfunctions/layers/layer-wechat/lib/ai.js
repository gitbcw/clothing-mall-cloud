/**
 * AI 图像识别服务 — 火山引擎 ARK Vision API
 *
 * 使用 OpenAI Chat Completions 兼容格式调用 ARK 视觉模型。
 *
 * 环境变量配置：
 *   DOUBAO_API_KEY   — API 密钥
 *   DOUBAO_MODEL     — 模型端点 ID（默认 ep-20260406233437-xddjl）
 *   AI_ENABLED       — 是否启用（默认 true）
 */

const ARK_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3'
const DEFAULT_MODEL = 'ep-20260406233437-xddjl'

/**
 * 构建图片内容块（支持 URL 或 base64）
 */
function buildImageContent(image) {
  if (typeof image === 'string' && image.startsWith('http')) {
    return { type: 'image_url', image_url: { url: image } }
  }
  const base64 = Buffer.isBuffer(image) ? image.toString('base64') : image
  return { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
}

/**
 * 吊牌识别
 * @param {Buffer|string} image — 图片 Buffer、base64 字符串或 URL
 * @returns {{ name: string, price: string, isMock: boolean }}
 */
async function recognizeTag(image) {
  const config = getAiConfig()
  if (!config.enabled) {
    return { name: '100 亚麻提花竖条衬衣', price: '599', isMock: true }
  }
  if (!config.apiKey) {
    throw new Error('吊牌识别功能缺少 API Key')
  }

  const body = {
    model: config.model,
    messages: [
      { role: 'system', content: TAG_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: '请识别这张吊牌图片，提取商品名称和一口价' },
          buildImageContent(image),
        ],
      },
    ],
  }

  const response = await callApi(config.apiKey, body)
  const result = parseJsonResponse(response)

  return {
    name: result.name || '',
    price: result.price || '',
    isMock: false,
  }
}

/**
 * 主图识别
 * @param {Buffer|string} image — 图片 Buffer、base64 字符串或 URL
 * @param {string[]} [categories] — 可选分类列表
 * @param {string[]} [scenes] — 可选场景列表
 * @returns {{ name, price, brief, category, scenes: string[], isMock: boolean }}
 */
async function recognizeImage(image, categories, scenes) {
  const config = getAiConfig()
  if (!config.enabled) {
    return {
      name: '黑色修身西装外套', price: '399',
      brief: '经典黑色修身剪裁，百搭商务单品',
      category: '外套', scenes: ['通勤', '正式'], isMock: true,
    }
  }
  if (!config.apiKey) {
    throw new Error('AI 识别功能缺少 API Key')
  }

  const prompt = buildImagePrompt(categories, scenes)

  const body = {
    model: config.model,
    messages: [
      { role: 'system', content: prompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: '请分析这张服装图片，返回商品信息' },
          buildImageContent(image),
        ],
      },
    ],
  }

  const response = await callApi(config.apiKey, body)
  const result = parseJsonResponse(response)

  return {
    name: result.name || '',
    price: result.price || '',
    brief: result.brief || '',
    category: result.category || '',
    scenes: Array.isArray(result.scenes) ? result.scenes : [],
    isMock: false,
  }
}

// ==================== 内部方法 ====================

const TAG_SYSTEM_PROMPT = `你是一个专业的吊牌信息识别助手。你的任务是分析用户上传的吊牌/价格标签图片，提取以下信息并以JSON格式返回：
{
  "name": "商品名称（吊牌上名称字段的值）",
  "price": "一口价（吊牌上一口价字段的数值，纯数字字符串）"
}
注意事项：
1. 必须返回合法的JSON格式
2. name 提取吊牌上"名称"字段的值
3. price 提取吊牌上"一口价"字段的数值，只保留数字
4. 如果某些信息无法识别，对应字段返回空字符串
5. 只返回JSON，不要包含其他解释文字`

function buildImagePrompt(categories, scenes) {
  let prompt = `你是一个专业的服装分析助手。你的任务是分析用户上传的服装图片，提取以下信息并以JSON格式返回：
{
  "name": "商品名称（简洁描述，包含颜色、款式、材质等关键信息，如'黑色修身西装外套'）",
  "price": 建议售价（数字，合理的市场零售价，单位：元）,
  "brief": "商品简介（一句话描述风格和特点，20字以内）",`

  if (categories && categories.length > 0) {
    prompt += `\n  "category": "分类（从以下选项中选择最匹配的：${categories.join('、')}）",`
  } else {
    prompt += `\n  "category": "分类（如：上衣、裙子、裤子、外套、配饰等）",`
  }

  if (scenes && scenes.length > 0) {
    prompt += `\n  "scenes": ["适用场景"]（从以下选项中选择所有适用的：${scenes.join('、')}）`
  } else {
    prompt += `\n  "scenes": ["适用场景"]（如：通勤、约会、休闲、运动、正式、度假等）`
  }

  prompt += `\n}
注意事项：
1. 必须返回合法的JSON格式
2. name 应简洁但具体，包含颜色、款式等关键信息
3. price 应为合理的市场零售价
4. brief 一句话概括风格和卖点
5. category 必须从提供的选项中选择最匹配的，如果都不匹配则返回空字符串
6. scenes 从提供的选项中选择所有适用的，如果没有匹配的则返回空数组
7. 只返回JSON，不要包含其他解释文字`

  return prompt
}

function getAiConfig() {
  return {
    apiKey: process.env.DOUBAO_API_KEY || '',
    model: process.env.DOUBAO_MODEL || DEFAULT_MODEL,
    enabled: process.env.AI_ENABLED !== 'false',
  }
}

async function callApi(apiKey, body) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30000)

  try {
    const resp = await fetch(`${ARK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!resp.ok) {
      const errorText = await resp.text()
      throw new Error(`API 请求失败，状态码: ${resp.status}, 响应: ${errorText}`)
    }

    const result = await resp.json()
    if (result.error) {
      throw new Error(`API 返回错误: ${result.error.message || JSON.stringify(result.error)}`)
    }

    return result.choices[0].message.content
  } finally {
    clearTimeout(timer)
  }
}

function parseJsonResponse(content) {
  content = content.trim()
  if (content.startsWith('```json')) content = content.slice(7)
  else if (content.startsWith('```')) content = content.slice(3)
  if (content.endsWith('```')) content = content.slice(0, -3)
  content = content.trim()

  return JSON.parse(content)
}

module.exports = {
  recognizeTag,
  recognizeImage,
}
