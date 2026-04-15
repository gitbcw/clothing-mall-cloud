const util = require('../../utils/util.js');
const api = require('../../config/api.js');

const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,

    userInfo: {
      nickName: '点击登录',
      avatarUrl: '/static/images/user.png'
    },
    headerBgDefaultImage: '/static/images/fallback-image.svg',
    headerBgImage: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
    avatarDefaultImage: '/static/images/user.png',
    avatarLoadError: false,
    order: {
      unpaid: 0,
      unship: 0,
      unrecv: 0
    },
    hasLogin: false,
    couponCount: 0,
    loading: true,
    // 管理员相关
    isManager: false,
    userRole: 'user'
  },

  onLoad() {
    const { system } = wx.getDeviceInfo()
    const { statusBarHeight } = wx.getWindowInfo()
    const isIOS = system.indexOf('iOS') > -1
    this.setData({
      statusBarHeight,
      navBarHeight: isIOS ? 44 : 48
    })
  },

  onShow() {
    // 更新 TabBar 状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ active: 3 })
    }

    // 获取用户的登录信息
    if (app.globalData.hasLogin) {
      let userInfo = wx.getStorageSync('userInfo')
      this.setData({
        userInfo: userInfo || { nickName: '用户', avatarUrl: '/static/images/user.png' },
        hasLogin: true,
        avatarLoadError: false,
        loading: false
      })

      // 获取订单统计
      this.getOrderInfo()
      // 获取优惠券数量
      this.getCouponCount()
      // 获取用户角色
      this.getUserRole()
    } else {
      this.setData({
        hasLogin: false,
        avatarLoadError: false,
        isManager: false,
        userRole: 'user',
        loading: false,
        userInfo: {
          nickName: '点击登录',
          avatarUrl: '/static/images/user.png'
        }
      })
    }
  },

  // 获取用户角色
  getUserRole() {
    let that = this
    util.request(api.UserIsManager).then(function(res) {
      if (res.errno === 0) {
        that.setData({
          isManager: res.data.isManager,
          userRole: res.data.role
        })
      }
    }).catch(function() {
      that.setData({
        isManager: false,
        userRole: 'user'
      })
    })
  },

  // 获取订单统计
  getOrderInfo() {
    let that = this
    util.request(api.UserIndex).then(function(res) {
      if (res.errno === 0) {
        that.setData({
          order: res.data.order || {}
        })
      }
    })
  },

  // 获取优惠券数量
  getCouponCount() {
    let that = this
    util.request(api.CouponMyList, { status: 0, page: 1, limit: 1 }).then(function(res) {
      if (res.errno === 0) {
        that.setData({
          couponCount: res.data.total || 0
        })
      }
    })
  },

  // 去登录
  goLogin() {
    if (!this.data.hasLogin) {
      wx.navigateTo({
        url: '/pages/auth/login/login'
      })
    } else {
      wx.navigateTo({
        url: '/pages/ucenter/userInfo/userInfo'
      })
    }
  },

  onHeaderBgError() {
    if (this.data.headerBgImage !== this.data.headerBgDefaultImage) {
      this.setData({
        headerBgImage: this.data.headerBgDefaultImage
      })
    }
  },

  onAvatarError() {
    this.setData({
      avatarLoadError: true
    })
  },

  // 跳转订单列表
  goOrder() {
    if (this.data.hasLogin) {
      wx.setStorageSync('tab', 0)
      wx.navigateTo({
        url: '/pages/order/order'
      })
    } else {
      wx.navigateTo({
        url: '/pages/auth/login/login'
      })
    }
  },

  // 跳转订单列表指定 tab
  goOrderIndex(e) {
    let tab = e.currentTarget.dataset.index
    if (this.data.hasLogin) {
      wx.setStorageSync('tab', tab)
      wx.navigateTo({
        url: '/pages/order/order'
      })
    } else {
      wx.navigateTo({
        url: '/pages/auth/login/login'
      })
    }
  },

  // 跳转优惠券列表
  goCoupon() {
    if (this.data.hasLogin) {
      wx.navigateTo({
        url: '/pages/ucenter/couponList/couponList'
      })
    } else {
      wx.navigateTo({
        url: '/pages/auth/login/login'
      })
    }
  },

  // 跳转地址管理
  goAddress() {
    if (this.data.hasLogin) {
      wx.navigateTo({
        url: '/pages/ucenter/address/address'
      })
    } else {
      wx.navigateTo({
        url: '/pages/auth/login/login'
      })
    }
  },

  // 跳转收藏
  goCollect() {
    if (this.data.hasLogin) {
      wx.navigateTo({
        url: '/pages/ucenter/collect/collect'
      })
    } else {
      wx.navigateTo({
        url: '/pages/auth/login/login'
      })
    }
  },

  // 跳转足迹
  goFootprint() {
    if (this.data.hasLogin) {
      wx.navigateTo({
        url: '/pages/ucenter/footprint/footprint'
      })
    } else {
      wx.navigateTo({
        url: '/pages/auth/login/login'
      })
    }
  },

  // 跳转反馈
  goFeedback() {
    if (this.data.hasLogin) {
      wx.navigateTo({
        url: '/pages/ucenter/feedback/feedback'
      })
    } else {
      wx.navigateTo({
        url: '/pages/auth/login/login'
      })
    }
  },

  // 跳转关于
  goAbout() {
    wx.showToast({
      title: '敬请期待',
      icon: 'none'
    })
  },

  // 跳转个人信息
  goUserInfo() {
    if (this.data.hasLogin) {
      wx.navigateTo({
        url: '/pages/ucenter/userInfo/userInfo'
      })
    } else {
      wx.navigateTo({
        url: '/pages/auth/login/login'
      })
    }
  },

  // 跳转管理后台
  goManager() {
    if (this.data.isManager) {
      if (this.data.userRole === 'guide') {
        wx.navigateTo({ url: '/pages/manager/verify/verify' })
      } else {
        wx.navigateTo({ url: '/pages/manager/tabOrder/tabOrder' })
      }
    }
  }
})
