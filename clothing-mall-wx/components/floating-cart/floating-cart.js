var util = require('../../utils/util.js');
var api = require('../../config/api.js');
var app = getApp();

Component({
  properties: {},

  data: {
    count: 0
  },

  lifetimes: {
    attached: function() {
      this.refreshCount();
      // 注册全局回调，供页面加购后直接调用
      app.globalData.onCartChange = this.refreshCount.bind(this);
    },
    detached: function() {
      app.globalData.onCartChange = null;
    }
  },

  pageLifetimes: {
    show: function() {
      // 每次页面显示时刷新购物车数量
      this.refreshCount();
    }
  },

  methods: {
    refreshCount: function() {
      var that = this;
      util.request(api.CartGoodsCount).then(function(res) {
        if (res.errno === 0) {
          that.setData({ count: res.data });
        }
      }).catch(function() {
        // 静默失败，不影响用户体验
      });
    },

    goToCart: function() {
      wx.switchTab({
        url: '/pages/cart/cart'
      });
    }
  }
});
