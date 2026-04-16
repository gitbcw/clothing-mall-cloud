var util = require('../../utils/util.js');
var api = require('../../config/api.js');
var app = getApp();

Component({
  properties: {},

  data: {
    count: 0,
    expanded: false
  },

  lifetimes: {
    attached: function() {
      this.refreshCount();
      if (!app.globalData.cartListeners) {
        app.globalData.cartListeners = []
      }
      this._listener = this.refreshCount.bind(this)
      app.globalData.cartListeners.push(this._listener)
    },
    detached: function() {
      if (app.globalData.cartListeners) {
        var idx = app.globalData.cartListeners.indexOf(this._listener)
        if (idx > -1) app.globalData.cartListeners.splice(idx, 1)
      }
    }
  },

  pageLifetimes: {
    show: function() {
      this.refreshCount();
    }
  },

  methods: {
    refreshCount: function(count) {
      if (typeof count === 'number') {
        this.setData({ count: count });
        return;
      }
      var that = this;
      util.request(api.CartGoodsCount).then(function(res) {
        if (res.errno === 0) {
          that.setData({ count: res.data });
        }
      }).catch(function() {});
    },

    goToCart: function() {
      wx.switchTab({ url: '/pages/cart/cart' });
    },

    toggleExpand: function() {
      this.setData({ expanded: !this.data.expanded });
    },

    openCs: function() {
      this.setData({ expanded: false });
      wx.navigateTo({ url: '/pages/ucenter/contact/contact' });
    }
  }
});
