var app = getApp()

Page({
  data: {
    csTitle: '',
    csSubtitle: '',
    csQrCode: '',
    csDesc: ''
  },

  onLoad: function() {
    var config = app.globalData.csConfig || {}
    this.setData({
      csTitle: config.csTitle || '',
      csSubtitle: config.csSubtitle || '',
      csQrCode: config.csQrCode || '',
      csDesc: config.csDesc || ''
    })
  }
})
