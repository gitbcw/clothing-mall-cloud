Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,

    categories: [
      { id: 1, name: '连衣裙' },
      { id: 2, name: '保暖内衣' },
      { id: 3, name: '丝袜' },
      { id: 4, name: '马面裙' }
    ],
    activeCategoryId: 2,

    // 所有的商品数据池
    allGoods: [
      {
        id: 1,
        categoryId: 2,
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
        title: '稻草人保暖内衣...',
        price: '50.00',
        originalPrice: '69'
      },
      {
        id: 2,
        categoryId: 2,
        image: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
        title: '稻草人保暖内衣...',
        price: '50.00',
        originalPrice: '69'
      },
      {
        id: 3,
        categoryId: 2,
        image: '/images/jimeng-2026-03-13-4309-春天淡雅风格，法式衬衫，柔和自然光，浅粉色调，简约高级感，服装摄影.png',
        title: '稻草人保暖内衣...',
        price: '50.00',
        originalPrice: '69'
      },
      {
        id: 4,
        categoryId: 2,
        image: 'https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
        title: '稻草人保暖内衣...',
        price: '50.00',
        originalPrice: '69'
      },
      {
        id: 5,
        categoryId: 2,
        image: '/images/jimeng-2026-03-13-5420-春天淡雅风格，高腰阔腿裤，柔和自然光，米白色调，简约高级感，服装摄影.png',
        title: '稻草人保暖内衣...',
        price: '50.00',
        originalPrice: '69'
      },
      {
        id: 6,
        categoryId: 1,
        image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
        title: '碎花连衣裙...',
        price: '120.00',
        originalPrice: '150'
      },
      {
        id: 7,
        categoryId: 1,
        image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
        title: '法式复古连衣裙...',
        price: '199.00',
        originalPrice: '299'
      },
      {
        id: 8,
        categoryId: 3,
        image: 'https://images.unsplash.com/photo-1582142407894-ec85a1260a46?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
        title: '光腿神器丝袜...',
        price: '29.90',
        originalPrice: '49'
      },
      {
        id: 9,
        categoryId: 4,
        image: 'https://images.unsplash.com/photo-1583391733958-65e2b0286822?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
        title: '改良马面裙...',
        price: '299.00',
        originalPrice: '399'
      }
    ],

    leftGoodsList: [],
    rightGoodsList: [],

    // 底部 TabBar 数据
    tabList: [
      { id: 'home', text: '首页', icon: 'home', url: '/pages/index/index' },
      { id: 'category', text: '分类', icon: 'category', active: true, url: '/pages/category/category' },
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
    
    // 初始化时根据当前分类筛选数据
    this.filterGoods(this.data.activeCategoryId);
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        active: 1
      })
    }
  },

  goBack() {
    wx.navigateBack({
      fail: () => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }
    });
  },

  switchCategory(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      activeCategoryId: id
    });
    this.filterGoods(id);
  },

  // 根据分类ID过滤商品，并分配到瀑布流的左右两列
  filterGoods(categoryId) {
    const allGoods = this.data.allGoods;
    const filtered = allGoods.filter(item => item.categoryId === categoryId);
    
    const leftGoodsList = [];
    const rightGoodsList = [];
    
    // 简单的瀑布流左右分配：交替分配
    filtered.forEach((item, index) => {
      if (index % 2 === 0) {
        leftGoodsList.push(item);
      } else {
        rightGoodsList.push(item);
      }
    });
    
    this.setData({
      leftGoodsList,
      rightGoodsList
    });
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/goods_detail/goods_detail?id=${id}`
    });
  },

  addToCart(e) {
    // 阻止冒泡，防止触发商品卡片的点击事件
    const id = e.currentTarget.dataset.id;
    wx.showToast({
      title: '已加入购物车',
      icon: 'success',
      duration: 1500
    });
  },

  switchTab(e) {
    const url = e.currentTarget.dataset.url;
    if (url) {
      wx.switchTab({ url });
    }
  }
});