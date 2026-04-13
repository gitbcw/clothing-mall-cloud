const util = require('../../utils/util.js');
const api = require('../../config/api.js');

const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    tabs: ['全部', '待付款', '待发货', '待收货/使用', '已完成'],
    currentTab: 0,

    orderList: [],
    page: 1,
    limit: 10,
    totalPages: 1,
    defaultImage: '/static/images/fallback-image.svg',
    emptyOrderImage: '/static/images/fallback-image.svg',
    aftersaleStatusColumns: ['可申请', '已申请，待审核', '审核通过，待补发', '换货已发货', '审核不通过，已拒绝', '已取消', '换货完成']
  },

  onLoad(options) {
    const { system } = wx.getDeviceInfo()
    const { statusBarHeight } = wx.getWindowInfo()
    const isIOS = system.indexOf('iOS') > -1
    this.setData({
      statusBarHeight,
      navBarHeight: isIOS ? 44 : 48
    })

    // 获取 tab 参数
    let tabIndex = 0
    if (options && options.type) {
      tabIndex = parseInt(options.type, 10)
    }
    try {
      const tab = wx.getStorageSync('tab')
      if (tab !== '' && tab !== undefined && tab !== null) {
        tabIndex = parseInt(tab, 10)
        wx.removeStorageSync('tab')
      }
    } catch (e) {}

    this.setData({ currentTab: tabIndex, showType: tabIndex })
  },

  onShow() {
    this.setData({
      orderList: [],
      page: 1,
      totalPages: 1
    })
    this.getOrderList()
  },

  // 获取订单列表
  getOrderList() {
    let that = this
    util.request(api.OrderList, {
      showType: that.data.currentTab,
      page: that.data.page,
      limit: that.data.limit
    }).then(function(res) {
      if (res.errno === 0) {
        const list = (res.data.list || []).map(item => {
          if (item.orderStatusText === '待评价') {
            item.orderStatusText = '已完成'
          }
          if (item.aftersaleStatus > 0) {
            item.aftersaleStatusText = that.data.aftersaleStatusColumns[item.aftersaleStatus] || '售后中'
          }
          return item
        })
        that.setData({
          orderList: that.data.orderList.concat(list),
          totalPages: res.data.pages || 1
        })
      }
    })
  },

  // 切换 tab
  switchTab(e) {
    const index = e.currentTarget.dataset.index
    this.setData({
      currentTab: index,
      orderList: [],
      page: 1,
      totalPages: 1
    })
    this.getOrderList()
  },

  // 触底加载更多
  onReachBottom() {
    if (this.data.totalPages > this.data.page) {
      this.setData({ page: this.data.page + 1 })
      this.getOrderList()
    } else {
      wx.showToast({ title: '没有更多订单了', icon: 'none' })
    }
  },

  // 跳转订单详情
  goOrderDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/pages/ucenter/orderDetail/orderDetail?id=' + id
    })
  },

  onOrderImageError(e) {
    const { orderIndex, goodsIndex } = e.currentTarget.dataset
    const list = this.data.orderList || []
    if (
      list[orderIndex] &&
      list[orderIndex].goodsList &&
      list[orderIndex].goodsList[goodsIndex] &&
      list[orderIndex].goodsList[goodsIndex].picUrl !== this.data.defaultImage
    ) {
      this.setData({
        [`orderList[${orderIndex}].goodsList[${goodsIndex}].picUrl`]: this.data.defaultImage
      })
    }
  },

  // 返回
  goBack() {
    wx.navigateBack({
      fail: () => {
        wx.switchTab({ url: '/pages/mine/mine' })
      }
    })
  },

  // 空状态图片加载失败
  onEmptyImageError() {
    this.setData({
      emptyOrderImage: this.data.defaultImage
    })
  },

  // 跳转首页逛逛
  goIndex() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
