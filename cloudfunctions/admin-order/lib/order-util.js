/**
 * admin-order/lib/order-util.js — 订单状态常量
 */
const STATUS = {
  CREATE: 101,
  CANCEL: 102,
  AUTO_CANCEL: 103,
  ADMIN_CANCEL: 104,
  PAY: 201,
  REFUND: 202,
  REFUND_CONFIRM: 203,
  SHIP: 301,
  CONFIRM: 401,
  AUTO_CONFIRM: 402,
  VERIFY_PENDING: 501,
  VERIFIED: 502,
  VERIFY_EXPIRED: 503,
  VERIFY_REFUND: 504,
}

function orderStatusText(order) {
  const map = {
    [STATUS.CREATE]: '未付款',
    [STATUS.CANCEL]: '已取消',
    [STATUS.AUTO_CANCEL]: '已取消(系统)',
    [STATUS.PAY]: '已付款',
    [STATUS.REFUND]: '订单取消，退款中',
    [STATUS.REFUND_CONFIRM]: '已退款',
    [STATUS.SHIP]: '已发货',
    [STATUS.CONFIRM]: '已收货',
    [STATUS.AUTO_CONFIRM]: '已收货(系统)',
    [STATUS.VERIFY_PENDING]: '待核销',
    [STATUS.VERIFIED]: '已核销',
    [STATUS.VERIFY_EXPIRED]: '核销过期',
    [STATUS.VERIFY_REFUND]: '核销退款',
    [STATUS.ADMIN_CANCEL]: '已取消(管理员)',
  }
  return map[order.order_status] || '未知状态'
}

const AS_STATUS = {
  INIT: 0,
  REQUEST: 1,
  RECEPT: 2,
  SHIPPED: 3,
  REJECT: 4,
  CANCEL: 5,
  COMPLETED: 6,
}

function aftersaleStatusText(status) {
  const map = {
    [AS_STATUS.REQUEST]: '待审核',
    [AS_STATUS.RECEPT]: '审核通过',
    [AS_STATUS.SHIPPED]: '换货已发货',
    [AS_STATUS.REJECT]: '已拒绝',
    [AS_STATUS.CANCEL]: '已取消',
    [AS_STATUS.COMPLETED]: '已完成',
  }
  return map[status] || '未知'
}

module.exports = { STATUS, AS_STATUS, orderStatusText, aftersaleStatusText }
