/**
 * wx-user 云函数 — 小程序商城端用户中心
 *
 * 迁移自 WxAddressController, WxCollectController, WxFootprintController,
 *        WxFeedbackController, WxUserController
 * 14 个接口：地址4 + 收藏2 + 足迹2 + 反馈1 + 用户5
 *
 * 调用方式：
 *   wx.cloud.callFunction({
 *     name: 'wx-user',
 *     data: { action: 'addressList', data: {} }
 *   })
 */

const { response } = require('layer-base')
const { wxAuth } = require('layer-auth')

const {
  list: addressList, detail: addressDetail, save: addressSave, remove: addressRemove,
} = require('./service/address')

const {
  list: collectList, addordelete: collectAddOrDelete,
} = require('./service/collect')

const {
  list: footprintList, remove: footprintRemove,
} = require('./service/footprint')

const {
  submit: feedbackSubmit,
} = require('./service/feedback')

const {
  index: userIndex, info: userInfo, profile: userProfile,
  role: userRole, isManager: userIsManager,
} = require('./service/user')

const routes = {
  // 地址
  addressList, addressDetail, addressSave, addressRemove,
  // 收藏
  collectList, collectAddOrDelete,
  // 足迹
  footprintList, footprintRemove,
  // 反馈
  feedbackSubmit,
  // 用户（兼容 URL 路由长名和直接调用短名）
  userIndex, userInfo, userProfile, userRole, userIsManager,
  index: userIndex, info: userInfo, profile: userProfile, role: userRole, isManager: userIsManager,
}

// 所有接口都需要登录
const AUTH_REQUIRED = Object.keys(routes)

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
    console.error(`[wx-user] action=${action} error:`, err)
    return response.serious()
  }
}
