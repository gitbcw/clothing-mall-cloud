Component({
  data: {
    active: 0,
    list: [
      {
        pagePath: "/pages/index/index",
        text: "首页",
        iconClass: "home"
      },
      {
        pagePath: "/pages/category/category",
        text: "分类",
        iconClass: "category"
      },
      {
        pagePath: "/pages/cart/cart",
        text: "购物车",
        iconClass: "cart"
      },
      {
        pagePath: "/pages/mine/mine",
        text: "我的",
        iconClass: "mine"
      }
    ]
  },
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = data.path;
      this.setData({
        active: data.index
      });
      wx.switchTab({ url });
    }
  }
});