/**
 * 用户相关服务
 *
 * CloudBase 模式：OPENID 由云函数自动获取，无需手动传 code
 */

const util = require('../utils/util.js');

/**
 * 调用云函数登录（内部由 wxAuth 中间件自动获取 OPENID）
 */
function loginByWeixin(userInfo) {
  return new Promise(function(resolve, reject) {
    util.request({ func: 'wx-auth', action: 'loginByWeixin' }, {
      nickName: (userInfo && userInfo.nickName) || '',
      avatarUrl: (userInfo && userInfo.avatarUrl) || '',
      gender: (userInfo && userInfo.gender) || 0
    }).then(function(res) {
      if (res.errno === 0) {
        // 存储用户信息
        var userData = res.data.userInfo || res.data
        wx.setStorageSync('userInfo', {
          id: res.data.userId || res.data.id,
          nickName: userData.nickname || userData.nickName || '',
          avatarUrl: userData.avatar || userData.avatarUrl || '',
          mobile: userData.mobile || '',
          birthday: userData.birthday || ''
        })

        // 兼容：存一个 token 占位（某些页面可能检查 token 存在）
        wx.setStorageSync('token', 'cloud-base')

        resolve(res)
      } else {
        reject(res)
      }
    }).catch(reject)
  })
}

/**
 * 判断用户是否登录
 */
function checkLogin() {
  return new Promise(function(resolve, reject) {
    var userInfo = wx.getStorageSync('userInfo')
    var token = wx.getStorageSync('token')
    if (userInfo && token) {
      resolve(true)
    } else {
      reject(false)
    }
  })
}

/**
 * 检查登录状态并验证（调用后端接口）
 */
function checkLoginWithApi() {
  return new Promise(function(resolve, reject) {
    var userInfo = wx.getStorageSync('userInfo')
    var token = wx.getStorageSync('token')
    if (!userInfo || !token) {
      reject(false)
      return
    }
    util.request({ func: 'wx-user', action: 'index' }, {}).then(function(res) {
      if (res.errno === 0) {
        resolve(true)
      } else {
        wx.removeStorageSync('userInfo')
        wx.removeStorageSync('token')
        reject(false)
      }
    }).catch(function() {
      reject(false)
    })
  })
}

/**
 * 检查用户是否已绑定手机号
 */
function checkPhoneBound() {
  var userInfo = wx.getStorageSync('userInfo')
  return !!(userInfo && userInfo.mobile)
}

/**
 * 要求用户已绑定手机号，未绑定则弹窗提示并跳转
 */
function requirePhoneBound() {
  if (checkPhoneBound()) return true
  wx.showModal({
    title: '需要绑定手机号',
    content: '下单前请先绑定手机号，方便我们联系您',
    confirmText: '去绑定',
    success: function(res) {
      if (res.confirm) {
        wx.navigateTo({ url: '/pages/auth/login/login' })
      }
    }
  })
  return false
}

module.exports = {
  loginByWeixin,
  checkLogin,
  checkLoginWithApi,
  checkPhoneBound,
  requirePhoneBound,
}
