const util = require('../../utils/util.js');
const api = require('../../config/api.js');
const tracker = require('../../utils/tracker.js');

const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,

    // 轮播图
    banners: [],

    // 热销推荐
    hotSales: [],
    hotSalesScroll: [],  // 复制一份用于无限循环滚动
    hotScrollDuration: 60,
    hotScrollPaused: false,

    // 搭配推荐
    matchRecommends: [],
    outfitScrollList: [],
    outfitScrollDuration: 80,
    outfitScrollPaused: false,

    // 活动位
    activityGoodsTop: [],
    activityGoodsBottom: [],
    activityTitle: '每周上新',
    activityTitleEn: 'NEW IN',
    activityBgImage: '',

    // 饰饰如意
    accessories: [],
    defaultImage: '/static/images/fallback-image.svg',

    // 尺码选择器
    showSkuPicker: false,
    skuGoods: {},

    // 鏾屏加载
    loading: true
  },

  onShareAppMessage() {
    return {
      title: '川着 transmute - 发现你的专属穿搭',
      desc: '精选服装，品质穿搭',
      path: '/pages/index/index'
    }
  },

  onPullDownRefresh() {
    this.loadData()
    this.loadSceneBanners()
    wx.stopPullDownRefresh()
  },

  onLoad() {
    // 初始化导航栏
    const { system } = wx.getDeviceInfo()
    const { statusBarHeight } = wx.getWindowInfo()
    const isIOS = system.indexOf('iOS') > -1
    this.setData({
      statusBarHeight,
      navBarHeight: isIOS ? 44 : 48
    })

    this.loadData()
    this.loadSceneBanners()
  },

  onShow() {
    // 更新 TabBar 状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ active: 0 })
    }
    // 页面浏览埋点
    tracker.trackPageView('首页')
    // 刷新轮播图，确保场景修改后能及时更新
    this.loadSceneBanners()
    // 更新购物车角标
    app.fetchCartCount()
  },

  onPageScroll() {},

  // 加载数数据
  loadData() {
    this.setData({ loading: true })
    util.request(api.IndexUrl).then(res => {
      if (res.errno === 0) {
        const { hotGoodsList = [] } = res.data

        const hotSales = hotGoodsList.filter(item => item.categoryId !== 1022001)
        this.setData({
          hotSales,
          hotSalesScroll: [...hotSales, ...hotSales],
          hotScrollDuration: Math.max(hotSales.length * 6, 80)
        })

        // 活动位数据
        const homeActivity = res.data.homeActivity
        if (homeActivity && homeActivity.goods) {
          // 根据 titleType 设置标题
          const titleMap = {
            holiday: { title: '节日特款', en: 'HOLIDAY' },
            special: { title: '限时特价', en: 'SALE' },
            weekly: { title: '每周上新', en: 'NEW IN' }
          }
          const titleInfo = titleMap[homeActivity.titleType] || titleMap.weekly
          const goods = homeActivity.goods
          const mid = Math.ceil(goods.length / 2)
          this.setData({
            activityGoodsTop: goods.slice(0, mid),
            activityGoodsBottom: goods.slice(mid),
            activityTitle: titleInfo.title,
            activityTitleEn: titleInfo.en
          })
        }

        // 穿搭推荐（替换原来的搭配推荐数据源）
        const outfitList = res.data.outfitList || []
        this.setData({
          matchRecommends: outfitList,
          outfitScrollList: [...outfitList, ...outfitList],
          outfitScrollDuration: Math.max(outfitList.length * 10, 40),
          loading: false
        })

        // 系统配置 - 活动位背景图 & 客服信息
        const systemConfig = res.data.systemConfig || {}
        let bgUrl = systemConfig.activityBgImage || ''

        // 客服配置存入全局
        var csConfig = {}
        if (systemConfig.csQrCode) {
          var csUrl = systemConfig.csQrCode
          if (csUrl.indexOf('://') === -1 && csUrl.indexOf('/') !== 0) {
            csUrl = 'https://636c-clo-test-4g8ukdond34672de-1258700476.tcb.qcloud.la/' + csUrl
          }
          csConfig.csQrCode = csUrl
        }
        if (systemConfig.csTitle) csConfig.csTitle = systemConfig.csTitle
        if (systemConfig.csSubtitle) csConfig.csSubtitle = systemConfig.csSubtitle
        if (systemConfig.csDesc) csConfig.csDesc = systemConfig.csDesc
        if (Object.keys(csConfig).length > 0) {
          app.globalData.csConfig = csConfig
        }
        if (bgUrl && bgUrl.indexOf('://') === -1 && bgUrl.indexOf('/') !== 0) {
          bgUrl = 'https://636c-clo-test-4g8ukdond34672de-1258700476.tcb.qcloud.la/' + bgUrl
        }
        this.setData({ activityBgImage: bgUrl })
      }
    }).catch(() => {
        this.setData({ loading: false })
        wx.showToast({ title: '网络错误', icon: 'none' })
      })

    // 单独加载饰品（从饰品分类获取）
    this.loadAccessories()
  },

  // 加载饰品数据
  loadAccessories() {
    util.request(api.GoodsList, {
      categoryId: 1022001,
      page: 1,
      limit: 4
    }).then(res => {
      if (res.errno === 0 && res.data.list) {
        const enableSizeMap = res.data.enableSizeMap || {}
        const accessories = res.data.list.slice(0, 4).map(item => ({
          ...item,
          enableSize: enableSizeMap[item.categoryId] !== false
        }))
        this.setData({ accessories })
      }
    }).catch(() => {})
  },

  // 加载场景轮播图
  loadSceneBanners() {
    util.request(api.SceneBanners).then(res => {
      if (res.errno === 0) {
        this.setData({ banners: res.data || [] })
      }
    }).catch(() => {
      this.setData({ banners: [] })
    })
  },

  // 跳转场景商品页
  goToScene(e) {
    const sceneId = e.currentTarget.dataset.sceneId
    wx.navigateTo({ url: `/pages/scene/scene?id=${sceneId}` })
  },

  // 跳转穿搭推荐详情
  goToOutfit(e) {
    const id = e.currentTarget.dataset.id
    const outfit = this.data.matchRecommends.find(o => o.id === id)
    if (outfit && outfit.goods && outfit.goods.length > 0) {
      wx.navigateTo({ url: `/pages/goods_detail/goods_detail?id=${outfit.goods[0].id}` })
    }
  },

  // 阻止冒泡
  preventTap() {},

  // 跳转商品详情
  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/goods_detail/goods_detail?id=${id}`
    })
  },

  onHomeImageError(e) {
    const { source, index } = e.currentTarget.dataset
    const defaultImage = this.data.defaultImage
    if (source === 'banners') {
      // banner 元素是对象，需要设置 url 属性
      if (this.data.banners[index] && this.data.banners[index].url !== defaultImage) {
        this.setData({
          [`banners[${index}].url`]: defaultImage
        })
      }
      return
    }
    const list = this.data[source] || []
    if (list[index] && list[index].picUrl !== defaultImage) {
      this.setData({
        [`${source}[${index}].picUrl`]: defaultImage
      })
    }
  },

  // 打开尺码选择器
  addToCart(e) {
    const id = e.currentTarget.dataset.id
    const goods = this.data.accessories.find(item => item.id === id)
      || this.data.hotSales.find(item => item.id === id)
      || this.data.activityGoodsTop.find(item => item.id === id)
      || this.data.activityGoodsBottom.find(item => item.id === id)
    if (!goods) return
    this.setData({
      showSkuPicker: true,
      skuGoods: goods
    })
    this.skuPicker = this.selectComponent('.sku-picker') || this.selectComponent('sku-picker')
    if (this.skuPicker) this.skuPicker.reset()
  },

  // 立即抢购 - 打开尺码选择器
  buyNow(e) {
    const id = e.currentTarget.dataset.id
    const goods = this.data.hotSales.find(item => item.id === id)
      || this.data.activityGoodsTop.find(item => item.id === id)
      || this.data.activityGoodsBottom.find(item => item.id === id)
    if (!goods) return
    this.setData({
      showSkuPicker: true,
      skuGoods: goods
    })
    this.skuPicker = this.selectComponent('.sku-picker') || this.selectComponent('sku-picker')
    if (this.skuPicker) this.skuPicker.reset()
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

  // 跳转购物车
  goToCart() {
    wx.switchTab({ url: '/pages/cart/cart' })
  },

  // 切换 Tab
  switchTab(e) {
    const url = e.currentTarget.dataset.url
    wx.switchTab({ url })
  },

  // 热销推荐自动滚动控制
  pauseHotScroll() {
    this.setData({ hotScrollPaused: true })
  },

  resumeHotScroll() {
    this.setData({ hotScrollPaused: false })
  },

  // 搭配推荐自动滚动控制
  pauseOutfitScroll() {
    this.setData({ outfitScrollPaused: true })
  },

  resumeOutfitScroll() {
    this.setData({ outfitScrollPaused: false })
  }
})
