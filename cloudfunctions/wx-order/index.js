/**
 * wx-order 云函数 — 小程序商城端订单
 *
 * 迁移自 WxOrderController, WxAftersaleController
 * 14 个接口：订单10个 + 售后4个
 *
 * 调用方式：
 *   wx.cloud.callFunction({
 *     name: 'wx-order',
 *     data: { action: 'list', data: { showType: 0, page: 1, limit: 10 } }
 *   })
 */

const { response } = require('layer-base')
const { wxAuth } = require('layer-auth')

const {
  list, detail, submit, cancel, refund, confirm, deleteOrder,
  prepay, h5pay,
} = require('./service/order')

const {
  list: aftersaleList, detail: aftersaleDetail, submit: aftersaleSubmit, cancel: aftersaleCancel,
} = require('./service/aftersale')

const routes = {
  // 订单
  list, detail, submit, cancel, refund, confirm, deleteOrder,
  prepay, h5pay,

  // 售后
  aftersaleList, aftersaleDetail, aftersaleSubmit, aftersaleCancel,
}

// 所有订单和售后接口都需要登录
const AUTH_REQUIRED = Object.keys(routes)

// 操作失败时的用户提示
const ACTION_ERRORS = {
  list: '订单列表加载失败，请稍后重试',
  detail: '订单详情加载失败，请稍后重试',
  submit: '下单失败，请稍后重试',
  cancel: '取消订单失败，请稍后重试',
  refund: '退款申请失败，请稍后重试',
  confirm: '确认收货失败，请稍后重试',
  deleteOrder: '删除订单失败，请稍后重试',
  prepay: '支付调起失败，请重试',
  h5pay: '支付调起失败，请重试',
  aftersaleList: '售后列表加载失败，请稍后重试',
  aftersaleDetail: '售后详情加载失败，请稍后重试',
  aftersaleSubmit: '申请售后失败，请稍后重试',
  aftersaleCancel: '取消售后失败，请稍后重试',
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

  // 登录校验
  const authResult = await wxAuth.wxAuthMiddleware(event, context)
  if (authResult) return authResult
  context._userId = event._userId
  context._user = event._user

  try {
    return await handler(data || {}, context)
  } catch (err) {
    console.error(`[wx-order] action=${action} error:`, err)
    return response.fail(502, ACTION_ERRORS[action] || '操作失败，请稍后重试')
  }
}
