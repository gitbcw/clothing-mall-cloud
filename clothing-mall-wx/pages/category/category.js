const util = require('../../utils/util.js');
const api = require('../../config/api.js');
const tracker = require('../../utils/tracker.js');

const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,

    // 分类列表
    navList: [],
    activeCategoryId: 0,

    // 按分类分组的商品
    groupedGoods: [],  // [{ categoryId, name, goods: [], leftGoods: [], rightGoods: [] }]
    loading: false,

    // 滚动联动
    scrollIntoView: '',     // 左侧 sidebar scroll-into-view
    scrollIntoViewItem: '', // 右侧内容 scroll-into-view

    defaultImage: '/static/images/fallback-image.svg',
    scrollViewHeight: 0,

    // 尺码选择器
    showSkuPicker: false,
    skuGoods: {}
  },

  // 保存所有商品扁平列表，供 SKU Picker 查找
  _allGoodsMap: {},
  // 防止点击侧边栏触发的滚动反过来更新高亮
  _scrollByTap: false,
  // 滚动节流
  _scrollThrottle: null,

  onLoad(options) {
    const { system } = wx.getDeviceInfo()
    const { statusBarHeight, windowHeight } = wx.getWindowInfo()
    const isIOS = system.indexOf('iOS') > -1
    this.setData({
      statusBarHeight,
      navBarHeight: isIOS ? 44 : 48,
      scrollViewHeight: windowHeight - statusBarHeight - (isIOS ? 44 : 48) - 52
    })

    if (options.id) {
      this.setData({ activeCategoryId: parseInt(options.id) })
    }

    this.loadAllGoods()
  },

  onShow() {
    tracker.trackPageView('分类页');

    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ active: 1 })
    }
    app.fetchCartCount()
  },

  // ========== 全量加载 ==========

  loadAllGoods() {
    this.setData({ loading: true })

    util.request(api.GoodsListAllBrief).then(res => {
      if (res.errno !== 0) return
      const { list, categories, enableSizeMap } = res.data

      // 构建分类 map
      const catMap = {}
      categories.forEach(cat => { catMap[cat.id] = cat.name })

      // 按 categoryId 分组
      const groupMap = {}
      const groupOrder = []
      list.forEach(item => {
        item.enableSize = enableSizeMap[item.categoryId] !== false
        const cid = item.categoryId
        if (!groupMap[cid]) {
          groupMap[cid] = { categoryId: cid, name: catMap[cid] || '未分类', goods: [] }
          groupOrder.push(cid)
        }
        groupMap[cid].goods.push(item)
      })

      // 按分类排序（保持 navList 顺序），为每个分组计算瀑布流
      const navList = categories
      const groupedGoods = []
      for (const cat of navList) {
        const group = groupMap[cat.id]
        if (group && group.goods.length > 0) {
          group.leftGoods = []
          group.rightGoods = []
          group.goods.forEach((item, i) => {
            if (i % 2 === 0) group.leftGoods.push(item)
            else group.rightGoods.push(item)
          })
          groupedGoods.push(group)
        }
      }

      // 构建 allGoodsMap（用于 SKU Picker 查找商品）
      const allGoodsMap = {}
      list.forEach(item => { allGoodsMap[item.id] = item })

      // 确定默认 activeCategoryId
      let activeCategoryId = this.data.activeCategoryId
      if (!activeCategoryId || !navList.find(c => c.id === activeCategoryId)) {
        activeCategoryId = navList.length > 0 ? navList[0].id : 0
      }

      this.setData({
        navList,
        activeCategoryId,
        groupedGoods,
        loading: false,
      })
      this._allGoodsMap = allGoodsMap

      // 初始跳转
      if (activeCategoryId) {
        setTimeout(() => {
          this.setData({ scrollIntoViewItem: 'section-' + activeCategoryId })
        }, 300)
      }
    })
  },

  // ========== 滚动联动（实时 DOM 查询） ==========

  onGoodsScroll() {
    if (this._scrollByTap) {
      this._scrollByTap = false
      return
    }

    // 节流：80ms 内只查一次
    if (this._scrollThrottle) return
    this._scrollThrottle = setTimeout(() => {
      this._scrollThrottle = null
      this._updateActiveByScroll()
    }, 80)
  },

  _updateActiveByScroll() {
    const { groupedGoods, activeCategoryId } = this.data
    if (!groupedGoods.length) return

    const currentIdx = groupedGoods.findIndex(g => g.categoryId === activeCategoryId)
    if (currentIdx === -1) return

    // 一张商品卡片高度（340rpx ≈ 170px，加上 info 区约 220px）
    const CARD_HEIGHT = 220

    const query = wx.createSelectorQuery()
    query.select('.goods-content').boundingClientRect()
    query.select('#section-' + activeCategoryId).boundingClientRect()
    if (currentIdx > 0) {
      query.select('#section-' + groupedGoods[currentIdx - 1].categoryId).boundingClientRect()
    }
    query.exec(results => {
      if (!results || !results[0] || !results[1]) return
      const viewTop = results[0].top
      const currentRect = results[1]

      let newId = activeCategoryId

      // 向下滚：当前区块底部离顶边 < 一张卡片高度 → 切下一个
      const remaining = currentRect.bottom - viewTop
      if (remaining < CARD_HEIGHT && currentIdx < groupedGoods.length - 1) {
        newId = groupedGoods[currentIdx + 1].categoryId
      }

      // 向上滚：上一个区块底部离顶边 > 一张卡片高度 → 切回上一个
      if (newId === activeCategoryId && currentIdx > 0 && results[2]) {
        const prevRect = results[2]
        const prevVisible = prevRect.bottom - viewTop
        if (prevVisible > CARD_HEIGHT) {
          newId = groupedGoods[currentIdx - 1].categoryId
        }
      }

      if (newId !== activeCategoryId) {
        this.setData({
          activeCategoryId: newId,
          scrollIntoView: 'nav-' + newId,
        })
      }
    })
  },

  // ========== 侧边栏点击 → 跳转 ==========

  switchCate(e) {
    const id = e.currentTarget.dataset.id
    if (this.data.activeCategoryId === id) return
    this._scrollByTap = true
    this.setData({
      activeCategoryId: id,
      scrollIntoViewItem: 'section-' + id,
      scrollIntoView: 'nav-' + id,
    })
  },

  // ========== 尺码选择器 ==========

  addToCart(e) {
    const id = e.currentTarget.dataset.id
    const goods = this._allGoodsMap[id]
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
        app.fetchCartCount()
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
    const { index, groupindex, source } = e.currentTarget.dataset
    const key = `groupedGoods[${groupindex}].${source}[${index}].picUrl`
    this.setData({
      [key]: this.data.defaultImage
    })
  },

  goBack() {
    wx.navigateBack({
      fail: () => {
        wx.switchTab({ url: '/pages/index/index' })
      }
    })
  }
})
