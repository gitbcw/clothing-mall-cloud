/**
 * 用户相关 API
 */
const { request } = require('../utils/util.js')
const api = require('../config/api.js')

module.exports = {
  // 微信登录
  loginByWeixin(userInfo) {
    return request(api.AuthLoginByWeixin, userInfo, 'POST')
  },

  // 账号登录
  loginByAccount(data) {
    return request(api.AuthLoginByAccount, data, 'POST')
  },

  // 退出登录
  logout() {
    return request(api.AuthLogout, {}, 'POST')
  },

  // 获取用户信息
  getUserInfo() {
    return request(api.UserIndex)
  },

  // 绑定手机号
  bindPhone(data) {
    return request(api.AuthBindPhone, data, 'POST')
  }
}
