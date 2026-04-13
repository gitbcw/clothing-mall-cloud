/**
 * wx-express 云函数 — 物流查询
 *
 * 迁移自 WxExpressController
 * 接口：query
 *
 * 阿里云市场物流查询 API：
 *   https://qryexpress.market.alicloudapi.com/lundear/expressTracking
 *   参数：number (快递单号), com (快递公司编码), mobile (收件人手机号后4位)
 */

const https = require('https')
const { db, response } = require('layer-base')
const { wxAuth } = require('layer-auth')

const EXPRESS_API_URL = 'https://qryexpress.market.alicloudapi.com/lundear/expressTracking'
const APPCODE = process.env.EXPRESS_APPCODE || ''

// 快递公司名 -> API 编码映射（常见快递）
const SHIPPER_CODE_MAP = {
  '顺丰速运': 'shunfeng', '顺丰': 'shunfeng', 'SF': 'shunfeng',
  '圆通速递': 'yuantong', '圆通快递': 'yuantong', '圆通': 'yuantong', 'YTO': 'yuantong',
  '中通快递': 'zhongtong', '中通': 'zhongtong', 'ZTO': 'zhongtong',
  '韵达快递': 'yunda', '韵达速递': 'yunda', '韵达': 'yunda', 'YD': 'yunda',
  '申通快递': 'shentong', '申通': 'shentong', 'STO': 'shentong',
  '百世快递': 'huitongkuaidi', '百世': 'huitongkuaidi', 'HTKY': 'huitongkuaidi',
  '极兔速递': 'jtexpress', '极兔': 'jtexpress', 'J&T': 'jtexpress',
  '邮政EMS': 'ems', 'EMS': 'ems', '中国邮政': 'youzhengguonei',
  '京东快递': 'jd', '京东物流': 'jd', 'JD': 'jd',
  '德邦快递': 'debangwuliu', '德邦物流': 'debangwuliu', '德邦': 'debangwuliu',
  '天天快递': 'tiantian', '天天': 'tiantian',
  '宅急送': 'zhaijisong',
  '优速快递': 'youshuwuliu', '优速': 'youshuwuliu',
  '丰巢': 'fengchao',
}

function getShipperCode(name) {
  if (!name) return ''
  // 先查映射表
  if (SHIPPER_CODE_MAP[name]) return SHIPPER_CODE_MAP[name]
  // 模糊匹配
  for (const [key, code] of Object.entries(SHIPPER_CODE_MAP)) {
    if (name.includes(key) || key.includes(name)) return code
  }
  return ''
}

// code -> 中文名称的反向映射（如 YTO -> 圆通速递）
const CODE_TO_NAME = {
  'SF': '顺丰速运', 'ZTO': '中通快递', 'YTO': '圆通速递',
  'YD': '韵达速递', 'STO': '申通快递', 'EMS': 'EMS',
  'HTKY': '百世快递', 'JD': '京东快递',
}
function getShipperName(code) {
  if (!code) return ''
  return CODE_TO_NAME[code] || code
}

/**
 * 调用阿里云物流查询 API
 */
function fetchExpressInfo(number, com, mobile) {
  return new Promise((resolve, reject) => {
    if (!APPCODE) {
      reject(new Error('EXPRESS_APPCODE 未配置'))
      return
    }

    let url = EXPRESS_API_URL + '?number=' + encodeURIComponent(number)
    if (com) url += '&com=' + encodeURIComponent(com)
    if (mobile) url += '&mobile=' + encodeURIComponent(mobile)

    const urlObj = new URL(url)
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Authorization': 'APPCODE ' + APPCODE,
        'Accept': 'application/json',
      },
    }

    const req = https.request(options, (res) => {
      let body = ''
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => {
        try {
          const data = JSON.parse(body)
          resolve(data)
        } catch (e) {
          reject(new Error('API 响应解析失败: ' + body.substring(0, 200)))
        }
      })
    })

    req.on('error', (e) => { reject(e) })
    req.setTimeout(10000, () => {
      req.destroy()
      reject(new Error('API 请求超时'))
    })
    req.end()
  })
}

/**
 * 将 API 返回的轨迹数据标准化为 [{AcceptTime, AcceptStation}] 格式
 */
function normalizeTraces(apiResult) {
  if (!apiResult) return []

  // 格式1: { data: { list: [{time, status}] } } — 阿里云 lundear 实际格式
  if (apiResult.data && !Array.isArray(apiResult.data) && Array.isArray(apiResult.data.list)) {
    return apiResult.data.list.map(item => ({
      AcceptTime: item.time || item.datetime || '',
      AcceptStation: item.status || item.remark || item.context || '',
    }))
  }

  // 格式2: { result: { list: [{datetime, remark}] } }
  if (apiResult.result && Array.isArray(apiResult.result.list)) {
    return apiResult.result.list.map(item => ({
      AcceptTime: item.datetime || item.time || '',
      AcceptStation: item.remark || item.context || item.status || '',
    }))
  }

  // 格式3: { Traces: [{AcceptStation, AcceptTime}] }
  if (Array.isArray(apiResult.Traces)) {
    return apiResult.Traces.map(t => ({
      AcceptTime: t.AcceptTime || '',
      AcceptStation: t.AcceptStation || '',
    }))
  }

  // 格式4: { data: [{time, context}] } — data 为数组
  if (Array.isArray(apiResult.data)) {
    return apiResult.data.map(item => ({
      AcceptTime: item.time || item.datetime || '',
      AcceptStation: item.context || item.remark || '',
    }))
  }

  return []
}

// ==================== 物流查询 ====================

async function query(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const { orderId, shipChannel, shipSn } = data

  let targetChannel = shipChannel || ''
  let targetSn = shipSn || ''
  let targetChannelCode = '' // 原始 code，用于 API 调用
  let mobile = ''
  let cacheOrderId = orderId || 0

  // 模式1：通过 orderId 查订单获取物流信息
  if (orderId && !targetSn) {
    const orderRows = await db.query(
      `SELECT o.ship_channel, o.ship_sn, o.mobile
       FROM litemall_order o
       WHERE o.id = ? AND o.user_id = ? AND o.deleted = 0 LIMIT 1`,
      [orderId, userId]
    )
    if (orderRows.length === 0) return response.badArgumentValue()

    const order = orderRows[0]
    if (!order.ship_sn) return response.ok({ shipChannel: '', shipSn: '', expressInfo: [] })
    targetChannelCode = order.ship_channel
    targetChannel = getShipperName(order.ship_channel)
    targetSn = order.ship_sn
    mobile = order.mobile ? order.mobile.slice(-4) : ''
  }

  if (!targetSn) return response.badArgument()

  // 查缓存的物流快照（按 order_id 或 exp_no 查询）
  let expressInfo = []
  let cachedRow = null
  if (cacheOrderId) {
    const snapRows = await db.query(
      `SELECT * FROM litemall_order_express WHERE order_id = ? LIMIT 1`,
      [cacheOrderId]
    )
    if (snapRows.length > 0) cachedRow = snapRows[0]
  } else {
    const snapRows = await db.query(
      `SELECT * FROM litemall_order_express WHERE exp_no = ? LIMIT 1`,
      [targetSn]
    )
    if (snapRows.length > 0) cachedRow = snapRows[0]
  }
  if (cachedRow && cachedRow.traces_json) {
    try { expressInfo = JSON.parse(cachedRow.traces_json) } catch (e) { /* ignore */ }
  }

  // 如果没有 APPCODE，直接返回缓存（或空）
  if (!APPCODE) {
    return response.ok({
      shipChannel: getShipperName(targetChannel),
      shipSn: targetSn,
      expressInfo,
    })
  }

  // 调用第三方 API 获取实时物流
  const com = getShipperCode(targetChannelCode || targetChannel)

  try {
    const apiResult = await fetchExpressInfo(targetSn, com, mobile)
    console.log('[wx-express] API response:', JSON.stringify(apiResult).substring(0, 500))

    const traces = normalizeTraces(apiResult)

    // 更新缓存
    if (traces.length > 0) {
      const tracesJson = JSON.stringify(traces)
      if (cachedRow) {
        await db.query(
          `UPDATE litemall_order_express SET traces_json = ?, query_time = NOW() WHERE id = ?`,
          [tracesJson, cachedRow.id]
        )
      } else if (cacheOrderId) {
        await db.query(
          `INSERT INTO litemall_order_express (order_id, exp_code, exp_no, vendor_name, traces_json, query_time)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [cacheOrderId, com, targetSn, targetChannel, tracesJson]
        )
      }
      expressInfo = traces
    }
  } catch (err) {
    console.error('[wx-express] API 调用失败:', err.message)
  }

  return response.ok({
    shipChannel: targetChannel,
    shipSn: targetSn,
    expressInfo,
  })
}

const routes = { query }

exports.main = async (event, context) => {
  // CloudBase 将 OPENID 放在 event.userInfo.openId，注入到 context 供 layer-auth 使用
  const openId = (event.userInfo && event.userInfo.openId) || null
  if (openId && !context.OPENID) {
    context.OPENID = openId
  }

  const { action, data } = event

  const handler = routes[action]
  if (!handler) {
    return response.fail(404, `未知接口: ${action}`)
  }

  // 登录校验
  const authResult = await wxAuth.wxAuthMiddleware(event, context)
  if (authResult) return authResult
  context._userId = event._userId
  context._user = event._user

  try {
    return await handler(data || {}, context)
  } catch (err) {
    console.error(`[wx-express] action=${action} error:`, err)
    return response.serious()
  }
}
