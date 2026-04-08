const util = require('../../utils/util.js')
const api = require('../../config/api.js')

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    sceneName: '',
    sceneDesc: '',
    goodsList: [],
    leftGoodsList: [],
    rightGoodsList: [],
    page: 1,
    limit: 10,
    pages: 1,
    loading: false,
    defaultImage: '/static/images/fallback-image.svg'
  },

  onLoad(options) {
    const { statusBarHeight } = wx.getWindowInfo()
    this.setData({
      statusBarHeight,
      navBarHeight: 44
    })
    if (options.id) {
      this.sceneId = options.id
      this.getGoodsList()
      this.getSceneInfo()
    }
  },

  getSceneInfo() {
    util.request(api.SceneBanners).then(res => {
      const scenes = res.data || []
      const scene = scenes.find(s => String(s.id) === String(this.sceneId))
      if (scene) {
        this.setData({
          sceneName: scene.name,
          sceneDesc: scene.description || ''
        })
        wx.setNavigationBarTitle({ title: scene.name })
      }
    }).catch(() => {})
  },

  getGoodsList() {
    if (this.data.loading) return
    if (this.data.page > this.data.pages) return

    this.setData({ loading: true })
    util.request(api.SceneGoods, {
      sceneId: this.sceneId,
      page: this.data.page,
      limit: this.data.limit
    }).then(res => {
      const data = res.data
      const newList = this.data.goodsList.concat(data.list || [])
      this.setData({
        goodsList: newList,
        pages: data.pages || 1,
        page: this.data.page + 1,
        loading: false
      })
      this.updateWaterfall(newList)
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  updateWaterfall(list) {
    const left = this.data.leftGoodsList
    const right = this.data.rightGoodsList
    list.forEach((item, index) => {
      if (index % 2 === 0) {
        left.push(item)
      } else {
        right.push(item)
      }
    })
    this.setData({ leftGoodsList: left, rightGoodsList: right })
  },

  onReachBottom() {
    this.getGoodsList()
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/goods_detail/goods_detail?id=${id}` })
  },

  onImageError(e) {
    const index = e.currentTarget.dataset.index
    const col = e.currentTarget.dataset.col
    if (col === 'left') {
      const list = this.data.leftGoodsList
      list[index].picUrl = this.data.defaultImage
      this.setData({ leftGoodsList: list })
    } else {
      const list = this.data.rightGoodsList
      list[index].picUrl = this.data.defaultImage
      this.setData({ rightGoodsList: list })
    }
  },

  goBack() {
    wx.navigateBack().catch(() => {
      wx.switchTab({ url: '/pages/index/index' })
    })
  }
})
