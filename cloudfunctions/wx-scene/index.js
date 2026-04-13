/**
 * wx-scene 云函数 — 场景浏览
 *
 * 迁移自 WxSceneController
 * 3 个接口：list, banners, goods
 */

const { response } = require('layer-base')

const { list, banners, goods } = require('./service/scene')

const routes = { list, banners, goods }

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
    return response.serious()
  }
}
