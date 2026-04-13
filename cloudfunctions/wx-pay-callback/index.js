/**
 * wx-pay-callback — 微信支付异步通知回调
 *
 * cloud.cloudPay.unifiedOrder() 通过 functionName 参数指定此函数。
 * 微信支付服务器调用此函数时，event 格式与普通云函数不同（无 action 字段）。
 *
 * 此函数不经过 wxAuth 中间件，不需要用户登录态。
 */

const { db } = require('layer-base')

// 订单状态常量（内联，避免跨云函数 require 路径不可靠）
const STATUS = {
  CREATE: 101,
  PAY: 201,
  VERIFY_PENDING: 501,
}

exports.main = async (event, context) => {
  console.log('[wx-pay-callback] received:', JSON.stringify(event))

  // CloudBase 云调用支付回调格式
  const { return_code, result_code, out_trade_no, transaction_id, total_fee } = event

  if (return_code === 'SUCCESS' && result_code === 'SUCCESS') {
    try {
      if (!out_trade_no) {
        console.error('[wx-pay-callback] missing out_trade_no')
        return { errcode: 0, errmsg: 'SUCCESS' }
      }

      // 按 order_sn 查找未支付订单
      const rows = await db.query(
        `SELECT * FROM litemall_order WHERE order_sn = ? AND order_status = ? AND deleted = 0 LIMIT 1`,
        [out_trade_no, STATUS.CREATE]
      )

      if (rows.length === 0) {
        console.warn('[wx-pay-callback] order not found or already paid:', out_trade_no)
        return { errcode: 0, errmsg: 'SUCCESS' }
      }

      const order = rows[0]
      const nextStatus = order.delivery_type === 'pickup'
        ? STATUS.VERIFY_PENDING
        : STATUS.PAY

      await db.query(
        `UPDATE litemall_order
         SET order_status = ?, pay_id = ?, pay_time = NOW(), update_time = NOW()
         WHERE id = ? AND order_status = ?`,
        [nextStatus, transaction_id || '', order.id, STATUS.CREATE]
      )

      console.info(`[wx-pay-callback] order ${order.id} paid -> status ${nextStatus}`)
    } catch (err) {
      console.error('[wx-pay-callback] process error:', err)
    }
  }

  // 始终返回成功，防止微信重试
  return { errcode: 0, errmsg: 'SUCCESS' }
}
