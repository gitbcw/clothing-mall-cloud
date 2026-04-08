Page({
  data: {
    // 可以在这里存放一些状态，如登录状态等
    isLogin: false,
    userInfo: {
      avatarUrl: '', // 将在wxml中使用默认图片
      nickName: '薛定谔的猫'
    }
  },

  onLoad(options) {
    // 页面加载
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        active: 3
      })
    }
  },

  // Mock 点击事件
  handleNav(e) {
    const { url } = e.currentTarget.dataset;
    if (url === '全部订单' || url === '待支付' || url === '待发货' || url === '待收货' || url === '已完成') {
      let type = 0; // 全部
      if (url === '待支付') type = 1;
      if (url === '待发货') type = 2;
      if (url === '待收货') type = 3;
      if (url === '已完成') type = 4;
      wx.navigateTo({
        url: `/pages/order/order?type=${type}`
      });
      return;
    }

    if (url) {
      wx.showToast({
        title: '点击了: ' + url,
        icon: 'none'
      });
    }
  },

  switchTab(e) {
    const url = e.currentTarget.dataset.url;
    if (url) {
      wx.switchTab({ url });
    }
  }
});