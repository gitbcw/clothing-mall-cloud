/**
 * wx-goods 云函数 — 小程序商城端商品
 *
 * 迁移自 WxGoodsController, WxCatalogController, WxSearchController, WxBrandController
 * 合并 4 个 Controller，15 个接口
 *
 * 调用方式：
 *   wx.cloud.callFunction({
 *     name: 'wx-goods',
 *     data: { action: 'detail', data: { id: 123 } }
 *   })
 */

const { response } = require('layer-base')
const { wxAuth } = require('layer-auth')

// ==================== 路由注册 ====================

const {
  detail, category, list, related, count,
} = require('./service/goods')

const {
  getFirstCategory, getSecondCategory, index: catalogIndex, queryAll, current,
} = require('./service/catalog')

const {
  index: searchIndex, helper, clearhistory,
} = require('./service/search')

const {
  list: brandList, detail: brandDetail,
} = require('./service/brand')

// action → handler 映射
const routes = {
  // 商品
  detail,
  category,
  list,
  related,
  count,

  // 分类
  getFirstCategory,
  getSecondCategory,
  catalogIndex,
  queryAll,
  current,

  // 搜索
  searchIndex,
  helper,
  clearhistory,

  // 品牌
  brandList,
  brandDetail,
}

// 需要登录态的接口（可选登录，有 userId 则增强功能）
const AUTH_OPTIONAL = ['detail', 'list', 'searchIndex', 'clearhistory']

// ==================== 入口 ====================

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

  // 可选登录：有 OPENID 则注入用户信息
  if (AUTH_OPTIONAL.includes(action)) {
    try {
      const authResult = await wxAuth.wxAuthMiddleware(event, context)
      if (!authResult) {
        context._userId = event._userId
        context._user = event._user
      }
    } catch (e) {
      // 认证失败不阻断，仅不注入用户信息
    }
  }

  try {
    return await handler(data || {}, context)
  } catch (err) {
    console.error(`[wx-goods] action=${action} error:`, err)
    return response.serious()
  }
}
