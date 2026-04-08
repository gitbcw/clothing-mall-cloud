Component({
  properties: {
    // 空状态类型
    type: {
      type: String,
      value: 'default'
      // default, cart, order, favorite, search, network
    },
    // 自定义提示文字
    message: {
      type: String,
      value: ''
    },
    // 是否显示按钮
    showButton: {
      type: Boolean,
      value: false
    },
    // 按钮文字
    buttonText: {
      type: String,
      value: '去看看'
    }
  },

  data: {
    // 默认配置
    configs: {
      default: {
        image: '/images/empty/default.png',
        message: '暂无数据'
      },
      cart: {
        image: '/images/empty/cart.png',
        message: '购物车空空如也'
      },
      order: {
        image: '/images/empty/order.png',
        message: '暂无订单'
      },
      favorite: {
        image: '/images/empty/favorite.png',
        message: '暂无收藏'
      },
      search: {
        image: '/images/empty/search.png',
        message: '没有搜索到相关商品'
      },
      network: {
        image: '/images/empty/network.png',
        message: '网络连接失败'
      }
    }
  },

  methods: {
    onButtonTap() {
      this.triggerEvent('action')
    }
  }
})
