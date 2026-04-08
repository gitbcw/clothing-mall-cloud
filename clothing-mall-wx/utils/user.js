/**
 * 用户相关服务
 */
const util = require('../utils/util.js');
const api = require('../config/api.js');


/**
 * Promise封装wx.login
 */
function login() {
  return new Promise(function(resolve, reject) {
    wx.login({
      success: function(res) {
        if (res.code) {
          resolve(res);
        } else {
          reject(res);
        }
      },
      fail: function(err) {
        reject(err);
      }
    });
  });
}

/**
 * 调用微信登录
 */
function loginByWeixin(userInfo) {

  return new Promise(function(resolve, reject) {
    return login().then((res) => {
      //登录远程服务器
      util.request(api.AuthLoginByWeixin, {
        code: res.code,
        userInfo: userInfo
      }, 'POST').then(res => {
        if (res.errno === 0) {
          // 存储基本 token
          wx.setStorageSync('token', res.data.token);
          
          // 请求最新用户数据
          util.request(api.UserInfo, {}, 'GET').then(infoRes => {
            if (infoRes.errno === 0) {
              wx.setStorageSync('userInfo', {
                nickName: infoRes.data.nickname,
                avatarUrl: infoRes.data.avatar,
                mobile: infoRes.data.mobile,
                birthday: infoRes.data.birthday
              });
              // 补充给 login.js 使用的 userInfo 结构
              res.data.userInfo = {
                nickName: infoRes.data.nickname,
                avatarUrl: infoRes.data.avatar,
                mobile: infoRes.data.mobile,
                birthday: infoRes.data.birthday
              };
              resolve(res);
            } else {
              wx.setStorageSync('userInfo', res.data.userInfo);
              resolve(res);
            }
          }).catch(() => {
            wx.setStorageSync('userInfo', res.data.userInfo);
            resolve(res);
          });
        } else {
          reject(res);
        }
      }).catch((err) => {
        reject(err);
      });
    }).catch((err) => {
      reject(err);
    })
  });
}

/**
 * 判断用户是否登录
 * 只检查本地存储的 token 和 userInfo，不依赖微信 session
 */
function checkLogin() {
  return new Promise(function(resolve, reject) {
    const userInfo = wx.getStorageSync('userInfo');
    const token = wx.getStorageSync('token');
    if (userInfo && token) {
      resolve(true);
    } else {
      reject(false);
    }
  });
}

/**
 * 检查登录状态并验证 token 是否有效（调用后端接口）
 */
function checkLoginWithApi() {
  return new Promise(function(resolve, reject) {
    const userInfo = wx.getStorageSync('userInfo');
    const token = wx.getStorageSync('token');
    if (!userInfo || !token) {
      reject(false);
      return;
    }
    // 调用后端接口验证 token
    util.request(api.UserIndex, {}, 'GET').then(res => {
      if (res.errno === 0) {
        resolve(true);
      } else {
        // token 无效，清除本地存储
        wx.removeStorageSync('userInfo');
        wx.removeStorageSync('token');
        reject(false);
      }
    }).catch(() => {
      reject(false);
    });
  });
}

/**
 * 检查用户是否已绑定手机号
 */
function checkPhoneBound() {
  const userInfo = wx.getStorageSync('userInfo');
  return !!(userInfo && userInfo.mobile);
}

/**
 * 要求用户已绑定手机号，未绑定则弹窗提示并跳转
 * @returns {boolean} true 表示已绑定，false 表示未绑定
 */
function requirePhoneBound() {
  if (checkPhoneBound()) return true;
  wx.showModal({
    title: '需要绑定手机号',
    content: '下单前请先绑定手机号，方便我们联系您',
    confirmText: '去绑定',
    success: function(res) {
      if (res.confirm) {
        wx.navigateTo({ url: '/pages/auth/login/login' });
      }
    }
  });
  return false;
}

module.exports = {
  loginByWeixin,
  checkLogin,
  checkLoginWithApi,
  checkPhoneBound,
  requirePhoneBound,
};