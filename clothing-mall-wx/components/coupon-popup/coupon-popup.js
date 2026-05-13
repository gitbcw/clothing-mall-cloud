var util = require('../../utils/util.js');
var api = require('../../config/api.js');

Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    coupons: {
      type: Array,
      value: []
    }
  },

  data: {
    current: 0,
    receivedMap: {},
    receiving: false
  },

  methods: {
    onSwiperChange: function(e) {
      this.setData({ current: e.detail.current });
    },

    onClose: function() {
      // 记录已展示的券（当天不再弹）
      var coupons = this.data.coupons;
      var today = this._getToday();
      for (var i = 0; i < coupons.length; i++) {
        try {
          wx.setStorageSync('popup_coupon_' + coupons[i].id, today);
        } catch (e) {}
      }
      this.triggerEvent('close');
    },

    onReceive: function() {
      if (this.data.receiving) return;
      var coupon = this.data.coupons[this.data.current];
      if (!coupon) return;
      var couponId = coupon.id;

      if (this.data.receivedMap[couponId]) return;

      var that = this;
      that.setData({ receiving: true });

      util.request(api.CouponReceive, {
        couponId: couponId
      }, 'POST').then(function(res) {
        that.setData({ receiving: false });
        if (res.errno === 0) {
          var map = that.data.receivedMap;
          map[couponId] = true;
          that.setData({ receivedMap: map });
          wx.showToast({ title: '领取成功', icon: 'success' });
          that.triggerEvent('receive', { couponId: couponId });
        } else {
          wx.showToast({ title: res.errmsg || '领取失败', icon: 'none' });
        }
      }).catch(function() {
        that.setData({ receiving: false });
        wx.showToast({ title: '网络错误', icon: 'none' });
      });
    },

    _getToday: function() {
      var d = new Date();
      return d.getFullYear() + '-' +
        ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
        ('0' + d.getDate()).slice(-2);
    }
  }
});
