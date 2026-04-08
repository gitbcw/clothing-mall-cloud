Component({
  properties: {
    // 加载状态
    loading: {
      type: Boolean,
      value: false
    },
    // 是否有更多数据
    hasMore: {
      type: Boolean,
      value: true
    },
    // 下拉刷新状态
    refreshing: {
      type: Boolean,
      value: false
    },
    // 骨架屏模式
    skeleton: {
      type: Boolean,
      value: true
    },
    // 骨架屏行数
    rows: {
      type: Number,
      value: 3
    }
  },

  data: {
    skeletonRows: []
  },

  observers: {
    'rows': function(val) {
      this.setData({
        skeletonRows: Array.from({ length: val }, (_, i) => i)
      })
    }
  },

  methods: {
    onLoadMore() {
      if (this.data.loading || !this.data.hasMore) return
      this.triggerEvent('loadmore')
    },

    onRefresh() {
      this.setData({ refreshing: true })
      this.triggerEvent('refresh')
    },

    stopRefreshing() {
      this.setData({ refreshing: false })
    }
  }
})
