/**
 * 尺码选择器组件 - 服装店专用（只选尺码，价格按标价）
 */
Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    goodsId: {
      type: Number,
      value: 0
    },
    goodsImage: {
      type: String,
      value: ''
    },
    goodsPrice: {
      type: Number,
      value: 0
    },
    bottomOffset: {
      type: Number,
      value: 0
    },
    enableSize: {
      type: Boolean,
      value: true
    },
    initSize: {
      type: String,
      value: ''
    },
    initQuantity: {
      type: Number,
      value: 1
    },
    preview: {
      type: Boolean,
      value: false
    }
  },

  data: {
    selectedSize: '',
    quantity: 1,
    // 写死的尺码列表（设计决策：当前商品均为标准服装尺码，无需从后端动态获取）
    sizes: ['S', 'M', 'L', 'XL']
  },

  observers: {
    'visible': function(visible) {
      if (visible) {
        // enableSize=false 时默认选中"均码"
        if (!this.properties.enableSize) {
          this.setData({
            selectedSize: '均码',
            quantity: this.properties.initQuantity || this.data.quantity || 1
          });
        } else {
          this.setData({
            selectedSize: this.properties.initSize || this.data.selectedSize || '',
            quantity: this.properties.initQuantity || this.data.quantity || 1
          });
        }
      }
    }
  },

  methods: {
    onClose() {
      this.triggerEvent('close', {
        size: this.data.selectedSize,
        quantity: this.data.quantity
      });
    },

    onSelectSize(e) {
      // 均码不可取消
      if (!this.properties.enableSize) return;
      const size = e.currentTarget.dataset.size;
      this.setData({
        selectedSize: this.data.selectedSize === size ? '' : size
      });
    },

    onDecrease() {
      if (this.data.quantity > 1) {
        this.setData({ quantity: this.data.quantity - 1 });
      }
    },

    onIncrease() {
      if (this.data.quantity < 99) {
        this.setData({ quantity: this.data.quantity + 1 });
      }
    },

    onAddToCart() {
      if (this.data.enableSize && !this.data.selectedSize) {
        wx.showToast({ title: '请选择尺码', icon: 'none' });
        return;
      }
      this.triggerEvent('addcart', {
        size: this.data.selectedSize || '',
        quantity: this.data.quantity
      });
    },

    onBuyNow() {
      if (this.data.enableSize && !this.data.selectedSize) {
        wx.showToast({ title: '请选择尺码', icon: 'none' });
        return;
      }
      this.triggerEvent('buynow', {
        size: this.data.selectedSize || '',
        quantity: this.data.quantity
      });
    },

    reset() {
      this.setData({
        selectedSize: '',
        quantity: 1
      });
    }
  }
});
