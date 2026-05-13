const util = require('../../../utils/util.js')

const app = getApp()

Page({
  data: {
    hasLogin: false
  },

  onShow() {
    this.setData({
      hasLogin: !!app.globalData.hasLogin
    })
  },

  requireLogin(url) {
    if (this.data.hasLogin) {
      wx.navigateTo({ url })
      return
    }

    wx.navigateTo({
      url: '/pages/auth/login/login'
    })
  },

  goUserInfo() {
    this.requireLogin('/pages/ucenter/userInfo/userInfo')
  },

  goAgreement() {
    wx.navigateTo({
      url: '/pages/agreement/agreement?type=agreement'
    })
  },

  goMerchantPrivacy() {
    wx.navigateTo({
      url: '/pages/agreement/agreement?type=privacy'
    })
  },

  goOfficialPrivacy() {
    util.openPrivacyContract('/pages/agreement/agreement?type=privacy')
  }
})
