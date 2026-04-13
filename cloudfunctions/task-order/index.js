/**
 * task-order — 订单定时任务入口
 *
 * 支持两个 action：
 *   cancelUnpaid  — 取消超时未付款订单（每 5 分钟）
 *   autoConfirm   — 自动确认已发货订单（每天 3:00）
 */
const { response } = require('layer-base')
const { systemConfig } = require('layer-base')
const cancelUnpaid = require('./service/cancel-unpaid')
const autoConfirm = require('./service/auto-confirm')

exports.main = async (event) => {
  const { action } = event

  // 加载系统配置（供 service 使用）
  await systemConfig.loadConfigs()

  try {
    let result
    switch (action) {
      case 'cancelUnpaid':
        result = await cancelUnpaid()
        break
      case 'autoConfirm':
        result = await autoConfirm()
        break
      default:
        return response.fail(404, '未知定时任务: ' + action)
    }
    return response.ok(result)
  } catch (err) {
    console.error('[task-order] error:', err)
    return response.serious()
  }
}
