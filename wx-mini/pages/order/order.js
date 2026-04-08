const app = getApp()

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    tabs: ['全部', '待付款', '待发货', '待收货', '已完成'],
    currentTab: 0,
    allOrders: [
      {
        id: 1,
        status: '待付款',
        title: '敬修堂防脱滋养育发洗发露',
        desc: '控油防脱两不误 细腻丰富泡沫',
        price: '50.00',
        originalPrice: '69',
        count: 1,
        image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
        buttons: [
          { text: '取消订单', type: 'default' },
          { text: '继续付款', type: 'primary' }
        ]
      },
      {
        id: 2,
        status: '待发货',
        title: '敬修堂防脱滋养育发洗发露',
        desc: '控油防脱两不误 细腻丰富泡沫',
        price: '50.00',
        originalPrice: '69',
        count: 1,
        image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
        buttons: [
          { text: '申请售后', type: 'default' },
          { text: '再来一单', type: 'default' }
        ]
      },
      {
        id: 3,
        status: '待收货',
        title: '敬修堂防脱滋养育发洗发露',
        desc: '控油防脱两不误 细腻丰富泡沫',
        price: '50.00',
        originalPrice: '69',
        count: 1,
        image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
        buttons: [
          { text: '申请售后', type: 'default' },
          { text: '查看物流', type: 'default' },
          { text: '确认收货', type: 'primary' }
        ]
      },
      {
        id: 4,
        status: '已完成',
        title: '敬修堂防脱滋养育发洗发露',
        desc: '控油防脱两不误 细腻丰富泡沫',
        price: '199.9',
        originalPrice: '',
        count: 1,
        image: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
        buttons: [
          { text: '查看物流', type: 'default' },
          { text: '再来一单', type: 'default' }
        ]
      }
    ],
    orders: []
  },

  onLoad(options) {
    const sysInfo = wx.getSystemInfoSync();
    const isIOS = sysInfo.system.indexOf('iOS') > -1;
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight,
      navBarHeight: isIOS ? 44 : 48
    });

    let tabIndex = 0;
    if (options && options.type) {
      tabIndex = parseInt(options.type, 10);
    }
    
    this.setData({
      currentTab: tabIndex
    });
    this.filterOrders(tabIndex);
  },

  switchTab(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      currentTab: index
    });
    this.filterOrders(index);
  },

  filterOrders(tabIndex) {
    const tabs = this.data.tabs;
    const currentStatus = tabs[tabIndex];
    let filteredOrders = [];

    if (currentStatus === '全部') {
      filteredOrders = this.data.allOrders;
    } else {
      filteredOrders = this.data.allOrders.filter(order => order.status === currentStatus);
    }

    this.setData({
      orders: filteredOrders
    });
  },

  goBack() {
    wx.navigateBack({
      fail: () => {
        wx.redirectTo({
          url: '/pages/mine/mine'
        });
      }
    });
  }
})