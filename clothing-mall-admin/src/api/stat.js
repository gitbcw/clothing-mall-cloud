import request from '@/utils/request'

export function statUser(query) {
  return request({
    url: '/stat/user',
    method: 'get',
    params: query
  })
}

export function statOrder(query) {
  return request({
    url: '/stat/order',
    method: 'get',
    params: query
  })
}

export function statGoods(query) {
  return request({
    url: '/stat/goods',
    method: 'get',
    params: query
  })
}

// 增长统计
export function statGrowth(query) {
  return request({
    url: '/stat/growth',
    method: 'get',
    params: query
  })
}

// 留存统计
export function statRetention(query) {
  return request({
    url: '/stat/retention',
    method: 'get',
    params: query
  })
}

// 埋点统计 - 概览
export function statTrackerOverview(query) {
  return request({
    url: '/stat/tracker/overview',
    method: 'get',
    params: query
  })
}

// 埋点统计 - 趋势
export function statTrackerTrend(query) {
  return request({
    url: '/stat/tracker/trend',
    method: 'get',
    params: query
  })
}

// 埋点统计 - 页面排行
export function statTrackerPages(query) {
  return request({
    url: '/stat/tracker/pages',
    method: 'get',
    params: query
  })
}

// 活跃用户统计 (WAU/MAU)
export function statActiveUsers() {
  return request({
    url: '/stat/active-users',
    method: 'get'
  })
}

// ==================== 营收分析 API ====================

// 营收总览
export function statRevenueOverview(query) {
  return request({
    url: '/stat/revenue/overview',
    method: 'get',
    params: query
  })
}

// 场景销售
export function statRevenueScene(query) {
  return request({
    url: '/stat/revenue/scene',
    method: 'get',
    params: query
  })
}

// 分类销售
export function statRevenueCategory(query) {
  return request({
    url: '/stat/revenue/category',
    method: 'get',
    params: query
  })
}

// 季节概览
export function statRevenueSeasonOverview(query) {
  return request({
    url: '/stat/revenue/season/overview',
    method: 'get',
    params: query
  })
}

// 季节热销商品
export function statRevenueSeasonHotGoods(query) {
  return request({
    url: '/stat/revenue/season/hot-goods',
    method: 'get',
    params: query
  })
}
