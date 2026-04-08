Component({
  properties: {
    // 商品数据
    goods: {
      type: Object,
      value: {}
    },
    // 显示模式: grid(网格) | list(列表)
    mode: {
      type: String,
      value: 'grid'
    },
    // 是否显示原价
    showOriginPrice: {
      type: Boolean,
      value: true
    },
    // 是否显示销量
    showSales: {
      type: Boolean,
      value: false
    },
    // 是否显示购物车图标
    showCartIcon: {
      type: Boolean,
      value: true
    }
  },

  observers: {
    goods() {
      this.setData({
        imageError: false
      })
    }
  },

  data: {
    defaultImage: '/static/images/fallback-image.svg',
    imageError: false
  },

  methods: {
    onGoodsTap(e) {
      const { id } = e.currentTarget.dataset
      this.triggerEvent('click', { id, goods: this.data.goods })
      wx.navigateTo({
        url: `/pages/goods_detail/goods_detail?id=${id}`
      })
    },

    onQuickCart(e) {
      // 阻止事件冒泡，避免跳转详情页
      const goodsId = this.data.goods.id
      this.triggerEvent('quickcart', { id: goodsId, goods: this.data.goods })
    },

    onImageError() {
      this.setData({
        imageError: true
      })
    },

    onImageLoad() {
      this.setData({
        imageError: false
      })
    }
  }
})
