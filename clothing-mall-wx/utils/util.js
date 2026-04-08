var api = require('../config/api.js');
var app = getApp();

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

/**
 * 封装微信的 request（内部实现）
 * retryCount 用于防止 501 自动重试时无限递归
 */
function doRequest(url, data, method, resolve, reject, retryCount) {
  wx.request({
    url: url,
    data: data,
    method: method,
    header: {
      'Content-Type': 'application/json',
      'X-Litemall-Token': wx.getStorageSync('token')
    },
    success: function(res) {

      if (res.statusCode == 200) {

        if (res.data.errno == 501 && retryCount < 1) {
          // 清除登录相关内容
          try {
            wx.removeStorageSync('userInfo');
            wx.removeStorageSync('token');
          } catch (e) {
            // Do something when catch error
          }
          getApp().globalData.hasLogin = false;

          // 先尝试静默续期，成功则重试原请求
          getApp().silentLogin().then(function() {
            doRequest(url, data, method, resolve, reject, retryCount + 1);
          }).catch(function() {
            // 静默续期失败，跳转登录页
            wx.navigateTo({
              url: '/pages/auth/login/login'
            });
            reject(res.data);
          });
        } else if (res.data.errno == 501) {
          // 已经重试过一次，直接跳转登录页
          wx.navigateTo({
            url: '/pages/auth/login/login'
          });
          reject(res.data);
        } else {
          resolve(res.data);
        }
      } else {
        reject(res.errMsg);
      }

    },
    fail: function(err) {
      reject(err)
    }
  });
}

/**
 * 封装微信的 request
 */
function request(url, data = {}, method = "GET") {
  return new Promise(function(resolve, reject) {
    doRequest(url, data, method, resolve, reject, 0);
  });
}

function redirect(url) {

  //判断页面是否需要登录
  if (false) {
    wx.redirectTo({
      url: '/pages/auth/login/login'
    });
    return false;
  } else {
    wx.redirectTo({
      url: url
    });
  }
}

function showErrorToast(msg) {
  wx.showToast({
    title: msg,
    image: '/static/images/icon_error.png'
  })
}

/**
 * 封装微信图片上传
 * 返回 Promise，resolve(url) 成功时返回文件 URL
 */
function uploadFile(filePath) {
  return new Promise(function(resolve, reject) {
    wx.uploadFile({
      url: api.StorageUpload,
      filePath: filePath,
      name: 'file',
      header: {
        'X-Litemall-Token': wx.getStorageSync('token')
      },
      success: function(res) {
        try {
          var data = JSON.parse(res.data);
          if (data.errno === 0) {
            resolve(data.data.url);
          } else {
            wx.showToast({ title: '上传失败', icon: 'none' });
            reject(data);
          }
        } catch (e) {
          wx.showToast({ title: '上传失败', icon: 'none' });
          reject(e);
        }
      },
      fail: function(err) {
        wx.showToast({ title: '上传失败', icon: 'none' });
        reject(err);
      }
    });
  });
}

module.exports = {
  formatTime,
  request,
  uploadFile,
  redirect,
  showErrorToast
}
