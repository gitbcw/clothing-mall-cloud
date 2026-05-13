var util = require('../../utils/util.js')
var userAgreement = require('./user-agreement.js')
var privacyPolicy = require('./privacy-policy.js')

var BASE = 'https://636c-cloudbase-d3g1zmq7r388144eb-1427677265.tcb.qcloud.la/'

var AGREEMENT_FILES = {
  agreement: 'assets/agreement/user_agreement.html',
  privacy: 'assets/agreement/privacy_policy.html'
}

var TITLES = {
  agreement: '用户协议',
  privacy: '隐私政策'
}

var LOCAL_CONTENT = {
  agreement: userAgreement,
  privacy: privacyPolicy
}

Page({
  data: {
    title: '',
    content: '',
    loading: true,
    statusBarHeight: 20,
    navContentHeight: 48,
    navTotalHeight: 68
  },

  onLoad: function (options) {
    var statusBarHeight = wx.getWindowInfo().statusBarHeight || 20
    var navContentHeight = 48
    this.setData({
      statusBarHeight: statusBarHeight,
      navContentHeight: navContentHeight,
      navTotalHeight: statusBarHeight + navContentHeight
    })

    var type = options.type || 'agreement'
    this.setData({ title: TITLES[type] || '用户协议' })

    if (type === 'privacy' && options.official === '1') {
      util.openPrivacyContract()
    }

    if (LOCAL_CONTENT[type]) {
      this.setData({
        content: LOCAL_CONTENT[type],
        loading: false
      })
      return
    }

    var cloudPath = AGREEMENT_FILES[type] || AGREEMENT_FILES.agreement
    this.loadContent(cloudPath)
  },

  loadContent: function (cloudPath) {
    var that = this
    var url = BASE + cloudPath

    wx.request({
      url: url,
      method: 'GET',
      success: function (res) {
        if (res.statusCode === 200 && res.data) {
          that.setData({
            content: res.data,
            loading: false
          })
        } else {
          that.setData({
            content: '<p style="text-align:center;color:#999;padding:60px 0;">内容加载失败，请稍后重试</p>',
            loading: false
          })
        }
      },
      fail: function () {
        that.setData({
          content: '<p style="text-align:center;color:#999;padding:60px 0;">网络异常，请稍后重试</p>',
          loading: false
        })
      }
    })
  },

  handleBack: function () {
    wx.navigateBack()
  }
})
