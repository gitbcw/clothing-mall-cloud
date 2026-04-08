Component({
  properties: {
    title: {
      type: String,
      value: ''
    },
    background: {
      type: String,
      value: '#f4f4f4'
    }
  },

  data: {
    statusBarHeight: 20,
    navTotalHeight: 68
  },

  lifetimes: {
    attached: function() {
      const windowInfo = wx.getWindowInfo();
      const statusBarHeight = windowInfo.statusBarHeight || 20;
      this.setData({
        statusBarHeight: statusBarHeight,
        navTotalHeight: statusBarHeight + 48
      });
    }
  },

  methods: {
    goBack: function() {
      wx.navigateBack({
        fail: function() {
          wx.switchTab({ url: '/pages/index/index' });
        }
      });
    }
  }
});
