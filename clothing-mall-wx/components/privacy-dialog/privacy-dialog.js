Component({
  data: {
    show: false,
    message: '',
    privacyContractName: '小程序用户隐私保护指引'
  },

  lifetimes: {
    attached: function() {
      var app = getApp()
      if (app && app.globalData) {
        app.globalData.privacyDialog = this
      }
    },
    detached: function() {
      var app = getApp()
      if (app && app.globalData && app.globalData.privacyDialog === this) {
        app.globalData.privacyDialog = null
      }
    }
  },

  methods: {
    requestAuthorization: function(options) {
      options = options || {}
      var that = this
      return new Promise(function(resolve, reject) {
        that._resolvePrivacy = resolve
        that._rejectPrivacy = reject
        that.setData({
          show: true,
          message: options.message || '为了向您提供账号登录、商品购买、订单履约、售后反馈等服务，我们需要按功能场景处理必要的个人信息。',
          privacyContractName: options.privacyContractName || '小程序用户隐私保护指引'
        })
      })
    },

    onAgree: function(e) {
      if (e.detail && e.detail.errMsg && e.detail.errMsg !== 'agreePrivacyAuthorization:ok') {
        this.onDisagree()
        return
      }
      this.setData({ show: false })
      if (this._resolvePrivacy) this._resolvePrivacy(true)
      this._resolvePrivacy = null
      this._rejectPrivacy = null
    },

    onDisagree: function() {
      this.setData({ show: false })
      if (this._rejectPrivacy) {
        this._rejectPrivacy({ errno: 1, errmsg: 'privacy authorization denied' })
      }
      this._resolvePrivacy = null
      this._rejectPrivacy = null
    },

    openPrivacy: function() {
      if (wx.openPrivacyContract) {
        wx.openPrivacyContract({
          fail: function() {
            wx.navigateTo({ url: '/pages/agreement/agreement?type=privacy' })
          }
        })
      } else {
        wx.navigateTo({ url: '/pages/agreement/agreement?type=privacy' })
      }
    }
  }
})
