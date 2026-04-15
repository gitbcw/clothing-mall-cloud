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

  // ========== 缓存层 ==========
  // 商品缓存：{ categoryId: { list, pages, page } }
  _goodsCache: {},
  // navList 是否已加载（整个页面生命周期只加载一次）
  _navLoaded: false,
  // 预加载锁，防止重复预加载
  _preloading: false,

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

    this._goodsCache = {}
    this._navLoaded = false
    this.loadInitial()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ active: 1 })
    }
  },

  // ========== 首次加载：用合并接口一次拿到分类 + 商品 ==========

  loadInitial() {
    let that = this
    this.setData({ loading: true })

    util.request(api.GoodsCategoryWithGoods, {
      id: this.data.activeCategoryId,
      page: 1,
      limit: this.data.limit
    }).then(function(res) {
      if (res.errno !== 0) return
      const d = res.data

      // 处理分类结构
      that.setData({
        navList: d.brotherCategory || [],
        currentCategory: d.currentCategory || {}
      })

      if (d.parentCategory) {
        wx.setNavigationBarTitle({ title: d.parentCategory.name })
      }

      // L1 → L2 自动降级
      if (d.parentCategory && d.parentCategory.id === that.data.activeCategoryId) {
        that.setData({ activeCategoryId: d.currentCategory.id })
      }

      // 默认选中第一个
      var navList = that.data.navList
      if ((!that.data.activeCategoryId || !navList.find(function(item) { return item.id === that.data.activeCategoryId })) && navList.length > 0) {
        that.setData({ activeCategoryId: navList[0].id, currentCategory: navList[0] })
      }

      that._navLoaded = true

      // 处理商品数据
      that._applyGoodsData(d.goods)

      // 缓存当前分类的商品
      that._cacheCurrentGoods()

      // 预加载相邻分类
      that._preloadAdjacent()
    })
  },

  // ========== 切换分类（走缓存优先） ==========

  switchCate(e) {
    let id = e.currentTarget.dataset.id
    if (this.data.activeCategoryId === id) return

    // 滚动位置调整
    let clientX = e.detail && e.detail.x ? e.detail.x : 0
    let currentTarget = e.currentTarget
    if (clientX < 60) {
      this.setData({ scrollLeft: currentTarget.offsetLeft - 60 })
    } else if (clientX > 330) {
      this.setData({ scrollLeft: currentTarget.offsetLeft })
    }

    this._switchTo(id)
  },

  // 通用切换逻辑
  _switchTo(categoryId) {
    const cached = this._goodsCache[categoryId]

    // 切换 activeCategoryId
    this.setData({
      activeCategoryId: categoryId,
      scrollTop: 0
    })

    if (cached) {
      // 命中缓存：直接渲染，0 网络请求
      const enableSizeMap = cached.enableSizeMap || {}
      const list = (cached.list || []).map(function(item) {
        item.enableSize = enableSizeMap[item.categoryId] !== false
        return item
      })
      this.setData({
        goodsList: list,
        page: cached.page || 1,
        pages: cached.pages || 1,
        loading: false
      })
      this.updateWaterfall()
    } else {
      // 无缓存：请求合并接口
      this.setData({
        goodsList: [],
        leftGoodsList: [],
        rightGoodsList: [],
        page: 1,
        loading: true
      })
      this._fetchGoods(categoryId)
    }
  },

  // 请求商品数据（navList 已有，只请求商品）
  _fetchGoods(categoryId) {
    let that = this
    util.request(api.GoodsList, {
      categoryId: categoryId,
      page: 1,
      limit: that.data.limit
    }).then(function(res) {
      if (res.errno !== 0) return
      that._applyGoodsData(res.data)
      that._cacheCurrentGoods()
      that._preloadAdjacent()
    })
  },

  // ========== 加载更多（分页） ==========

  getGoodsList() {
    let that = this
    util.request(api.GoodsList, {
      categoryId: that.data.activeCategoryId,
      page: that.data.page,
      limit: that.data.limit
    }).then(function(res) {
      if (res.errno === 0) {
        that._applyGoodsData(res.data, true)
        that._cacheCurrentGoods()
      }
    })
  },

  // ========== 数据处理 ==========

  _applyGoodsData(goodsData, append) {
    if (!goodsData) return
    const enableSizeMap = goodsData.enableSizeMap || {}
    const newList = (goodsData.list || []).map(function(item) {
      item.enableSize = enableSizeMap[item.categoryId] !== false
      return item
    })

    let goodsList = append ? this.data.goodsList.concat(newList) : newList
    this.setData({
      goodsList: goodsList,
      pages: goodsData.pages || 1,
      loading: false
    })
    this.updateWaterfall()
  },

  _cacheCurrentGoods() {
    const id = this.data.activeCategoryId
    this._goodsCache[id] = {
      list: this.data.goodsList.slice(),
      pages: this.data.pages,
      page: this.data.page,
    }
  },

  // ========== 预加载相邻分类 ==========

  _preloadAdjacent() {
    if (this._preloading) return
    const navList = this.data.navList
    if (!navList.length) return

    const currentId = this.data.activeCategoryId
    const idx = navList.findIndex(item => item.id === currentId)

    // 找到需要预加载的相邻分类（前后各 1 个，跳过已缓存的）
    const toPreload = []
    if (idx > 0 && !this._goodsCache[navList[idx - 1].id]) {
      toPreload.push(navList[idx - 1].id)
    }
    if (idx < navList.length - 1 && !this._goodsCache[navList[idx + 1].id]) {
      toPreload.push(navList[idx + 1].id)
    }

    if (toPreload.length === 0) return

    this._preloading = true
    const limit = this.data.limit

    // 并发预加载
    const that = this
    Promise.all(toPreload.map(function(catId) {
      return util.request(api.GoodsList, {
        categoryId: catId,
        page: 1,
        limit: limit
      }).then(function(res) {
        if (res.errno === 0) {
          that._goodsCache[catId] = {
            list: (res.data.list || []).map(function(item) {
              item.enableSize = (res.data.enableSizeMap || {})[item.categoryId] !== false
              return item
            }),
            pages: res.data.pages || 1,
            page: 1,
          }
        }
      }).catch(function() {})
    })).then(function() {
      that._preloading = false
    })
  },

  // ========== 瀑布流布局 ==========

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

  // ========== 滚动与触摸 ==========

  onGoodsScroll(e) {
    this._scrollTop = e.detail.scrollTop
    this._scrollHeight = e.detail.scrollHeight
  },

  onTouchStart(e) {
    this._touchStartY = e.touches[0].clientY
  },

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
      if (this.data.page < this.data.pages) {
        this.setData({ page: this.data.page + 1 })
        this.getGoodsList()
      } else {
        this.switchToNextCategory()
      }
    } else if (deltaY > 0 && atTop) {
      this.switchToPrevCategory()
    }
  },

  switchToPrevCategory() {
    const navList = this.data.navList
    const currentId = this.data.activeCategoryId
    let currentIndex = navList.findIndex(item => item.id === currentId)

    if (currentIndex <= 0) {
      wx.showToast({ title: '已经是第一个了', icon: 'none' })
      return
    }

    this._switchTo(navList[currentIndex - 1].id)
  },

  switchToNextCategory() {
    const navList = this.data.navList
    const currentId = this.data.activeCategoryId
    let currentIndex = navList.findIndex(item => item.id === currentId)

    if (currentIndex === -1 || currentIndex >= navList.length - 1) {
      wx.showToast({ title: '已经到底了', icon: 'none' })
      return
    }

    this._switchTo(navList[currentIndex + 1].id)
  },

  // ========== 尺码选择器 ==========

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

  // ========== 跳转 ==========

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

  goBack() {
    wx.navigateBack({
      fail: () => {
        wx.switchTab({ url: '/pages/index/index' })
      }
    })
  }
})
