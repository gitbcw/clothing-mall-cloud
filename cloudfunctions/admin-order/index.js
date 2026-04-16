/**
 * admin-order 云函数入口
 *
 * 订单管理 + 售后管理
 */

const { response } = require('layer-base')
const { adminAuth } = require('layer-auth')

const { query } = require('layer-base').db

const {
  list: orderList, detail: orderDetail, ship: orderShip,
  refund: orderRefund, reply: orderReply, delete: orderDelete,
  overview: orderOverview, channel: orderChannel,
  express: orderExpress, snapshot: orderSnapshot,
  snapshotBySn: orderSnapshotBySn, pay: orderPay, verify: orderVerify,
} = require('./service/order')

const {
  list: aftersaleList, overview: aftersaleOverview,
  recept: aftersaleRecept, batchRecept: aftersaleBatchRecept,
  reject: aftersaleReject, batchReject: aftersaleBatchReject,
  ship: aftersaleShip, complete: aftersaleComplete,
} = require('./service/aftersale')

async function checkPermission(admin, permission) {
  if (!admin || !admin.roleIds || admin.roleIds.length === 0) return false
  if (admin.roleIds.includes(1)) return true
  const placeholders = admin.roleIds.map(() => '?').join(',')
  const rows = await query(
    `SELECT id FROM litemall_permission WHERE role_id IN (${placeholders}) AND permission = ? AND deleted = 0`,
    [...admin.roleIds, permission]
  )
  return rows.length > 0
}

// 免登录接口
const PUBLIC_ACTIONS = ['orderChannel', 'orderExpress', 'orderSnapshot', 'orderSnapshotBySn', 'aftersaleOverview']

const routes = {
  // 订单
  orderList:         { handler: orderList,         permission: 'admin:order:list' },
  orderDetail:       { handler: orderDetail,       permission: 'admin:order:read' },
  orderShip:         { handler: orderShip,         permission: 'admin:order:ship' },
  orderRefund:       { handler: orderRefund,       permission: 'admin:order:refund' },
  orderReply:        { handler: orderReply,        permission: 'admin:order:reply' },
  orderDelete:       { handler: orderDelete,       permission: 'admin:order:delete' },
  orderOverview:     { handler: orderOverview,     permission: 'admin:order:list' },
  orderPay:          { handler: orderPay,          permission: 'admin:order:pay' },
  orderVerify:       { handler: orderVerify,       permission: 'admin:order:ship' },
  orderChannel:      { handler: orderChannel,      permission: null },
  orderExpress:      { handler: orderExpress,      permission: null },
  orderSnapshot:     { handler: orderSnapshot,     permission: null },
  orderSnapshotBySn: { handler: orderSnapshotBySn, permission: null },

  // 售后
  aftersaleList:         { handler: aftersaleList,         permission: 'admin:aftersale:list' },
  aftersaleOverview:     { handler: aftersaleOverview,     permission: null },
  aftersaleRecept:       { handler: aftersaleRecept,       permission: 'admin:aftersale:recept' },
  aftersaleBatchRecept:  { handler: aftersaleBatchRecept,  permission: 'admin:aftersale:batch-recept' },
  aftersaleReject:       { handler: aftersaleReject,       permission: 'admin:aftersale:reject' },
  aftersaleBatchReject:  { handler: aftersaleBatchReject,  permission: 'admin:aftersale:batch-reject' },
  aftersaleShip:         { handler: aftersaleShip,         permission: 'admin:aftersale:ship' },
  aftersaleComplete:     { handler: aftersaleComplete,     permission: 'admin:aftersale:complete' },
}

exports.main = async (event, context) => {
  const { action, data } = event
  const route = routes[action]
  if (!route) return response.fail(404, `未知接口: ${action}`)

  if (!PUBLIC_ACTIONS.includes(action)) {
    const authResult = await adminAuth.adminAuthMiddleware(event)
    if (authResult) return authResult

    if (route.permission) {
      const has = await checkPermission(event._admin, route.permission)
      if (!has) return response.unauthz()
    }

    context._adminId = event._adminId
    context._admin = event._admin
  }

  try {
    return await route.handler(data || {}, context)
  } catch (err) {
    console.error(`[admin-order] action=${action} error:`, err)
    return response.serious()
  }
}
