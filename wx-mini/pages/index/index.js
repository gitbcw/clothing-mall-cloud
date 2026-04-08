Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    navOpacity: 0,
    
    // 轮播图数据
    banners: [
      'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1445205170230-053b83016050?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
    ],
    
    // 每周上新
    weeklyNews: [
      {
        id: 1,
        image: '/images/jimeng-2026-03-13-9460-春天淡雅风格，A字半身裙，柔和自然光，淡蓝色调，简约高级感，服装摄影.png',
        title: '稻草人卡其色发箍...',
        price: '50.00',
        originalPrice: '99'
      },
      {
        id: 2,
        image: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
        title: '稻草人卡其色发箍...',
        price: '50.00',
        originalPrice: '99'
      },
      {
        id: 3,
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
        title: '稻草人卡...',
        price: '50.00'
      },
      {
        id: 4,
        image: 'https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
        title: '稻草人长...',
        price: '50.00'
      },
      {
        id: 5,
        image: 'https://images.unsplash.com/photo-1584273143981-41c073dfe8f8?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
        title: '稻草人卡...',
        price: '50.00'
      }
    ],

    // 热销推荐
    hotSales: [
      {
        id: 1,
        image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
        title: '稻草人卡其色发箍...',
        price: '50.00',
        originalPrice: '99'
      },
      {
        id: 2,
        image: '/images/jimeng-2026-03-13-2943-春天淡雅风格，经典风衣外套，柔和自然光，卡其色调，简约高级感，服装摄影.png',
        title: '稻草人卡其色发箍...',
        price: '50.00',
        originalPrice: '99'
      },
      {
        id: 3,
        image: '/images/jimeng-2026-03-13-4269-春天淡雅风格，温柔针织开衫，柔和自然光，米色色调，简约高级感，服装摄影.png',
        title: '稻草人...',
        price: '50.00'
      }
    ],

    // 搭配推荐
    matchRecommends: [
      {
        id: 1,
        image: '/images/jimeng-2026-03-13-9460-春天淡雅风格，A字半身裙，柔和自然光，淡蓝色调，简约高级感，服装摄影.png',
        title: '稻草人卡其色发箍...',
        price: '50.00',
        originalPrice: '99'
      },
      {
        id: 2,
        image: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
        title: '稻草人卡其色发箍...',
        price: '50.00'
      },
      {
        id: 3,
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
        title: '稻草人卡其色发箍...',
        price: '50.00'
      },
      {
        id: 4,
        image: 'https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
        title: '稻草人卡其色发箍...',
        price: '50.00'
      }
    ],

    // 饰饰如意
    accessories: [
      {
        id: 1,
        image: 'https://images.unsplash.com/photo-1596455607563-ad6193f76b17?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
        title: '蝴蝶结珍珠发卡LRNP1',
        price: '50.00'
      },
      {
        id: 2,
        image: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
        title: '稻草人卡其色发箍...',
        price: '50.00'
      },
      {
        id: 3,
        image: 'https://images.unsplash.com/photo-1596455607563-ad6193f76b17?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
        title: '波点发圈LGNP12',
        price: '50.00'
      },
      {
        id: 4,
        image: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
        title: '黑色蝴蝶结发卡',
        price: '50.00'
      }
    ],

    // 底部 TabBar 数据
    tabList: [
      { id: 'home', text: '首页', icon: 'home', active: true, url: '/pages/index/index' },
      { id: 'category', text: '分类', icon: 'category', url: '/pages/category/category' },
      { id: 'cart', text: '购物车', icon: 'cart', url: '/pages/cart/cart' },
      { id: 'mine', text: '我的', icon: 'mine', url: '/pages/mine/mine' }
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

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        active: 0
      })
    }
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/goods_detail/goods_detail?id=${id}`
    });
  },

  addToCart(e) {
    // 阻止冒泡
    const id = e.currentTarget.dataset.id;
    wx.showToast({
      title: '已加入购物车',
      icon: 'success',
      duration: 1500
    });
  },

  buyNow(e) {
    // 阻止冒泡，跳转到确认订单页
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/confirm_order/confirm_order?id=${id}`
    });
  },

  goToCart() {
    const scrollTop = e.detail.scrollTop;
    let opacity = scrollTop / 100;
    if (opacity > 1) {
      opacity = 1;
    }
    this.setData({
      navOpacity: opacity
    });
  },

  switchTab(e) {
    const url = e.currentTarget.dataset.url;
    wx.switchTab({ url });
  },
  
  goToCart() {
    wx.switchTab({ url: '/pages/cart/cart' });
  }
});