/**
 * 自动确认已发货订单
 *
 * 每日扫描 order_status=301 且 ship_time 超过配置天数的订单，
 * 逐单乐观锁更新为 402（系统自动确认收货）。
 * 移植自 Java OrderJob。
 */
const { query, execute } = require('layer-base').db
const { systemConfig } = require('layer-base')

const BATCH_SIZE = 100

async function autoConfirm() {
  await systemConfig.loadConfigs()
  const unconfirmDays = Math.max(systemConfig.getOrderUnconfirm(), 1)

  const orders = await query(
    `SELECT id, update_time FROM litemall_order
     WHERE order_status = 301
       AND ship_time < DATE_SUB(NOW(), INTERVAL ? DAY)
       AND deleted = 0
     LIMIT ${BATCH_SIZE}`,
    [unconfirmDays]
  )

  let confirmed = 0
  for (const order of orders) {
    try {
      const { affectedRows } = await execute(
        `UPDATE litemall_order
         SET order_status = 402, confirm_time = NOW(), update_time = NOW()
         WHERE id = ? AND update_time = ?`,
        [order.id, order.update_time]
      )
      if (affectedRows > 0) {
        confirmed++
      }
    } catch (err) {
      console.error(`[auto-confirm] 订单 ${order.id} 处理失败:`, err.message)
    }
  }

  console.info(`[auto-confirm] 完成：扫描 ${orders.length} 单，确认 ${confirmed} 单`)
  return { scanned: orders.length, confirmed }
}

module.exports = autoConfirm
