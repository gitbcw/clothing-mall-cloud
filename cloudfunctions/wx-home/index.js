/**
 * wx-home 云函数 — 小程序商城端首页
 *
 * 迁移自 WxHomeController, WxTopicController, WxIssueController, WxMsgController, WxIndexController
 * 合并 5 个 Controller，10 个接口
 *
 * 调用方式：
 *   wx.cloud.callFunction({
 *     name: 'wx-home',
 *     data: { action: 'index', data: {} }
 *   })
 */

const { response } = require('layer-base')
const { wxAuth } = require('layer-auth')

const {
  index: homeIndex, about, cache,
} = require('./service/home')

const {
  list: topicList, detail: topicDetail, related: topicRelated,
} = require('./service/topic')

const {
  list: issueList,
} = require('./service/issue')

const {
  configGet, configPost,
} = require('./service/msg')

const routes = {
  // 首页
  homeIndex,
  about,
  cache,

  // 专题
  topicList,
  topicDetail,
  topicRelated,

  // 常见问题
  issueList,

  // 消息（云函数模式下简化处理）
  configGet,
  configPost,

  // 测试接口
  indexTest: async () => response.ok('hello world, this is wx service'),
}

// 需要可选登录的接口
const AUTH_OPTIONAL = ['homeIndex', 'topicDetail']

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

  // 可选登录
  if (AUTH_OPTIONAL.includes(action)) {
    try {
      const authResult = await wxAuth.wxAuthMiddleware(event, context)
      if (!authResult) {
        context._userId = event._userId
        context._user = event._user
      }
    } catch (e) { /* ignore */ }
  }

  try {
    return await handler(data || {}, context)
  } catch (err) {
    console.error(`[wx-home] action=${action} error:`, err)
    return response.serious()
  }
}
