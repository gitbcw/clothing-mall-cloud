/**
 * 取消超时未付款订单
 *
 * 轮询扫描 order_status=101 且 add_time 超过配置分钟数的订单，
 * 逐单处理：乐观锁更新状态 → 恢复库存 → 释放优惠券。
 * 移植自 Java OrderUnpaidTask（原 DelayQueue → 轮询）。
 */
const { query, execute } = require('layer-base').db
const { systemConfig } = require('layer-base')

const BATCH_SIZE = 100

async function cancelUnpaid() {
  await systemConfig.loadConfigs()
  const unpaidMinutes = Math.max(systemConfig.getOrderUnpaid(), 1)

  const orders = await query(
    `SELECT id, update_time FROM litemall_order
     WHERE order_status = 101
       AND add_time < DATE_SUB(NOW(), INTERVAL ? MINUTE)
       AND deleted = 0
     LIMIT ${BATCH_SIZE}`,
    [unpaidMinutes]
  )

  let cancelled = 0
  for (const order of orders) {
    try {
      await processOrder(order)
      cancelled++
    } catch (err) {
      console.error(`[cancel-unpaid] 订单 ${order.id} 处理失败:`, err.message)
    }
  }

  console.info(`[cancel-unpaid] 完成：扫描 ${orders.length} 单，取消 ${cancelled} 单`)
  return { scanned: orders.length, cancelled }
}

async function processOrder(order) {
  // 1. 乐观锁更新订单状态为 103（系统自动取消）
  const { affectedRows } = await execute(
    `UPDATE litemall_order
     SET order_status = 103, end_time = NOW(), update_time = NOW()
     WHERE id = ? AND update_time = ?`,
    [order.id, order.update_time]
  )
  if (affectedRows === 0) {
    throw new Error('乐观锁失败，数据已被修改')
  }

  // 2. 恢复商品库存
  const goodsList = await query(
    `SELECT goods_id, product_id, number FROM litemall_order_goods WHERE order_id = ?`,
    [order.id]
  )
  for (const item of goodsList) {
    await execute(
      `UPDATE litemall_goods_product SET number = number + ?, update_time = NOW() WHERE id = ?`,
      [item.number, item.product_id]
    )
  }

  // 3. 释放优惠券
  await execute(
    `UPDATE litemall_coupon_user SET status = 0, update_time = NOW()
     WHERE order_id = ? AND deleted = 0`,
    [order.id]
  )
}

module.exports = cancelUnpaid
