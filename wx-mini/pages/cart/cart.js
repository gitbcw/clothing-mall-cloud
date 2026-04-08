Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    
    // 正常商品列表
    cartList: [
      {
        id: 1,
        image: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
        title: '限滑差速器油75W-901',
        desc: '适用于手动变速箱',
        price: '168',
        originalPrice: '188',
        count: 2,
        selected: true
      },
      {
        id: 2,
        image: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
        title: '限滑差速器油75W-901',
        desc: '适用于手动变速箱',
        price: '168',
        originalPrice: '188',
        count: 2,
        selected: false
      }
    ],

    // 失效商品列表
    invalidList: [
      {
        id: 3,
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
        title: '限滑差速器油75W-901',
        desc: '适用于手动变速箱',
        price: '168'
      },
      {
        id: 4,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
        title: '限滑差速器油75W-901',
        desc: '适用于手动变速箱',
        price: '168'
      }
    ],

    isAllSelected: false,
    totalPrice: '0.00',
    discountPrice: '0.00',
    selectedCount: 0,
    isManageMode: false,
    
    // 底部 TabBar 数据
    tabList: [
      { id: 'home', text: '首页', icon: 'home', url: '/pages/index/index' },
      { id: 'category', text: '分类', icon: 'category', url: '/pages/category/category' },
      { id: 'cart', text: '购物车', icon: 'cart', active: true, url: '/pages/cart/cart' },
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
    this.calculateTotal();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        active: 2
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

  // 切换单个商品选中状态
  toggleSelect(e) {
    const id = e.currentTarget.dataset.id;
    const cartList = this.data.cartList.map(item => {
      if (item.id === id) {
        return { ...item, selected: !item.selected };
      }
      return item;
    });
    
    const isAllSelected = cartList.length > 0 && cartList.every(item => item.selected);
    this.setData({ cartList, isAllSelected });
    this.calculateTotal();
  },

  // 切换全选状态
  toggleAllSelect() {
    const isAllSelected = !this.data.isAllSelected;
    const cartList = this.data.cartList.map(item => ({
      ...item,
      selected: isAllSelected
    }));
    this.setData({ cartList, isAllSelected });
    this.calculateTotal();
  },

  // 计算总价和数量
  calculateTotal() {
    let totalPrice = 0;
    let originalTotalPrice = 0;
    let selectedCount = 0;

    this.data.cartList.forEach(item => {
      if (item.selected) {
        totalPrice += parseFloat(item.price) * item.count;
        originalTotalPrice += parseFloat(item.originalPrice || item.price) * item.count;
        selectedCount += item.count;
      }
    });

    const discountPrice = (originalTotalPrice - totalPrice).toFixed(2);

    this.setData({
      totalPrice: totalPrice.toFixed(2),
      discountPrice: discountPrice > 0 ? discountPrice : '0.00',
      selectedCount
    });
  },

  // 切换管理模式
  toggleManageMode() {
    this.setData({
      isManageMode: !this.data.isManageMode
    });
  },

  // 删除选中的商品
  deleteSelected() {
    const selectedItems = this.data.cartList.filter(item => item.selected);
    if (selectedItems.length === 0) {
      wx.showToast({
        title: '请选择要删除的商品',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '提示',
      content: '确定要删除选中的商品吗？',
      success: (res) => {
        if (res.confirm) {
          const cartList = this.data.cartList.filter(item => !item.selected);
          this.setData({
            cartList,
            isAllSelected: false
          });
          this.calculateTotal();
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  },

  goToCheckout() {
    if (this.data.selectedCount === 0) {
      wx.showToast({
        title: '请选择商品',
        icon: 'none'
      });
      return;
    }
    wx.navigateTo({
      url: '/pages/confirm_order/confirm_order'
    });
  },

  // 数量减
  minusCount(e) {
    const id = e.currentTarget.dataset.id;
    const cartList = this.data.cartList.map(item => {
      if (item.id === id && item.count > 1) {
        return { ...item, count: item.count - 1 };
      }
      return item;
    });
    this.setData({ cartList });
    this.calculateTotal();
  },

  // 数量加
  addCount(e) {
    const id = e.currentTarget.dataset.id;
    const cartList = this.data.cartList.map(item => {
      if (item.id === id) {
        return { ...item, count: item.count + 1 };
      }
      return item;
    });
    this.setData({ cartList });
    this.calculateTotal();
  },

  switchTab(e) {
    const url = e.currentTarget.dataset.url;
    if (url) {
      wx.switchTab({ url });
    }
  }
});