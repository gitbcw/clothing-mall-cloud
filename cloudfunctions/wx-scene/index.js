/**
 * wx-scene 云函数 — 场景浏览
 *
 * 迁移自 WxSceneController
 * 3 个接口：list, banners, goods
 */

const { response } = require('layer-base')

const { list, banners, goods } = require('./service/scene')

const routes = { list, banners, goods }

// 操作失败时的用户提示
const ACTION_ERRORS = {
  list: '场景列表加载失败，请刷新重试',
  banners: '场景轮播图加载失败',
  goods: '场景商品加载失败',
}

exports.main = async (event, context) => {
  const { action, data } = event

  const handler = routes[action]
  if (!handler) {
    return response.fail(404, `未知接口: ${action}`)
  }

  try {
    return await handler(data || {}, context)
  } catch (err) {
    console.error(`[wx-scene] action=${action} error:`, err)
    return response.fail(502, ACTION_ERRORS[action] || '操作失败，请稍后重试')
  }
}
