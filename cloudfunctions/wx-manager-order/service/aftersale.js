/**
 * 管理端售后接口
 *
 * 迁移自 WxManagerOrderController 售后部分
 * 接口：aftersaleList, aftersaleRecept, aftersaleReject, aftersaleShip
 */

const { db, response } = require('layer-base')
const { AS_STATUS, aftersaleStatusText, aftersaleTypeText } = require('../lib/order-util')

function toOrderGoodsCamel(r) {
  return {
    id: r.id, goodsName: r.goods_name, goodsId: r.goods_id,
    number: r.number, picUrl: r.pic_url, specifications: r.specifications,
    price: r.price, productId: r.product_id,
  }
}

const AFTERSALE_PENDING_STATUSES = [AS_STATUS.REQUEST, AS_STATUS.RECEPT]
const AFTERSALE_DONE_STATUSES = [AS_STATUS.REJECT, AS_STATUS.CANCEL, AS_STATUS.COMPLETED]

// ==================== 售后列表 ====================

async function aftersaleList(data) {
  const tab = data.tab || 'pending'
  const page = data.page || 1
  const limit = data.limit || 20
  const offset = (page - 1) * limit

  const statusArray = tab === 'done' ? AFTERSALE_DONE_STATUSES : AFTERSALE_PENDING_STATUSES

  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM litemall_aftersale WHERE deleted = 0 AND status IN (${statusArray.map(() => '?').join(',')})`,
    statusArray
  )
  const total = countResult[0].total

  const rows = await db.query(
    `SELECT * FROM litemall_aftersale WHERE deleted = 0 AND status IN (${statusArray.map(() => '?').join(',')})
     ORDER BY add_time DESC LIMIT ${offset}, ${limit}`,
    statusArray
  )

  const resultList = []
  for (const a of rows) {
    const item = {
      id: a.id,
      aftersaleSn: a.aftersale_sn,
      orderId: a.order_id,
      type: a.type,
      typeText: aftersaleTypeText(a.type),
      status: a.status,
      statusText: aftersaleStatusText(a.status),
      reason: a.reason,
      amount: a.amount,
      addTime: a.add_time,
      handleTime: a.handle_time,
    }

    // 关联订单信息
    const orderRows = await db.query(
      `SELECT order_sn, consignee, mobile FROM litemall_order WHERE id = ? AND deleted = 0 LIMIT 1`,
      [a.order_id]
    )
    if (orderRows.length > 0) {
      item.orderSn = orderRows[0].order_sn
      item.consignee = orderRows[0].consignee
      item.mobile = orderRows[0].mobile
    }

    // 关联订单商品
    const goodsRows = await db.query(
      `SELECT * FROM litemall_order_goods WHERE order_id = ? AND deleted = 0`,
      [a.order_id]
    )
    for (const g of goodsRows) {
      if (typeof g.specifications === 'string') {
        try { g.specifications = JSON.parse(g.specifications) } catch (e) { /* ignore */ }
      }
    }
    item.goodsList = goodsRows.map(toOrderGoodsCamel)

    resultList.push(item)
  }

  const [pendingCount, doneCount] = await Promise.all([
    db.query(`SELECT COUNT(*) as c FROM litemall_aftersale WHERE deleted = 0 AND status IN (${AFTERSALE_PENDING_STATUSES.map(() => '?').join(',')})`, AFTERSALE_PENDING_STATUSES),
    db.query(`SELECT COUNT(*) as c FROM litemall_aftersale WHERE deleted = 0 AND status IN (${AFTERSALE_DONE_STATUSES.map(() => '?').join(',')})`, AFTERSALE_DONE_STATUSES),
  ])

  return response.ok({
    list: resultList,
    total,
    pendingCount: pendingCount[0].c,
    doneCount: doneCount[0].c,
  })
}

// ==================== 审核通过 ====================

async function aftersaleRecept(data) {
  const { id } = data
  if (!id) return response.badArgument()

  const rows = await db.query(
    `SELECT * FROM litemall_aftersale WHERE id = ? AND deleted = 0 LIMIT 1`,
    [id]
  )
  if (rows.length === 0) return response.badArgumentValue()

  const aftersale = rows[0]
  if (aftersale.status !== AS_STATUS.REQUEST) {
    return response.fail(403, '当前状态不允许审核')
  }

  await db.query(
    `UPDATE litemall_aftersale SET status = ?, handle_time = NOW() WHERE id = ?`,
    [AS_STATUS.RECEPT, id]
  )
  await db.query(
    `UPDATE litemall_order SET aftersale_status = ? WHERE id = ?`,
    [AS_STATUS.RECEPT, aftersale.order_id]
  )

  return response.ok()
}

// ==================== 审核拒绝 ====================

async function aftersaleReject(data) {
  const { id } = data
  if (!id) return response.badArgument()

  const rows = await db.query(
    `SELECT * FROM litemall_aftersale WHERE id = ? AND deleted = 0 LIMIT 1`,
    [id]
  )
  if (rows.length === 0) return response.badArgumentValue()

  const aftersale = rows[0]
  if (aftersale.status !== AS_STATUS.REQUEST) {
    return response.fail(403, '当前状态不允许拒绝')
  }

  await db.query(
    `UPDATE litemall_aftersale SET status = ?, handle_time = NOW() WHERE id = ?`,
    [AS_STATUS.REJECT, id]
  )
  await db.query(
    `UPDATE litemall_order SET aftersale_status = ? WHERE id = ?`,
    [AS_STATUS.REJECT, aftersale.order_id]
  )

  return response.ok()
}

// ==================== 换货发货 ====================

async function aftersaleShip(data) {
  const { id, shipSn, shipChannel } = data
  if (!id || !shipSn || !shipChannel) return response.badArgument()

  const rows = await db.query(
    `SELECT * FROM litemall_aftersale WHERE id = ? AND deleted = 0 LIMIT 1`,
    [id]
  )
  if (rows.length === 0) return response.badArgumentValue()

  const aftersale = rows[0]
  if (aftersale.status !== AS_STATUS.RECEPT) {
    return response.fail(403, '当前状态不允许发货，请先审核通过')
  }

  await db.query(
    `UPDATE litemall_aftersale SET status = ?, handle_time = NOW(), ship_sn = ?, ship_channel = ? WHERE id = ?`,
    [AS_STATUS.SHIPPED, shipSn, shipChannel, id]
  )
  await db.query(
    `UPDATE litemall_order SET aftersale_status = ? WHERE id = ?`,
    [AS_STATUS.SHIPPED, aftersale.order_id]
  )

  return response.ok()
}

module.exports = {
  aftersaleList, aftersaleRecept, aftersaleReject, aftersaleShip,
}
