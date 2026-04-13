/**
 * wx-clothing 云函数 — 服装 SKU / 门店 / 会员
 *
 * 迁移自 WxClothingSkuController, WxClothingStoreController, WxClothingUserController
 * 10 个接口：SKU 5 + 门店 3 + 会员 2
 *
 * 调用方式：
 *   wx.cloud.callFunction({
 *     name: 'wx-clothing',
 *     data: { action: 'skuList', data: { goodsId: 123 } }
 *   })
 */

const { response } = require('layer-base')
const { wxAuth } = require('layer-auth')

const {
  skuList, skuSizes, skuDetail, skuQuery, skuCheckStock,
} = require('./service/sku')

const {
  storeList, storeDetail, storeNearest,
} = require('./service/store')

const {
  memberInfo, memberBindGuide,
} = require('./service/member')

const routes = {
  // SKU
  skuList, skuSizes, skuDetail, skuQuery, skuCheckStock,
  // 门店
  storeList, storeDetail, storeNearest,
  // 会员
  memberInfo, memberBindGuide,
}

// 需要登录的接口
const AUTH_REQUIRED = ['memberInfo', 'memberBindGuide']

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

  if (AUTH_REQUIRED.includes(action)) {
    const authResult = await wxAuth.wxAuthMiddleware(event, context)
    if (authResult) return authResult
    context._userId = event._userId
    context._user = event._user
  }

  try {
    return await handler(data || {}, context)
  } catch (err) {
    console.error(`[wx-clothing] action=${action} error:`, err)
    return response.serious()
  }
}
