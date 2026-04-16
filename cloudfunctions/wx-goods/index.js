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
  detail, category, list, related, count, categoryWithGoods, listAllBrief,
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
  categoryWithGoods,
  list,
  related,
  count,
  listAllBrief,

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

// 操作失败时的用户提示
const ACTION_ERRORS = {
  detail: '商品详情加载失败，请刷新重试',
  category: '分类加载失败，请刷新重试',
  categoryWithGoods: '商品列表加载失败，请刷新重试',
  list: '商品列表加载失败，请刷新重试',
  related: '推荐商品加载失败',
  count: '获取商品数量失败',
  listAllBrief: '商品列表加载失败，请刷新重试',
  getFirstCategory: '分类加载失败，请刷新重试',
  getSecondCategory: '分类加载失败，请刷新重试',
  catalogIndex: '分类加载失败，请刷新重试',
  queryAll: '分类加载失败，请刷新重试',
  current: '分类加载失败，请刷新重试',
  searchIndex: '搜索页加载失败，请刷新重试',
  helper: '搜索建议获取失败',
  clearhistory: '清除历史记录失败，请重试',
  brandList: '品牌列表加载失败',
  brandDetail: '品牌详情加载失败',
}

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
    return response.fail(502, ACTION_ERRORS[action] || '操作失败，请稍后重试')
  }
}
