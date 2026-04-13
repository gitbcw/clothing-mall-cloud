/**
 * admin-order/service/aftersale.js — 管理后台售后管理
 *
 * 接口：list, recept, reject, batchRecept, batchReject, ship, complete, overview
 */
const { db, response, paginate } = require('layer-base')
const { query, execute } = db
const { AS_STATUS, aftersaleStatusText } = require('../lib/order-util')

const SORT_WHITELIST = ['id', 'add_time']
function safeSort(sort, order) {
  const s = SORT_WHITELIST.includes(sort) ? sort : 'add_time'
  const o = order === 'asc' ? 'ASC' : 'DESC'
  return { sort: s, order: o }
}

// ==================== 售后列表 ====================

async function list(data) {
  const { page, limit, offset } = paginate.parsePage({ data })
  const where = ['deleted = 0']
  const params = []

  if (data.orderId) { where.push('order_id = ?'); params.push(data.orderId) }
  if (data.aftersaleSn) { where.push('aftersale_sn = ?'); params.push(data.aftersaleSn) }
  if (data.status !== undefined) { where.push('status = ?'); params.push(data.status) }
  if (Array.isArray(data.statusArray) && data.statusArray.length > 0) {
    const placeholders = data.statusArray.map(() => '?').join(',')
    where.push(`status IN (${placeholders})`)
    params.push(...data.statusArray)
  }

  const whereClause = where.join(' AND ')
  const { sort, order } = safeSort(data.sort, data.order)

  const countRows = await query(`SELECT COUNT(*) AS total FROM litemall_aftersale WHERE ${whereClause}`, params)
  const total = countRows[0] ? countRows[0].total : 0

  const sql = paginate.appendLimit(
    `SELECT * FROM litemall_aftersale WHERE ${whereClause} ORDER BY ${sort} ${order}`,
    offset, limit
  )
  const listRows = await query(sql, params)

  // 附加订单信息
  const resultList = []
  for (const a of listRows) {
    const item = {
      ...a,
      statusText: aftersaleStatusText(a.status),
    }

    const orderRows = await query(
      'SELECT order_sn, consignee, mobile FROM litemall_order WHERE id = ? AND deleted = 0 LIMIT 1',
      [a.order_id]
    )
    if (orderRows.length > 0) {
      item.orderSn = orderRows[0].order_sn
      item.consignee = orderRows[0].consignee
      item.mobile = orderRows[0].mobile
    }

    const goodsRows = await query(
      'SELECT * FROM litemall_order_goods WHERE order_id = ? AND deleted = 0', [a.order_id]
    )
    for (const g of goodsRows) {
      if (typeof g.specifications === 'string') {
        try { g.specifications = JSON.parse(g.specifications) } catch (e) { /* ignore */ }
      }
    }
    item.goodsList = goodsRows
    resultList.push(item)
  }

  return response.okList(resultList, total, page, limit)
}

// ==================== 售后概览 ====================

async function overview() {
  const statusKeys = [
    { key: 'request', code: AS_STATUS.REQUEST },
    { key: 'recept', code: AS_STATUS.RECEPT },
    { key: 'shipped', code: AS_STATUS.SHIPPED },
    { key: 'reject', code: AS_STATUS.REJECT },
    { key: 'cancel', code: AS_STATUS.CANCEL },
    { key: 'completed', code: AS_STATUS.COMPLETED },
  ]

  const result = {}
  for (const s of statusKeys) {
    const rows = await query(
      'SELECT COUNT(*) AS c FROM litemall_aftersale WHERE deleted = 0 AND status = ?', [s.code]
    )
    result[s.key] = rows[0].c
  }

  return response.ok(result)
}

// ==================== 审核通过（单条） ====================

async function recept(data) {
  const { id } = data
  if (!id) return response.badArgument()

  const rows = await query('SELECT * FROM litemall_aftersale WHERE id = ? AND deleted = 0', [id])
  if (rows.length === 0) return response.badArgumentValue()
  if (rows[0].status !== AS_STATUS.REQUEST) return response.fail(403, '当前状态不允许审核')

  await execute(
    'UPDATE litemall_aftersale SET status = ?, handle_time = NOW() WHERE id = ?',
    [AS_STATUS.RECEPT, id]
  )
  await execute(
    'UPDATE litemall_order SET aftersale_status = ? WHERE id = ?',
    [AS_STATUS.RECEPT, rows[0].order_id]
  )

  return response.ok()
}

// ==================== 批量审核通过 ====================

async function batchRecept(data) {
  const { ids } = data
  if (!Array.isArray(ids) || ids.length === 0) return response.badArgument()

  let success = 0
  for (const id of ids) {
    const rows = await query('SELECT * FROM litemall_aftersale WHERE id = ? AND deleted = 0', [id])
    if (rows.length === 0 || rows[0].status !== AS_STATUS.REQUEST) continue

    await execute(
      'UPDATE litemall_aftersale SET status = ?, handle_time = NOW() WHERE id = ?',
      [AS_STATUS.RECEPT, id]
    )
    await execute(
      'UPDATE litemall_order SET aftersale_status = ? WHERE id = ?',
      [AS_STATUS.RECEPT, rows[0].order_id]
    )
    success++
  }

  return response.ok({ success, total: ids.length })
}

// ==================== 审核拒绝（单条） ====================

async function reject(data) {
  const { id } = data
  if (!id) return response.badArgument()

  const rows = await query('SELECT * FROM litemall_aftersale WHERE id = ? AND deleted = 0', [id])
  if (rows.length === 0) return response.badArgumentValue()
  if (rows[0].status !== AS_STATUS.REQUEST) return response.fail(403, '当前状态不允许拒绝')

  await execute(
    'UPDATE litemall_aftersale SET status = ?, handle_time = NOW() WHERE id = ?',
    [AS_STATUS.REJECT, id]
  )
  await execute(
    'UPDATE litemall_order SET aftersale_status = ? WHERE id = ?',
    [AS_STATUS.REJECT, rows[0].order_id]
  )

  return response.ok()
}

// ==================== 批量审核拒绝 ====================

async function batchReject(data) {
  const { ids } = data
  if (!Array.isArray(ids) || ids.length === 0) return response.badArgument()

  let success = 0
  for (const id of ids) {
    const rows = await query('SELECT * FROM litemall_aftersale WHERE id = ? AND deleted = 0', [id])
    if (rows.length === 0 || rows[0].status !== AS_STATUS.REQUEST) continue

    await execute(
      'UPDATE litemall_aftersale SET status = ?, handle_time = NOW() WHERE id = ?',
      [AS_STATUS.REJECT, id]
    )
    await execute(
      'UPDATE litemall_order SET aftersale_status = ? WHERE id = ?',
      [AS_STATUS.REJECT, rows[0].order_id]
    )
    success++
  }

  return response.ok({ success, total: ids.length })
}

// ==================== 换货发货 ====================

async function ship(data) {
  const { id, shipSn, shipChannel } = data
  if (!id || !shipSn || !shipChannel) return response.badArgument()

  const rows = await query('SELECT * FROM litemall_aftersale WHERE id = ? AND deleted = 0', [id])
  if (rows.length === 0) return response.badArgumentValue()
  if (rows[0].status !== AS_STATUS.RECEPT) return response.fail(403, '当前状态不允许发货，请先审核通过')

  await execute(
    'UPDATE litemall_aftersale SET status = ?, handle_time = NOW(), ship_sn = ?, ship_channel = ? WHERE id = ?',
    [AS_STATUS.SHIPPED, shipSn, shipChannel, id]
  )
  await execute(
    'UPDATE litemall_order SET aftersale_status = ? WHERE id = ?',
    [AS_STATUS.SHIPPED, rows[0].order_id]
  )

  return response.ok()
}

// ==================== 换货完成 ====================

async function complete(data) {
  const { id } = data
  if (!id) return response.badArgument()

  const rows = await query('SELECT * FROM litemall_aftersale WHERE id = ? AND deleted = 0', [id])
  if (rows.length === 0) return response.badArgumentValue()
  if (rows[0].status !== AS_STATUS.SHIPPED) return response.fail(403, '当前状态不允许完成')

  await execute(
    'UPDATE litemall_aftersale SET status = ?, handle_time = NOW() WHERE id = ?',
    [AS_STATUS.COMPLETED, id]
  )
  await execute(
    'UPDATE litemall_order SET aftersale_status = ? WHERE id = ?',
    [AS_STATUS.COMPLETED, rows[0].order_id]
  )

  return response.ok()
}

module.exports = { list, overview, recept, batchRecept, reject, batchReject, ship, complete }
