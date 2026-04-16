var util = require('./utils/util.js');
var api = require('./config/api.js');
var user = require('./utils/user.js');

App({
  onLaunch: function() {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({ env: 'clo-test-4g8ukdond34672de', traceUser: true })
    }
    // Promise.finally polyfill
    Promise.prototype.finally = function(callback) {
      let P = this.constructor;
      return this.then(
        value => {
          P.resolve(callback()).then(() => value)
        },
        reason => {
          P.resolve(callback()).then(() => { throw reason })
        }
      )
    };

    // 小程序更新检查
    const updateManager = wx.getUpdateManager();
    updateManager.onUpdateReady(function() {
      wx.showModal({
        title: '更新提示',
        content: '新版本已经准备好，是否重启应用？',
        success: function(res) {
          if (res.confirm) {
            updateManager.applyUpdate()
          }
        }
      })
    });
  },

  onShow: function(options) {
    // 检查登录状态，未登录则执行静默登录
    user.checkLogin().then(res => {
      this.globalData.hasLogin = true;
    }).catch(() => {
      // 仅在当前未登录时才重置并尝试静默登录
      if (!this.globalData.hasLogin) {
        this.silentLogin();
      }
    });
  },

  silentLogin: function() {
    if (this.globalData.loginPromise) return this.globalData.loginPromise;

    this.globalData.loginPromise = user.loginByWeixin({
      nickName: '',
      avatarUrl: '',
      gender: 0
    }).then(res => {
      console.log('静默登录成功', res);
      this.globalData.hasLogin = true;
      this.globalData.loginPromise = null;
      return res;
    }).catch(err => {
      console.error('静默登录失败，具体原因:', err);
      this.globalData.loginPromise = null;
      throw err;
    });

    return this.globalData.loginPromise;
  },

  globalData: {
    hasLogin: false,
    loginPromise: null,
    cartCount: 0,
    cartListeners: []
  },

  // 更新购物车角标数量
  updateCartCount(count) {
    this.globalData.cartCount = count
    // 更新自定义 tabbar 角标
    const pages = getCurrentPages()
    if (pages.length > 0) {
      const page = pages[pages.length - 1]
      if (typeof page.getTabBar === 'function' && page.getTabBar()) {
        page.getTabBar().setData({ cartCount: count })
      }
    }
    // 通知悬浮购物车组件
    var listeners = this.globalData.cartListeners || []
    for (var i = 0; i < listeners.length; i++) {
      listeners[i](count)
    }
  },

  // 从服务端获取购物车数量并更新角标
  fetchCartCount() {
    if (!this.globalData.hasLogin) {
      this.updateCartCount(0)
      return
    }
    var util = require('./utils/util.js')
    var api = require('./config/api.js')
    util.request(api.CartGoodsCount).then(res => {
      if (res.errno === 0) {
        this.updateCartCount(res.data || 0)
      }
    }).catch(() => {})
  }
})
