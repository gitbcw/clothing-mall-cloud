/**
 * API 调用工具
 *
 * 已适配 CloudBase 云函数：
 * - request() 自动将 URL 路径映射到 wx.cloud.callFunction
 * - uploadFile() 使用 wx.cloud.uploadFile
 * - 501 重试逻辑保留
 */

// ==================== URL 路径 → 云函数映射 ====================

const ROUTE_MAP = {
  // wx-home
  'home/index':                    ['wx-home', 'homeIndex'],
  'home/about':                    ['wx-home', 'about'],
  'catalog/index':                 ['wx-goods', 'catalogIndex'],
  'catalog/current':               ['wx-goods', 'current'],
  'issue/list':                    ['wx-home', 'issueList'],

  // wx-goods
  'goods/count':                   ['wx-goods', 'count'],
  'goods/list':                    ['wx-goods', 'list'],
  'goods/category':                ['wx-goods', 'category'],
  'goods/detail':                  ['wx-goods', 'detail'],
  'goods/related':                 ['wx-goods', 'related'],
  'brand/list':                    ['wx-goods', 'brandList'],
  'brand/detail':                  ['wx-goods', 'brandDetail'],
  'search/index':                  ['wx-goods', 'searchIndex'],
  'search/helper':                 ['wx-goods', 'helper'],
  'search/clearhistory':           ['wx-goods', 'clearhistory'],

  // wx-cart
  'cart/index':                    ['wx-cart', 'index'],
  'cart/add':                      ['wx-cart', 'add'],
  'cart/fastadd':                  ['wx-cart', 'fastadd'],
  'cart/update':                   ['wx-cart', 'update'],
  'cart/delete':                   ['wx-cart', 'delete'],
  'cart/checked':                  ['wx-cart', 'checked'],
  'cart/goodscount':               ['wx-cart', 'goodscount'],
  'cart/checkout':                 ['wx-cart', 'checkout'],

  // wx-order
  'order/submit':                  ['wx-order', 'submit'],
  'order/prepay':                  ['wx-order', 'prepay'],
  'order/list':                    ['wx-order', 'list'],
  'order/detail':                  ['wx-order', 'detail'],
  'order/cancel':                  ['wx-order', 'cancel'],
  'order/refund':                  ['wx-order', 'refund'],
  'order/delete':                  ['wx-order', 'deleteOrder'],
  'order/confirm':                 ['wx-order', 'confirm'],
  'order/goods':                   ['wx-order', 'goods'],
  'aftersale/submit':              ['wx-order', 'aftersaleSubmit'],
  'aftersale/list':                ['wx-order', 'aftersaleList'],
  'aftersale/detail':              ['wx-order', 'aftersaleDetail'],
  'aftersale/cancel':              ['wx-order', 'aftersaleCancel'],

  // wx-user
  'user/index':                    ['wx-user', 'userIndex'],
  'user/role':                     ['wx-user', 'userRole'],
  'user/info':                     ['wx-user', 'userInfo'],
  'user/profile':                  ['wx-user', 'userProfile'],
  'user/isManager':                ['wx-user', 'userIsManager'],
  'collect/list':                  ['wx-user', 'collectList'],
  'collect/addordelete':           ['wx-user', 'collectAddOrDelete'],
  'address/list':                  ['wx-user', 'addressList'],
  'address/detail':                ['wx-user', 'addressDetail'],
  'address/save':                  ['wx-user', 'addressSave'],
  'address/delete':                ['wx-user', 'addressRemove'],
  'feedback/submit':               ['wx-user', 'feedbackSubmit'],
  'footprint/list':                ['wx-user', 'footprintList'],
  'footprint/delete':              ['wx-user', 'footprintRemove'],

  // wx-coupon
  'coupon/list':                   ['wx-coupon', 'list'],
  'coupon/mylist':                 ['wx-coupon', 'mylist'],
  'coupon/selectlist':             ['wx-coupon', 'selectlist'],
  'coupon/receive':                ['wx-coupon', 'receive'],
  'coupon/exchange':               ['wx-coupon', 'exchange'],

  // wx-clothing
  'clothing/sku/list':             ['wx-clothing', 'skuList'],
  'clothing/sku/detail':           ['wx-clothing', 'skuDetail'],
  'clothing/sku/checkStock':        ['wx-clothing', 'skuCheckStock'],
  'clothing/sku/sizes':            ['wx-clothing', 'skuSizes'],
  'clothing/sku/query':            ['wx-clothing', 'skuQuery'],
  'clothing/store/list':            ['wx-clothing', 'storeList'],
  'clothing/store/detail':          ['wx-clothing', 'storeDetail'],
  'clothing/store/nearest':         ['wx-clothing', 'storeNearest'],
  'clothing/user/levels':           ['wx-clothing', 'userLevels'],
  'clothing/user/info':            ['wx-clothing', 'memberInfo'],
  'clothing/user/bindGuide':        ['wx-clothing', 'memberBindGuide'],

  // wx-scene
  'scene/list':                    ['wx-scene', 'list'],
  'scene/banners':                 ['wx-scene', 'banners'],
  'scene/goods':                   ['wx-scene', 'goods'],

  // wx-storage
  'storage/upload':                ['wx-storage', 'upload'],

  // wx-tracker
  'tracker/report':                ['wx-tracker', 'report'],

  // wx-ai
  'ai/recognizeTag':               ['wx-ai', 'recognizeTag'],
  'ai/recognizeImage':             ['wx-ai', 'recognizeImage'],
  'ai/status':                     ['wx-ai', 'status'],

  // wx-express
  'express/query':                 ['wx-express', 'query'],

  // wx-region
  'region/list':                   ['wx-region', 'list'],

  // wx-auth
  'auth/login_by_weixin':          ['wx-auth', 'loginByWeixin'],
  'auth/login_by_phone':           ['wx-auth', 'loginByPhone'],
  'auth/login':                    ['wx-auth', 'loginByAccount'],
  'auth/logout':                   ['wx-auth', 'logout'],
  'auth/register':                 ['wx-auth', 'register'],
  'auth/reset':                    ['wx-auth', 'reset'],
  'auth/regCaptcha':               ['wx-auth', 'regCaptcha'],
  'auth/bindPhone':                ['wx-auth', 'bindPhone'],
  'auth/bindPhoneManual':          ['wx-auth', 'bindPhoneManual'],

  // wx-manager-order
  'manager/order/list':             ['wx-manager-order', 'list'],
  'manager/order/detail':           ['wx-manager-order', 'detail'],
  'manager/order/ship':             ['wx-manager-order', 'ship'],
  'manager/order/cancel':           ['wx-manager-order', 'cancel'],
  'manager/order/refundAgree':      ['wx-manager-order', 'refundAgree'],
  'manager/order/refundReject':     ['wx-manager-order', 'refundReject'],
  'manager/order/verify':           ['wx-manager-order', 'verify'],
  'manager/order/stats':            ['wx-manager-order', 'stats'],
  'manager/order/aftersale/list':   ['wx-manager-order', 'aftersaleList'],
  'manager/order/aftersale/recept':  ['wx-manager-order', 'aftersaleRecept'],
  'manager/order/aftersale/reject':  ['wx-manager-order', 'aftersaleReject'],
  'manager/order/aftersale/ship':    ['wx-manager-order', 'aftersaleShip'],
  'manager/order/shippers':         ['wx-manager-order', 'shippers'],

  // wx-manager-shelf
  'manager/goods/list':            ['wx-manager-shelf', 'list'],
  'manager/goods/detail':           ['wx-manager-shelf', 'detail'],
  'manager/goods/edit':             ['wx-manager-shelf', 'edit'],
  'manager/goods/publish':          ['wx-manager-shelf', 'publish'],
  'manager/goods/unpublish':        ['wx-manager-shelf', 'unpublish'],
  'manager/goods/batchDelete':      ['wx-manager-shelf', 'batchDelete'],
  'manager/goods/unpublishAll':      ['wx-manager-shelf', 'unpublishAll'],
  'manager/goods/create':           ['wx-manager-shelf', 'create'],
  'manager/goods/category':         ['wx-manager-shelf', 'category'],

  // wx-manager-content
  'manager/scene/list':             ['wx-manager-content', 'sceneList'],
  'manager/scene/read':             ['wx-manager-content', 'sceneRead'],
  'manager/scene/create':           ['wx-manager-content', 'sceneCreate'],
  'manager/scene/update':           ['wx-manager-content', 'sceneUpdate'],
  'manager/scene/delete':           ['wx-manager-content', 'sceneDelete'],
  'manager/scene/enable':           ['wx-manager-content', 'sceneEnable'],
  'manager/scene/goods':            ['wx-manager-content', 'sceneGoods'],
  'manager/scene/goods/update':     ['wx-manager-content', 'sceneGoodsUpdate'],
  'manager/outfit/list':            ['wx-manager-content', 'outfitList'],
  'manager/outfit/read':            ['wx-manager-content', 'outfitRead'],
  'manager/outfit/create':          ['wx-manager-content', 'outfitCreate'],
  'manager/outfit/update':          ['wx-manager-content', 'outfitUpdate'],
  'manager/outfit/delete':          ['wx-manager-content', 'outfitDelete'],
  'manager/outfit/status':          ['wx-manager-content', 'outfitStatus'],
  'manager/issue/list':             ['wx-manager-content', 'issueList'],
  'manager/issue/create':           ['wx-manager-content', 'issueCreate'],
  'manager/issue/update':           ['wx-manager-content', 'issueUpdate'],
  'manager/issue/delete':           ['wx-manager-content', 'issueDelete'],

  // wx-manager-wework
  'manager/wework/tags':            ['wx-manager-wework', 'tags'],
  'manager/wework/pages':            ['wx-manager-wework', 'pages'],
  'manager/wework/uploadMedia':      ['wx-manager-wework', 'uploadMedia'],
  'manager/wework/sendCard':         ['wx-manager-wework', 'sendCard'],
  'manager/wework/sendMessage':      ['wx-manager-wework', 'sendMessage'],
  'manager/wework/pushGroups':       ['wx-manager-wework', 'pushGroups'],
}

/**
 * 从 URL 中提取路径并映射到云函数
 */
function resolveRoute(url) {
  try {
    const u = new URL(url)
    const path = u.pathname.replace(/^\//, '')
    // 去掉前缀 /wx/ (如果有)
    const cleanPath = path.replace(/^wx\//, '')
    const route = ROUTE_MAP[cleanPath]
    return route || null
  } catch (e) {
    // 不是合法 URL，尝试直接作为路径匹配
    const cleanPath = url.replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '').replace(/^wx\//, '')
    return ROUTE_MAP[cleanPath] || null
  }
}

// ==================== 核心请求方法 ====================

/**
 * 封装请求 — 自动路由到云函数
 * 兼容旧 URL 格式和新的 { func, action } 格式
 *
 * retryCount 用于防止 501 自动重试时无限递归
 */
function request(urlOrConfig, data, method, retryCount) {
  // 支持 data 作为第三个参数（method 默认 GET）
  if (typeof method === 'undefined') {
    method = typeof data === 'string' ? 'GET' : 'POST'
  }
  if (typeof retryCount === 'undefined') {
    retryCount = 0
  }

  // 兼容：如果第一个参数已经是对象 { func, action }，直接用
  if (urlOrConfig && typeof urlOrConfig === 'object' && urlOrConfig.func) {
    return callCloudFunction(urlOrConfig.func, urlOrConfig.action, data, retryCount)
  }

  // URL 模式：解析路径映射到云函数
  const route = resolveRoute(urlOrConfig)
  if (route) {
    return callCloudFunction(route[0], route[1], data, retryCount)
  }

  // 未知路径：fallback（调试用，上线前应确保所有路由都有映射）
  console.warn('[util] 未映射的 API:', urlOrConfig)
  return new Promise(function(resolve, reject) {
    reject({ errno: -1, errmsg: '未映射的 API: ' + urlOrConfig })
  })
}

/**
 * 调用云函数
 */
function callCloudFunction(funcName, action, data, retryCount) {
  return new Promise(function(resolve, reject) {
    wx.cloud.callFunction({
      name: funcName,
      data: {
        action: action,
        data: data || {}
      }
    }).then(function(res) {
      var result = res.result

      if (result.errno == 501 && retryCount < 1) {
        // 需要登录 — 尝试静默登录后重试，不主动清除登录状态
        getApp().silentLogin().then(function() {
          callCloudFunction(funcName, action, data, retryCount + 1)
            .then(resolve)
            .catch(reject)
        }).catch(function() {
          // 静默登录也失败，仅在此处清除状态并跳转登录页
          try {
            wx.removeStorageSync('userInfo')
            wx.removeStorageSync('token')
          } catch (e) { /* ignore */ }
          getApp().globalData.hasLogin = false
          wx.navigateTo({ url: '/pages/auth/login/login' })
          reject(result)
        })
      } else if (result.errno == 501) {
        reject(result)
      } else {
        resolve(result)
      }
    }).catch(function(err) {
      console.error('[util] cloudFunction error:', funcName, action, err)
      reject({ errno: -1, errmsg: '云函数调用失败: ' + (err.errMsg || err.message || '') })
    })
  })
}

// ==================== 文件上传 ====================

/**
 * 上传文件到云存储
 * @param {string} filePath 本地临时文件路径
 * @param {string} dir 云存储目录，默认 'uploads'
 * @returns {Promise<string>} 返回 fileID
 */
function uploadFile(filePath, dir) {
  return new Promise(function(resolve, reject) {
    if (!filePath) {
      reject({ errno: 1, errmsg: '文件路径为空' })
      return
    }
    const ext = filePath.split('.').pop() || 'jpg'
    const fileName = Date.now() + '_' + Math.random().toString(36).substr(2, 6) + '.' + ext
    const cloudPath = (dir || 'uploads') + '/' + fileName

    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: filePath,
      success: function(res) {
        // 调用 storage 云函数记录元数据
        callCloudFunction('wx-storage', 'upload', {
          key: res.fileID,
          name: fileName,
          type: ext,
          size: 0,
          url: res.fileID,
        }).then(function() {
          resolve(res.fileID)
        }).catch(function() {
          // 元数据记录失败不影响上传结果
          resolve(res.fileID)
        })
      },
      fail: function(err) {
        wx.showToast({ title: '上传失败', icon: 'none' })
        reject(err)
      }
    })
  })
}

// ==================== 工具函数 ====================

function formatTime(date) {
  var year = date.getFullYear()
  var month = date.getMonth() + 1
  var day = date.getDate()
  var hour = date.getHours()
  var minute = date.getMinutes()
  var second = date.getSeconds()
  return [year, month, day].map(formatNumber).join('-') + ' ' + [hour, minute, second].map(formatNumber).join(':')
}

function formatNumber(n) {
  n = n.toString()
  return n[1] ? n : '0' + n
}

function redirect(url) {
  wx.redirectTo({ url: url })
}

function showErrorToast(msg) {
  wx.showToast({
    title: msg,
    image: '/static/images/icon_error.png'
  })
}

module.exports = {
  formatTime,
  request,
  uploadFile,
  redirect,
  showErrorToast,
  ROUTE_MAP,
}
