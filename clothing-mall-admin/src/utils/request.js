/**
 * 请求层 — CloudBase callFunction 兼容层
 *
 * 保持与原 axios request() 相同的签名和返回值形状：
 *   request({ url, method, params, data }) → { data: { errno, errmsg, data } }
 * 内部通过 ROUTE_MAP 将 URL 映射为云函数调用。
 */
import { Message, MessageBox } from 'element-ui'
import store from '@/store'
import { getToken } from '@/utils/auth'
import app from './cloudbase'

// ==================== ROUTE_MAP ====================
// 格式：
//   'path': ['functionName', 'action']           — GET/POST 统一
//   'path': { GET: [...], POST: [...] }          — 按 method 分发

const ROUTE_MAP = {
  // ---- admin-auth ----
  'auth/login': ['admin-auth', 'login'],
  'auth/logout': ['admin-auth', 'logout'],
  'auth/info': ['admin-auth', 'info'],
  'auth/kaptcha': ['admin-auth', 'kaptcha'],
  'admin/list': ['admin-auth', 'adminList'],
  'admin/create': ['admin-auth', 'adminCreate'],
  'admin/readmin': ['admin-auth', 'adminRead'],
  'admin/update': ['admin-auth', 'adminUpdate'],
  'admin/delete': ['admin-auth', 'adminDelete'],
  'role/list': ['admin-auth', 'roleList'],
  'role/create': ['admin-auth', 'roleCreate'],
  'role/read': ['admin-auth', 'roleRead'],
  'role/update': ['admin-auth', 'roleUpdate'],
  'role/delete': ['admin-auth', 'roleDelete'],
  'role/permissions': { GET: ['admin-auth', 'getPermissions'], POST: ['admin-auth', 'updatePermissions'] },
  'role/options': ['admin-auth', 'roleOptions'],
  'profile/password': ['admin-auth', 'profilePassword'],
  'profile/nnotice': ['admin-auth', 'nnotice'],
  'profile/lsnotice': ['admin-auth', 'lsnotice'],
  'profile/catnotice': ['admin-auth', 'catnotice'],
  'profile/bcatnotice': ['admin-auth', 'bcatnotice'],
  'profile/rmnotice': ['admin-auth', 'rmnotice'],
  'profile/brmnotice': ['admin-auth', 'brmnotice'],

  // ---- admin-goods ----
  'goods/list': ['admin-goods', 'goodsList'],
  'goods/delete': ['admin-goods', 'goodsDelete'],
  'goods/create': ['admin-goods', 'goodsCreate'],
  'goods/detail': ['admin-goods', 'goodsDetail'],
  'goods/update': ['admin-goods', 'goodsUpdate'],
  'goods/catAndBrand': ['admin-goods', 'catAndBrand'],
  'goods/findBySn': ['admin-goods', 'goodsFindBySn'],
  'goods/publish': ['admin-goods', 'goodsPublish'],
  'goods/unpublish': ['admin-goods', 'goodsUnpublish'],
  'goods/unpublishAll': ['admin-goods', 'goodsUnpublishAll'],
  'goods/recognizeImage': ['admin-goods', 'goodsRecognizeImage'],
  'goods/recognizeTag': ['admin-goods', 'goodsRecognizeTag'],
  'category/list': ['admin-goods', 'categoryList'],
  'category/l1': ['admin-goods', 'categoryL1'],
  'category/create': ['admin-goods', 'categoryCreate'],
  'category/read': ['admin-goods', 'categoryRead'],
  'category/update': ['admin-goods', 'categoryUpdate'],
  'category/delete': ['admin-goods', 'categoryDelete'],
  'brand/list': ['admin-goods', 'brandList'],
  'brand/create': ['admin-goods', 'brandCreate'],
  'brand/read': ['admin-goods', 'brandRead'],
  'brand/update': ['admin-goods', 'brandUpdate'],
  'brand/delete': ['admin-goods', 'brandDelete'],
  'shipper/list': ['admin-goods', 'shipperList'],
  'shipper/create': ['admin-goods', 'shipperCreate'],
  'shipper/read': ['admin-goods', 'shipperRead'],
  'shipper/update': ['admin-goods', 'shipperUpdate'],
  'shipper/delete': ['admin-goods', 'shipperDelete'],
  'shipper/toggle': ['admin-goods', 'shipperToggle'],

  // ---- admin-order ----
  'order/list': ['admin-order', 'orderList'],
  'order/overview': ['admin-order', 'orderOverview'],
  'order/detail': ['admin-order', 'orderDetail'],
  'order/ship': ['admin-order', 'orderShip'],
  'order/refund': ['admin-order', 'orderRefund'],
  'order/pay': ['admin-order', 'orderPay'],
  'order/delete': ['admin-order', 'orderDelete'],
  'order/reply': ['admin-order', 'orderReply'],
  'order/channel': ['admin-order', 'orderChannel'],
  'aftersale/list': ['admin-order', 'aftersaleList'],
  'aftersale/overview': ['admin-order', 'aftersaleOverview'],
  'aftersale/recept': ['admin-order', 'aftersaleRecept'],
  'aftersale/batch-recept': ['admin-order', 'aftersaleBatchRecept'],
  'aftersale/reject': ['admin-order', 'aftersaleReject'],
  'aftersale/batch-reject': ['admin-order', 'aftersaleBatchReject'],
  'aftersale/refund': ['admin-order', 'orderRefund'],
  'aftersale/ship': ['admin-order', 'aftersaleShip'],
  'aftersale/complete': ['admin-order', 'aftersaleComplete'],

  // ---- admin-stat ----
  'stat/user': ['admin-stat', 'statUser'],
  'stat/order': ['admin-stat', 'statOrder'],
  'stat/goods': ['admin-stat', 'statGoods'],
  'stat/growth': ['admin-stat', 'statGrowth'],
  'stat/retention': ['admin-stat', 'statRetention'],
  'stat/tracker/overview': ['admin-stat', 'statTrackerOverview'],
  'stat/tracker/trend': ['admin-stat', 'statTrackerTrend'],
  'stat/tracker/pages': ['admin-stat', 'statTrackerPages'],
  'stat/active-users': ['admin-stat', 'statActiveUsers'],
  'stat/revenue/overview': ['admin-stat', 'statRevenueOverview'],
  'stat/revenue/scene': ['admin-stat', 'statRevenueScene'],
  'stat/revenue/category': ['admin-stat', 'statRevenueCategory'],
  'stat/revenue/season/overview': ['admin-stat', 'statRevenueSeasonOverview'],
  'stat/revenue/season/hot-goods': ['admin-stat', 'statRevenueSeasonHotGoods'],
  'stat/dashboard/sales': ['admin-stat', 'statDashboardSales'],
  'stat/dashboard/conversion': ['admin-stat', 'statDashboardConversion'],
  'dashboard': ['admin-stat', 'dashboardInfo'],

  // ---- admin-config (GET=list, POST=update) ----
  'config/mall': { GET: ['admin-config', 'mallList'], POST: ['admin-config', 'mallUpdate'] },
  'config/express': { GET: ['admin-config', 'expressList'], POST: ['admin-config', 'expressUpdate'] },
  'config/order': { GET: ['admin-config', 'orderList'], POST: ['admin-config', 'orderUpdate'] },
  'config/wx': { GET: ['admin-config', 'wxList'], POST: ['admin-config', 'wxUpdate'] },
  'config/promotion': { GET: ['admin-config', 'promotionList'], POST: ['admin-config', 'promotionUpdate'] },
  'homeActivity': { GET: ['admin-config', 'homeActivityList'], POST: ['admin-config', 'homeActivityUpdate'] },

  // ---- admin-content ----
  'notice/list': ['admin-content', 'noticeList'],
  'notice/create': ['admin-content', 'noticeCreate'],
  'notice/read': ['admin-content', 'noticeRead'],
  'notice/update': ['admin-content', 'noticeUpdate'],
  'notice/delete': ['admin-content', 'noticeDelete'],
  'notice/batch-delete': ['admin-content', 'noticeBatchDelete'],
  'issue/list': ['admin-content', 'issueList'],
  'issue/create': ['admin-content', 'issueCreate'],
  'issue/read': ['admin-content', 'issueRead'],
  'issue/update': ['admin-content', 'issueUpdate'],
  'issue/delete': ['admin-content', 'issueDelete'],
  'keyword/list': ['admin-content', 'keywordList'],
  'keyword/create': ['admin-content', 'keywordCreate'],
  'keyword/read': ['admin-content', 'keywordRead'],
  'keyword/update': ['admin-content', 'keywordUpdate'],
  'keyword/delete': ['admin-content', 'keywordDelete'],
  'feedback/list': ['admin-content', 'feedbackList'],
  'ad/list': ['admin-content', 'adList'],
  'ad/create': ['admin-content', 'adCreate'],
  'ad/read': ['admin-content', 'adRead'],
  'ad/update': ['admin-content', 'adUpdate'],
  'ad/delete': ['admin-content', 'adDelete'],

  // ---- admin-marketing ----
  'coupon/list': ['admin-marketing', 'couponList'],
  'coupon/create': ['admin-marketing', 'couponCreate'],
  'coupon/read': ['admin-marketing', 'couponRead'],
  'coupon/update': ['admin-marketing', 'couponUpdate'],
  'coupon/delete': ['admin-marketing', 'couponDelete'],
  'coupon/listuser': ['admin-marketing', 'couponListuser'],
  'outfit/list': ['admin-marketing', 'outfitList'],
  'outfit/create': ['admin-marketing', 'outfitCreate'],
  'outfit/read': ['admin-marketing', 'outfitRead'],
  'outfit/update': ['admin-marketing', 'outfitUpdate'],
  'outfit/delete': ['admin-marketing', 'outfitDelete'],

  // ---- admin-user ----
  'user/list': ['admin-user', 'userList'],
  'user/detail': ['admin-user', 'userDetail'],
  'user/update': ['admin-user', 'userUpdate'],
  'address/list': ['admin-user', 'addressList'],
  'collect/list': ['admin-user', 'collectList'],
  'footprint/list': ['admin-user', 'footprintList'],
  'history/list': ['admin-stat', 'historyList'],

  // ---- admin-system ----
  'log/list': ['admin-system', 'logList'],
  'region/list': ['admin-system', 'regionList'],
  'region/clist': ['admin-system', 'regionClist'],

  // ---- admin-clothing ----
  'clothing/store/list': ['admin-clothing', 'storeList'],
  'clothing/store/create': ['admin-clothing', 'storeCreate'],
  'clothing/store/update': ['admin-clothing', 'storeUpdate'],
  'clothing/store/delete': ['admin-clothing', 'storeDelete'],
  'clothing/guide/list': ['admin-clothing', 'guideList'],
  'clothing/guide/create': ['admin-clothing', 'guideCreate'],
  'clothing/guide/update': ['admin-clothing', 'guideUpdate'],
  'clothing/guide/delete': ['admin-clothing', 'guideDelete'],
  'clothing/scene/list': ['admin-clothing', 'sceneList'],
  'clothing/scene/create': ['admin-clothing', 'sceneCreate'],
  'clothing/scene/update': ['admin-clothing', 'sceneUpdate'],
  'clothing/scene/delete': ['admin-clothing', 'sceneDelete'],
  'clothing/scene/enable': ['admin-clothing', 'sceneEnable'],
  'clothing/scene/goods': ['admin-clothing', 'sceneGoods'],
  'clothing/scene/goods/update': ['admin-clothing', 'sceneGoodsUpdate'],
  'clothing/holiday/list': ['admin-clothing', 'holidayList'],
  'clothing/holiday/create': ['admin-clothing', 'holidayCreate'],
  'clothing/holiday/update': ['admin-clothing', 'holidayUpdate'],
  'clothing/holiday/delete': ['admin-clothing', 'holidayDelete'],
  'clothing/holiday/enable': ['admin-clothing', 'holidayEnable'],
  'clothing/holiday/goods': ['admin-clothing', 'holidayGoods'],
  'clothing/holiday/goods/update': ['admin-clothing', 'holidayGoodsUpdate'],

  // ---- admin-wework ----
  'wework/tags': ['admin-wework', 'weworkTags'],
  'wework/pages': ['admin-wework', 'weworkPages'],
  'wework/uploadMedia': ['admin-wework', 'weworkUploadMedia'],
  'wework/sendCard': ['admin-wework', 'weworkSendCard'],
  'wework/sendMessage': ['admin-wework', 'weworkSendMessage'],
  'wework/pushGroups': ['admin-wework', 'weworkPushGroups'],
  'push/group/list': ['admin-wework', 'pushGroupList'],
  'push/group/detail': ['admin-wework', 'pushGroupDetail'],
  'push/group/create': ['admin-wework', 'pushGroupCreate'],
  'push/group/update': ['admin-wework', 'pushGroupUpdate'],
  'push/group/delete': ['admin-wework', 'pushGroupDelete'],
}

// ==================== 路由解析 ====================

function resolveRoute(url, method) {
  // 去掉 baseURL 前缀（/admin）
  const path = (url || '').replace(/^\/admin\/?/, '').replace(/^\//, '')
  const entry = ROUTE_MAP[path]
  if (!entry) return null

  // method 分发
  if (Array.isArray(entry)) return entry
  const m = (method || 'get').toUpperCase()
  return entry[m] || entry.GET || null
}

// ==================== 错误处理（与原 interceptor 一致） ====================

function handleErrno(res) {
  if (res.errno === 501) {
    if (window.location.hash === '#/login') return Promise.reject('error')
    MessageBox.alert('系统未登录，请重新登录', '错误', {
      confirmButtonText: '确定',
      type: 'error'
    }).then(() => {
      store.dispatch('FedLogOut').then(() => {
        location.reload()
      })
    })
    return Promise.reject('error')
  }
  if (res.errno === 502) {
    MessageBox.alert('系统内部错误，请联系管理员维护', '错误', {
      confirmButtonText: '确定',
      type: 'error'
    })
    return Promise.reject('error')
  }
  if (res.errno === 503) {
    MessageBox.alert('请求业务目前未支持', '警告', {
      confirmButtonText: '确定',
      type: 'error'
    })
    return Promise.reject('error')
  }
  if (res.errno === 504) {
    MessageBox.alert('更新数据已经失效，请刷新页面重新操作', '警告', {
      confirmButtonText: '确定',
      type: 'error'
    })
    return Promise.reject('error')
  }
  if (res.errno === 505) {
    MessageBox.alert('更新失败，请再尝试一次', '警告', {
      confirmButtonText: '确定',
      type: 'error'
    })
    return Promise.reject('error')
  }
  if (res.errno === 506) {
    MessageBox.alert('没有操作权限，请联系管理员授权', '错误', {
      confirmButtonText: '确定',
      type: 'error'
    })
    return Promise.reject('error')
  }
  if (res.errno !== 0) {
    // 非 5xx 的业务错误，留给页面处理
    return Promise.reject({ data: res })
  }
  return null
}

// ==================== snake_case → camelCase 转换 ====================
// 云函数从 MySQL 返回 snake_case 字段，Vue 模板期望 camelCase（原 Java Jackson 行为）

function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function camelize(obj) {
  if (Array.isArray(obj)) return obj.map(camelize)
  if (obj !== null && typeof obj === 'object') {
    const out = {}
    for (const key of Object.keys(obj)) {
      // 配置 KV 的 key（如 litemall_express_*, litemall_mall_*）保持原样
      const isConfigKey = key.startsWith('litemall_')
      out[isConfigKey ? key : snakeToCamel(key)] = camelize(obj[key])
    }
    return out
  }
  return obj
}

// ==================== 主请求函数 ====================

async function request(config) {
  const { url, method, params, data } = config

  const route = resolveRoute(url, method)
  if (!route) {
    console.warn('[request] 未映射的 API:', url)
    return Promise.reject({ data: { errno: -1, errmsg: '未映射的 API: ' + url } })
  }

  const [functionName, action] = route

  // GET → params 作为 payload，POST → data 作为 payload
  const payload = { ...(method === 'get' ? params : data) || {} }

  // 注入 token（adminAuthMiddleware 从 event.data.token 读取）
  const token = getToken()
  if (token) payload.token = token

  try {
    const res = await app.callFunction({
      name: functionName,
      data: { action, data: payload }
    })

    const result = camelize(res.result)

    // 错误处理
    const errResult = handleErrno(result)
    if (errResult) return errResult

    // 返回与 axios response 形状一致的对象
    return { data: result }
  } catch (err) {
    console.error('[request] callFunction error:', functionName, action, err)
    Message({
      message: '云函数调用失败: ' + (err.message || err.errMsg || ''),
      type: 'error',
      duration: 5 * 1000
    })
    return Promise.reject(err)
  }
}

export default request
