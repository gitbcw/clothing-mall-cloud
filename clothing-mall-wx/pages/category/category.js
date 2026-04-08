const util = require('../../utils/util.js');
const api = require('../../config/api.js');

const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,

    // 分类列表
    navList: [],
    currentCategory: {},
    activeCategoryId: 0,

    // 商品列表
    goodsList: [],
    page: 1,
    limit: 10,
    pages: 1,
    loading: false,

    // 瀑布流
    leftGoodsList: [],
    rightGoodsList: [],
    defaultImage: '/static/images/fallback-image.svg',

    scrollLeft: 0,
    scrollTop: 0,
    scrollHeight: 0,
    scrollViewHeight: 0,

    // 尺码选择器
    showSkuPicker: false,
    skuGoods: {}
  },

  onLoad(options) {
    const { system } = wx.getDeviceInfo()
    const { statusBarHeight, windowHeight } = wx.getWindowInfo()
    const isIOS = system.indexOf('iOS') > -1
    this.setData({
      statusBarHeight,
      navBarHeight: isIOS ? 44 : 48,
      scrollHeight: windowHeight,
      scrollViewHeight: windowHeight - statusBarHeight - (isIOS ? 44 : 48) - 52
    })

    if (options.id) {
      this.setData({ activeCategoryId: parseInt(options.id) })
    }

    this.getCategoryInfo()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ active: 1 })
    }
  },

  // 获取分类信息
  getCategoryInfo() {
    let that = this
    this.setData({ loading: true })
    util.request(api.GoodsCategory, {
      id: this.data.activeCategoryId
    }).then(function(res) {
      if (res.errno === 0) {
        that.setData({
          navList: res.data.brotherCategory || [],
          currentCategory: res.data.currentCategory || {}
        })

        // 设置导航栏标题
        if (res.data.parentCategory) {
          wx.setNavigationBarTitle({
            title: res.data.parentCategory.name
          })
        }

        // 当id是L1分类id时，需要重新设置成L1分类的一个子分类的id
        if (res.data.parentCategory && res.data.parentCategory.id === that.data.activeCategoryId) {
          that.setData({
            activeCategoryId: res.data.currentCategory.id
          })
        }

        // 默认选中第一个分类
        var navList = that.data.navList
        if ((!that.data.activeCategoryId || !navList.find(function(item) { return item.id === that.data.activeCategoryId })) && navList.length > 0) {
          that.setData({
            activeCategoryId: navList[0].id,
            currentCategory: navList[0]
          })
        }

        // 调整滚动位置
        let currentIndex = 0
        let navListCount = that.data.navList.length
        for (let i = 0; i < navListCount; i++) {
          currentIndex += 1
          if (that.data.navList[i].id === that.data.activeCategoryId) {
            break
          }
        }
        if (currentIndex > navListCount / 2 && navListCount > 5) {
          that.setData({
            scrollLeft: currentIndex * 60
          })
        }

        // 获取商品列表
        that.data.page = 1
        that.data.goodsList = []
        that.getGoodsList()
      }
    })
  },

  // 获取商品列表
  getGoodsList() {
    let that = this
    util.request(api.GoodsList, {
      categoryId: that.data.activeCategoryId,
      page: that.data.page,
      limit: that.data.limit
    }).then(function(res) {
      if (res.errno === 0) {
        const enableSizeMap = res.data.enableSizeMap || {}
        const newList = (res.data.list || []).map(function(item) {
          item.enableSize = enableSizeMap[item.categoryId] !== false
          return item
        })
        let goodsList = that.data.goodsList.concat(newList)
        that.setData({
          goodsList: goodsList,
          pages: res.data.pages || 1,
          loading: false
        })
        // 更新瀑布流
        that.updateWaterfall()
      }
    })
  },

  // 更新瀑布流布局
  updateWaterfall() {
    const goodsList = this.data.goodsList
    const leftGoodsList = []
    const rightGoodsList = []

    goodsList.forEach((item, index) => {
      if (index % 2 === 0) {
        leftGoodsList.push(item)
      } else {
        rightGoodsList.push(item)
      }
    })

    this.setData({ leftGoodsList, rightGoodsList })
  },

  // 记录滚动位置
  onGoodsScroll(e) {
    this._scrollTop = e.detail.scrollTop
    this._scrollHeight = e.detail.scrollHeight
  },

  // 触摸开始
  onTouchStart(e) {
    this._touchStartY = e.touches[0].clientY
  },

  // 触摸结束，判断滑动方向 + 边界
  onTouchEnd(e) {
    if (this.data.loading) return

    const deltaY = e.changedTouches[0].clientY - this._touchStartY
    if (Math.abs(deltaY) < 50) return

    const scrollTop = this._scrollTop || 0
    const scrollHeight = this._scrollHeight || 0
    const viewHeight = this.data.scrollViewHeight
    const atTop = scrollTop <= 100
    const atBottom = scrollTop + viewHeight >= scrollHeight - 100

    if (deltaY < 0 && atBottom) {
      // 上滑到底：有下一页就加载，没有就跳下一个分类
      if (this.data.page < this.data.pages) {
        this.setData({ page: this.data.page + 1 })
        this.getGoodsList()
      } else {
        this.switchToNextCategory()
      }
    } else if (deltaY > 0 && atTop) {
      // 下拉到顶：跳上一个分类
      this.switchToPrevCategory()
    }
  },

  // 切换到上一个分类
  switchToPrevCategory() {
    const navList = this.data.navList
    const currentId = this.data.activeCategoryId
    let currentIndex = navList.findIndex(item => item.id === currentId)

    if (currentIndex <= 0) {
      wx.showToast({ title: '已经是第一个了', icon: 'none' })
      return
    }

    const prevCategory = navList[currentIndex - 1]
    this.setData({
      activeCategoryId: prevCategory.id,
      page: 1,
      goodsList: [],
      leftGoodsList: [],
      rightGoodsList: []
    })

    this.getCategoryInfo()
  },

  // 自动切换到下一个分类
  switchToNextCategory() {
    const navList = this.data.navList
    const currentId = this.data.activeCategoryId
    let currentIndex = navList.findIndex(item => item.id === currentId)

    if (currentIndex === -1 || currentIndex >= navList.length - 1) {
      wx.showToast({ title: '已经到底了', icon: 'none' })
      return
    }

    const nextCategory = navList[currentIndex + 1]
    this.setData({
      activeCategoryId: nextCategory.id,
      page: 1,
      goodsList: [],
      leftGoodsList: [],
      rightGoodsList: [],
      scrollTop: 0
    })

    this.getCategoryInfo()
  },

  // 切换分类
  switchCate(e) {
    let id = e.currentTarget.dataset.id
    if (this.data.activeCategoryId === id) {
      return
    }

    let clientX = e.detail && e.detail.x ? e.detail.x : 0
    let currentTarget = e.currentTarget
    if (clientX < 60) {
      this.setData({ scrollLeft: currentTarget.offsetLeft - 60 })
    } else if (clientX > 330) {
      this.setData({ scrollLeft: currentTarget.offsetLeft })
    }

    this.setData({
      activeCategoryId: id,
      page: 1,
      goodsList: [],
      leftGoodsList: [],
      rightGoodsList: [],
      scrollTop: 0
    })

    this.getCategoryInfo()
  },

  // 打开尺码选择器
  addToCart(e) {
    const id = e.currentTarget.dataset.id
    const goods = this.data.goodsList.find(item => item.id === id)
    if (!goods) return
    this.setData({
      showSkuPicker: true,
      skuGoods: goods
    })
    const skuPicker = this.selectComponent('sku-picker')
    if (skuPicker) skuPicker.reset()
  },

  closeSkuPicker() {
    this.setData({ showSkuPicker: false })
  },

  skuAddToCart(e) {
    const { size, quantity } = e.detail
    util.request(api.CartAdd, {
      goodsId: this.data.skuGoods.id,
      number: quantity,
      size: size
    }, 'POST').then(res => {
      if (res.errno === 0) {
        wx.showToast({ title: '已加入购物车' })
        this.setData({ showSkuPicker: false })
      } else {
        wx.showToast({ title: res.errmsg || '添加失败', icon: 'none' })
      }
    })
  },

  skuBuyNow(e) {
    const { size, quantity } = e.detail
    util.request(api.CartFastAdd, {
      goodsId: this.data.skuGoods.id,
      number: quantity,
      size: size
    }, 'POST').then(res => {
      if (res.errno === 0) {
        wx.setStorageSync('cartId', res.data)
        this.setData({ showSkuPicker: false })
        wx.navigateTo({ url: '/pages/confirm_order/confirm_order' })
      } else {
        wx.showToast({ title: res.errmsg || '操作失败', icon: 'none' })
      }
    })
  },

  // 跳转商品详情
  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/goods_detail/goods_detail?id=${id}`
    })
  },

  goSearch() {
    wx.navigateTo({
      url: '/pages/search/search'
    })
  },

  onCategoryImageError(e) {
    const { source, index } = e.currentTarget.dataset
    const list = this.data[source] || []
    const defaultImage = this.data.defaultImage
    if (list[index] && list[index].picUrl !== defaultImage) {
      this.setData({
        [`${source}[${index}].picUrl`]: defaultImage
      })
    }
  },

  // 返回
  goBack() {
    wx.navigateBack({
      fail: () => {
        wx.switchTab({ url: '/pages/index/index' })
      }
    })
  }
})
