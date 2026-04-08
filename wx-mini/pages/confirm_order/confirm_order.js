Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    
    // Mock Data
    goods: {
      image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
      title: '敬修堂防脱滋养育发洗发露',
      desc: '控油防脱两不误 细腻丰富泡沫',
      price: '199.9',
      count: 1
    },
    
    fee: {
      freight: '0.0',
      subtotal: '199.9',
      couponDesc: '- ￥60.0',
      total: '139.0'
    },

    paymentMethod: '微信支付',
    
    // 优惠券弹窗状态与数据
    showCouponModal: false, // 初始显示以匹配截图状态
    coupons: [
      {
        id: 1,
        amount: '20',
        title: '七折优惠券',
        validTime: '2023.03.21-2023.06.21',
        desc: '此券可与其他券叠加使用',
        condition: '无门槛使用',
        selected: true
      },
      {
        id: 2,
        amount: '20',
        title: '20元优惠券',
        validTime: '2023.03.21-2023.06.21',
        desc: '此券可与其他券叠加使用',
        condition: '无门槛使用',
        selected: false
      }
    ]
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync();
    const isIOS = sysInfo.system.indexOf('iOS') > -1;
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight,
      navBarHeight: isIOS ? 44 : 48
    });
  },

  goBack() {
    wx.navigateBack({
      fail: () => {
        wx.switchTab({
          url: '/pages/index/index' // 降级处理
        });
      }
    });
  },

  // 打开优惠券弹窗
  openCouponModal() {
    this.setData({
      showCouponModal: true
    });
  },

  // 关闭优惠券弹窗
  closeCouponModal() {
    this.setData({
      showCouponModal: false
    });
  },

  // 选择/取消选择优惠券
  toggleCoupon(e) {
    const id = e.currentTarget.dataset.id;
    const coupons = this.data.coupons.map(item => {
      if (item.id === id) {
        return { ...item, selected: !item.selected };
      }
      return item;
    });
    this.setData({ coupons });
  }
});