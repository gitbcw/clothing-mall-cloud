const util = require('../../utils/util.js');
const api = require('../../config/api.js');

const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,

    // 购物车商品
    cartGoods: [],
    cartTotal: {
      goodsCount: 0,
      goodsAmount: 0.00,
      checkedGoodsCount: 0,
      checkedGoodsAmount: 0.00
    },

    isManageMode: false,
    checkedAllStatus: true,
    hasLogin: false,
    loading: true,
    defaultGoodsImage: '/static/images/fallback-image.svg',
    emptyImage: '/static/images/fallback-image.svg'
  },

  onLoad() {
    const { system } = wx.getDeviceInfo()
    const { statusBarHeight } = wx.getWindowInfo()
    const isIOS = system.indexOf('iOS') > -1
    this.setData({
      statusBarHeight,
      navBarHeight: isIOS ? 44 : 48
    })
  },

  onShow() {
    // 更新 TabBar 状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ active: 2 })
    }

    // 检查登录状态
    this.setData({ hasLogin: app.globalData.hasLogin })

    if (app.globalData.hasLogin) {
      this.getCartList()
    } else {
      this.setData({ loading: false })
    }
  },

  // 获取购物车列表
  getCartList() {
    let that = this
    util.request(api.CartList).then(function(res) {
      if (res.errno === 0) {
        that.setData({
          cartGoods: res.data.cartList || [],
          cartTotal: res.data.cartTotal || {},
          loading: false
        })
        that.setData({
          checkedAllStatus: that.isCheckedAll()
        })
      } else {
        that.setData({ loading: false })
      }
    }).catch(function() {
      that.setData({ loading: false })
    })
  },

  // 判断是否全选
  isCheckedAll() {
    if (this.data.cartGoods.length === 0) return false
    return this.data.cartGoods.every(function(item) {
      return item.checked === true
    })
  },

  // 单选
  checkedItem(e) {
    let itemIndex = e.currentTarget.dataset.itemIndex
    let that = this
    let cartIds = [that.data.cartGoods[itemIndex].id]

    util.request(api.CartChecked, {
      productIds: cartIds,
      isChecked: that.data.cartGoods[itemIndex].checked ? 0 : 1
    }, 'POST').then(function(res) {
      if (res.errno === 0) {
        that.setData({
          cartGoods: res.data.cartList,
          cartTotal: res.data.cartTotal
        })
        that.setData({
          checkedAllStatus: that.isCheckedAll()
        })
      }
    })
  },

  // 全选
  checkedAll() {
    let that = this
    let cartIds = this.data.cartGoods.map(function(v) {
      return v.id
    })

    util.request(api.CartChecked, {
      productIds: cartIds,
      isChecked: that.isCheckedAll() ? 0 : 1
    }, 'POST').then(function(res) {
      if (res.errno === 0) {
        that.setData({
          cartGoods: res.data.cartList,
          cartTotal: res.data.cartTotal
        })
        that.setData({
          checkedAllStatus: that.isCheckedAll()
        })
      }
    })
  },

  // 数量减
  cutNumber(e) {
    let itemIndex = e.currentTarget.dataset.itemIndex
    let cartItem = this.data.cartGoods[itemIndex]
    let number = (cartItem.number - 1 > 1) ? cartItem.number - 1 : 1
    cartItem.number = number
    this.setData({ cartGoods: this.data.cartGoods })
    this.updateCart(cartItem.productId, cartItem.goodsId, number, cartItem.id)
  },

  // 数量加
  addNumber(e) {
    let itemIndex = e.currentTarget.dataset.itemIndex
    let cartItem = this.data.cartGoods[itemIndex]
    let number = cartItem.number + 1
    cartItem.number = number
    this.setData({ cartGoods: this.data.cartGoods })
    this.updateCart(cartItem.productId, cartItem.goodsId, number, cartItem.id)
  },

  // 更新购物车
  updateCart(productId, goodsId, number, id) {
    let that = this
    util.request(api.CartUpdate, {
      productId: productId,
      goodsId: goodsId,
      number: number,
      id: id
    }, 'POST').then(function(res) {
      that.setData({
        checkedAllStatus: that.isCheckedAll()
      })
      // 重新获取购物车列表以更新总价
      that.getCartList()
    })
  },

  // 切换管理模式
  toggleManageMode() {
    this.setData({
      isManageMode: !this.data.isManageMode
    })
  },

  // 删除选中商品
  deleteCart() {
    let that = this
    let cartIds = this.data.cartGoods.filter(function(item) {
      return item.checked === true
    }).map(function(item) {
      return item.id
    })

    if (cartIds.length <= 0) {
      wx.showToast({ title: '请选择要删除的商品', icon: 'none' })
      return
    }

    wx.showModal({
      title: '提示',
      content: '确定要删除选中的商品吗？',
      success: function(res) {
        if (res.confirm) {
          util.request(api.CartDelete, {
            productIds: cartIds
          }, 'POST').then(function(res) {
            if (res.errno === 0) {
              that.setData({
                cartGoods: res.data.cartList || [],
                cartTotal: res.data.cartTotal
              })
              that.setData({
                checkedAllStatus: that.isCheckedAll()
              })
              wx.showToast({ title: '删除成功', icon: 'success' })
            }
          })
        }
      }
    })
  },

  // 去结算
  checkoutOrder() {
    let checkedGoods = this.data.cartGoods.filter(function(item) {
      return item.checked === true
    })

    if (checkedGoods.length <= 0) {
      wx.showToast({ title: '请选择商品', icon: 'none' })
      return
    }

    try {
      wx.setStorageSync('cartId', 0)
      wx.navigateTo({
        url: '/pages/confirm_order/confirm_order'
      })
    } catch (e) {
      console.error(e)
    }
  },

  // 去登录
  goLogin() {
    wx.navigateTo({
      url: '/pages/auth/login/login'
    })
  },

  onCartImageError(e) {
    const itemIndex = e.currentTarget.dataset.itemIndex
    const goodsList = this.data.cartGoods || []
    if (goodsList[itemIndex] && goodsList[itemIndex].picUrl !== this.data.defaultGoodsImage) {
      this.setData({
        [`cartGoods[${itemIndex}].picUrl`]: this.data.defaultGoodsImage
      })
    }
  },

  onEmptyImageError() {
    if (this.data.emptyImage !== this.data.defaultGoodsImage) {
      this.setData({
        emptyImage: this.data.defaultGoodsImage
      })
    }
  },

  // 跳转商品详情
  goToDetail(e) {
    const goodsId = e.currentTarget.dataset.goodsId
    if (!goodsId) return
    wx.navigateTo({
      url: '/pages/goods_detail/goods_detail?id=' + goodsId
    })
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
