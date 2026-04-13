/**
 * 订单状态工具
 *
 * 迁移自 OrderUtil.java, OrderHandleOption.java
 */

// ==================== 订单状态常量 ====================

const STATUS = {
  CREATE: 101,         // 订单生成，未支付
  CANCEL: 102,         // 用户取消
  AUTO_CANCEL: 103,    // 系统自动取消
  ADMIN_CANCEL: 104,   // 管理员取消
  PAY: 201,            // 已支付，待发货
  REFUND: 202,         // 申请退款中
  REFUND_CONFIRM: 203, // 已退款
  SHIP: 301,           // 已发货，待收货
  CONFIRM: 401,        // 用户确认收货
  AUTO_CONFIRM: 402,   // 系统自动确认收货
  VERIFY_PENDING: 501, // 待核销（自提）
  VERIFIED: 502,       // 已核销
  VERIFY_EXPIRED: 503, // 核销过期
  VERIFY_REFUND: 504,  // 核销退款
}

/**
 * 订单状态文本
 */
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
  }
  return map[order.order_status] || '未知状态'
}

/**
 * 构建订单可操作选项
 */
function buildHandleOption(order) {
  const s = order.order_status
  const option = {
    cancel: false, delete: false, pay: false,
    confirm: false, refund: false, rebuy: false, aftersale: false,
  }

  if (s === STATUS.CREATE) {
    option.cancel = true
    option.pay = true
  } else if (s === STATUS.CANCEL || s === STATUS.AUTO_CANCEL) {
    option.delete = true
  } else if (s === STATUS.PAY) {
    option.refund = true
  } else if (s === STATUS.REFUND) {
    // 退款中无操作
  } else if (s === STATUS.REFUND_CONFIRM) {
    option.delete = true
  } else if (s === STATUS.SHIP) {
    option.confirm = true
  } else if (s === STATUS.CONFIRM || s === STATUS.AUTO_CONFIRM) {
    option.delete = true
    option.rebuy = true
    option.aftersale = true
  } else if (s === STATUS.VERIFY_PENDING) {
    option.refund = true
  } else if (s === STATUS.VERIFIED) {
    option.delete = true
    option.rebuy = true
    option.aftersale = true
  } else if (s === STATUS.VERIFY_EXPIRED) {
    option.delete = true
    option.refund = true
  } else if (s === STATUS.VERIFY_REFUND) {
    option.delete = true
  }

  return option
}

/**
 * 根据 showType 获取订单状态列表
 */
function orderStatusFilter(showType) {
  if (!showType || showType === 0) {
    // 全部订单：排除取消类状态
    return [
      STATUS.CREATE, STATUS.PAY, STATUS.REFUND, STATUS.REFUND_CONFIRM,
      STATUS.SHIP, STATUS.CONFIRM, STATUS.AUTO_CONFIRM,
      STATUS.VERIFY_PENDING, STATUS.VERIFIED, STATUS.VERIFY_EXPIRED, STATUS.VERIFY_REFUND,
    ]
  }

  switch (showType) {
    case 1: return [STATUS.CREATE]                   // 待付款
    case 2: return [STATUS.PAY]                       // 待发货
    case 3: return [STATUS.SHIP, STATUS.VERIFY_PENDING] // 待收货/核销
    case 4: return [STATUS.CONFIRM, STATUS.AUTO_CONFIRM, STATUS.VERIFIED] // 已完成
    default: return null
  }
}

function isConfirmStatus(order) {
  return order.order_status === STATUS.CONFIRM
}

function isAutoConfirmStatus(order) {
  return order.order_status === STATUS.AUTO_CONFIRM
}

module.exports = {
  STATUS,
  orderStatusText,
  buildHandleOption,
  orderStatusFilter,
  isConfirmStatus,
  isAutoConfirmStatus,
}
