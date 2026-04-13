/**
 * 数据埋点工具
 * 用于记录用户行为数据
 */

const util = require('./util.js')

// 埋点事件类型
const EventType = {
  // 页面浏览
  PAGE_VIEW: 'page_view',
  // 商品浏览
  GOODS_VIEW: 'goods_view',
  // 搜索
  SEARCH: 'search',
  // 加购
  ADD_CART: 'add_cart',
  // 收藏
  COLLECT: 'collect',
  // 下单
  ORDER_CREATE: 'order_create',
  // 支付
  ORDER_PAY: 'order_pay',
  // 分享
  SHARE: 'share',
  // 点击
  CLICK: 'click'
}

// 本地缓存key
const CACHE_KEY = 'tracker_events'
const MAX_CACHE_SIZE = 50

/**
 * 获取缓存的事件列表
 */
function getCachedEvents() {
  try {
    const events = wx.getStorageSync(CACHE_KEY)
    return events ? JSON.parse(events) : []
  } catch (e) {
    return []
  }
}

/**
 * 保存事件到缓存
 */
function saveCachedEvents(events) {
  try {
    wx.setStorageSync(CACHE_KEY, JSON.stringify(events))
  } catch (e) {
    console.error('保存埋点数据失败', e)
  }
}

/**
 * 获取设备信息
 */
function getDeviceInfo() {
  const deviceInfo = wx.getDeviceInfo()
  const appBaseInfo = wx.getAppBaseInfo()
  return {
    model: deviceInfo.model,
    platform: deviceInfo.platform,
    system: deviceInfo.system,
    SDKVersion: appBaseInfo.SDKVersion,
    version: appBaseInfo.version
  }
}

/**
 * 获取用户信息
 */
function getUserInfo() {
  const userInfo = wx.getStorageSync('userInfo')
  return {
    userId: userInfo ? userInfo.id : null,
    hasLogin: !!userInfo
  }
}

/**
 * 记录事件
 * @param {string} eventType 事件类型
 * @param {object} data 事件数据
 */
function track(eventType, data = {}) {
  const event = {
    type: eventType,
    data: data,
    timestamp: Date.now(),
    device: getDeviceInfo(),
    user: getUserInfo(),
    page: getCurrentPageRoute()
  }

  // 添加到缓存
  let events = getCachedEvents()
  events.push(event)

  // 限制缓存大小
  if (events.length > MAX_CACHE_SIZE) {
    events = events.slice(-MAX_CACHE_SIZE)
  }

  saveCachedEvents(events)

  // 尝试上报
  reportIfNeeded()
}

/**
 * 获取当前页面路由
 */
function getCurrentPageRoute() {
  const pages = getCurrentPages()
  if (pages.length > 0) {
    const currentPage = pages[pages.length - 1]
    return currentPage.route
  }
  return ''
}

/**
 * 检查并上报数据
 */
function reportIfNeeded() {
  const events = getCachedEvents()
  if (events.length >= 10) {
    report()
  }
}

/**
 * 上报埋点数据到服务器
 */
function report() {
  const events = getCachedEvents()
  if (events.length === 0) return

  // 使用项目统一的 util.request 上报到服务器
  util.request({ func: 'wx-tracker', action: 'report' }, { events }, 'POST').then(res => {
    if (res.errno === 0) {
      // 上报成功，清空缓存
      saveCachedEvents([])
      console.log('[埋点上报] 成功上报', events.length, '条事件')
    } else {
      console.error('[埋点上报] 上报失败:', res.errmsg)
    }
  }).catch(err => {
    console.error('[埋点上报] 请求失败:', err)
  })
}

/**
 * 页面浏览埋点
 */
function trackPageView(pageName, params = {}) {
  track(EventType.PAGE_VIEW, {
    page: pageName,
    ...params
  })
}

/**
 * 商品浏览埋点
 */
function trackGoodsView(goodsId, goodsName, price, categoryId) {
  track(EventType.GOODS_VIEW, {
    goodsId,
    goodsName,
    price,
    categoryId
  })
}

/**
 * 搜索埋点
 */
function trackSearch(keyword, resultCount = 0) {
  track(EventType.SEARCH, {
    keyword,
    resultCount
  })
}

/**
 * 加购埋点
 */
function trackAddCart(goodsId, goodsName, price, number, sku) {
  track(EventType.ADD_CART, {
    goodsId,
    goodsName,
    price,
    number,
    sku
  })
}

/**
 * 收藏埋点
 */
function trackCollect(goodsId, goodsName, isCollect) {
  track(EventType.COLLECT, {
    goodsId,
    goodsName,
    action: isCollect ? 'collect' : 'uncollect'
  })
}

/**
 * 下单埋点
 */
function trackOrderCreate(orderId, amount, goodsCount) {
  track(EventType.ORDER_CREATE, {
    orderId,
    amount,
    goodsCount
  })
}

/**
 * 支付埋点
 */
function trackOrderPay(orderId, amount, payMethod = 'wechat') {
  track(EventType.ORDER_PAY, {
    orderId,
    amount,
    payMethod
  })
}

/**
 * 分享埋点
 */
function trackShare(type, contentId, contentType) {
  track(EventType.SHARE, {
    type, // 'friend' | 'timeline'
    contentId,
    contentType
  })
}

/**
 * 点击埋点
 */
function trackClick(element, page, data = {}) {
  track(EventType.CLICK, {
    element,
    page,
    ...data
  })
}

/**
 * 获取统计数据
 */
function getStats() {
  const events = getCachedEvents()

  const stats = {
    total: events.length,
    byType: {},
    recentEvents: events.slice(-10)
  }

  events.forEach(event => {
    if (!stats.byType[event.type]) {
      stats.byType[event.type] = 0
    }
    stats.byType[event.type]++
  })

  return stats
}

/**
 * 清空埋点数据
 */
function clear() {
  saveCachedEvents([])
}

module.exports = {
  EventType,
  track,
  trackPageView,
  trackGoodsView,
  trackSearch,
  trackAddCart,
  trackCollect,
  trackOrderCreate,
  trackOrderPay,
  trackShare,
  trackClick,
  getStats,
  clear,
  report
}
