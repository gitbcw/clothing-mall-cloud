Component({
  properties: {
    // 订单数据
    order: {
      type: Object,
      value: {}
    }
  },

  data: {
    defaultGoodsImage: '/static/images/fallback-image.svg',
    // 订单状态映射
    statusMap: {
      101: { text: '待付款', color: '#ff976a' },
      102: { text: '待发货', color: '#07c160' },
      103: { text: '待收货', color: '#1989fa' },
      104: { text: '已完成', color: '#07c160' },
      201: { text: '已取消', color: '#999' },
      202: { text: '已退款', color: '#999' },
      301: { text: '已完成', color: '#07c160' },
      401: { text: '已发货', color: '#1989fa' },
      402: { text: '已收货', color: '#07c160' }
    }
  },

  methods: {
    onOrderTap(e) {
      const { id } = e.currentTarget.dataset
      this.triggerEvent('click', { id, order: this.data.order })
      wx.navigateTo({
        url: `/pages/ucenter/orderDetail/orderDetail?id=${id}`
      })
    },

    onGoodsTap(e) {
      const { id } = e.currentTarget.dataset
      wx.navigateTo({
        url: `/pages/goods_detail/goods_detail?id=${id}`
      })
    },

    onGoodsImageError(e) {
      const goodsIndex = e.currentTarget.dataset.goodsIndex
      const goodsList = this.data.order.goodsList || []
      if (goodsList[goodsIndex] && goodsList[goodsIndex].picUrl !== this.data.defaultGoodsImage) {
        this.setData({
          [`order.goodsList[${goodsIndex}].picUrl`]: this.data.defaultGoodsImage
        })
      }
    },

    onActionTap(e) {
      const { action } = e.currentTarget.dataset
      this.triggerEvent('action', { action, order: this.data.order })
    },

    getStatusText(orderStatus) {
      return this.data.statusMap[orderStatus]?.text || '未知状态'
    },

    getStatusColor(orderStatus) {
      return this.data.statusMap[orderStatus]?.color || '#999'
    }
  }
})
