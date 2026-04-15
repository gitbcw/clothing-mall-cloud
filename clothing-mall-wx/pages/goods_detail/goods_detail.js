const util = require('../../utils/util.js');
const api = require('../../config/api.js');
const tracker = require('../../utils/tracker.js');

const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,

    // 商品信息
    id: 0,
    goods: {},
    gallery: [],
    currentSwiper: 1,
    info: {},

    // 规格选择
    specificationList: [],
    productList: [],
    checkedSpecText: '请选择规格数量',
    checkedSpecPrice: 0,
    tmpPicUrl: '',
    tmpSpecText: '请选择规格数量',
    openAttr: false,
    number: 1,

    // 收藏
    userHasCollect: 0,
    collect: false,

    // 购物车
    cartGoodsCount: 0,

    // 推荐商品
    relatedGoods: [],

    // 尺码选择器
    showSkuPicker: false,
    enableSize: true,
    selectedSize: '',
    selectedQuantity: 1,

    // 分享
    canShare: true,
    openShare: false,
    defaultImage: '/static/images/fallback-image.svg',

    // 收货地址
    checkedAddress: null,

    // 服务弹窗
    showServicePopup: false,

    // 预览模式
    isPreview: false,

    // 加载状态
    loading: true,

    // 商品已下架
    isUnshelved: false
  },

  onShareAppMessage() {
    return {
      title: this.data.goods.name || '川着Transmute商品',
    }
  },

  onLoad(options) {
    if (options.preview === '1') {
      this.setData({ isPreview: true })
      if (options.from === 'draft') {
        this.loadDraftPreview()
      } else if (options.id) {
        this.setData({ id: parseInt(options.id) })
        this.getGoodsInfo()
      }
    } else if (options.id) {
      this.setData({ id: parseInt(options.id) })
      this.getGoodsInfo()
    }

    // 权限在保存海报时按需请求，不提前授权
  },

  onShow() {
    // 更新 TabBar 状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ active: -1 }) // 商品详情页不需要高亮 TabBar
    }

    // 获取购物车数量
    let that = this
    util.request(api.CartGoodsCount).then(function(res) {
      if (res.errno === 0) {
        that.setData({ cartGoodsCount: res.data })
      }
    })

    // 回显选中的收货地址
    this.loadCheckedAddress()

    // 页面浏览埋点
    if (this.data.goods && this.data.goods.id) {
      tracker.trackPageView('商品详情-' + this.data.goods.name)
    }
  },

  // 从 storage 加载上架表单预览数据
  loadDraftPreview() {
    try {
      var data = wx.getStorageSync('previewGoodsData')
      if (!data) {
        util.showErrorToast('预览数据不存在')
        setTimeout(function() { wx.navigateBack() }, 1500)
        return
      }
      var gallery = [data.picUrl || this.data.defaultImage]
      if (data.gallery && data.gallery.length > 0) {
        gallery = data.gallery
      }
      this.setData({
        loading: false,
        goods: {
          name: data.name || '',
          brief: data.brief || '',
          retailPrice: parseFloat(data.retailPrice) || 0,
          counterPrice: data.counterPrice || '',
          specialPrice: data.specialPrice || '',
          isSpecialPrice: !!(data.specialPrice && parseFloat(data.specialPrice) > 0),
          picUrl: data.picUrl || '',
          detail: data.detail || '',
          categoryId: data.categoryId || ''
        },
        gallery: gallery,
        attribute: (data.params || []).filter(function(p) { return p.key && p.key.trim() }).map(function(p) {
          return { attribute: p.key, value: p.value }
        }),
        checkedSpecPrice: data.specialPrice && parseFloat(data.specialPrice) > 0 ? data.specialPrice : data.retailPrice || '0',
        tmpPicUrl: data.picUrl || '',
        brand: null,
        issueList: [],
        relatedGoods: [],
        enableSize: true
      })
    } catch (e) {
      console.error('加载预览数据失败:', e)
      util.showErrorToast('预览数据加载失败')
      setTimeout(function() { wx.navigateBack() }, 1500)
    }
  },

  // 获取商品信息
  getGoodsInfo() {
    let that = this
    util.request(api.GoodsDetail, { id: this.data.id }).then(function(res) {
      if (res.errno === 710) {
        that.setData({ loading: false, isUnshelved: true })
        return
      }
      if (res.errno === 0 && res.data && res.data.info) {
        let info = res.data.info
        let fallback = info.picUrl || this.data.defaultImage
        let gallery = [fallback]
        if (Array.isArray(info.gallery) && info.gallery.length > 0) {
          gallery = info.gallery
        } else if (typeof info.gallery === 'string' && info.gallery) {
          try { gallery = JSON.parse(info.gallery) } catch (e) { /* gallery 非法 JSON，使用兜底图 */ }
          if (!Array.isArray(gallery) || gallery.length === 0) gallery = [fallback]
        }

        that.setData({
          loading: false,
          goods: info,
          gallery: gallery,
          attribute: res.data.attribute || [],
          specificationList: res.data.specificationList || [],
          productList: res.data.productList || [],
          brand: res.data.brand,
          issueList: res.data.issue || [],
          userHasCollect: res.data.userHasCollect || 0,
          collect: res.data.userHasCollect === 1,
          checkedSpecPrice: info.isSpecialPrice && info.specialPrice ? info.specialPrice : info.retailPrice,
          tmpPicUrl: info.picUrl,
          enableSize: res.data.enableSize !== false
        })

        // 获取推荐商品
        that.getGoodsRelated()

        // 商品浏览埋点
        tracker.trackGoodsView(info.id, info.name, info.retailPrice, info.categoryId)
      } else {
        util.showErrorToast('商品信息加载失败')
        setTimeout(() => wx.navigateBack(), 1500)
      }
    }).catch(function(err) {
      console.error('获取商品详情失败:', err)
      util.showErrorToast('网络错误')
    })
  },

  // 打开尺码选择器
  openSkuPicker() {
    this.setData({ showSkuPicker: true })
  },

  // 关闭尺码选择器
  closeSkuPicker(e) {
    let { size, quantity } = e.detail || {}
    this.setData({
      showSkuPicker: false,
      selectedSize: size || '',
      selectedQuantity: quantity || 1
    })
  },

  // 加入购物车
  skuAddToCart(e) {
    let that = this
    let { size, quantity } = e.detail

    // 保存选择状态
    this.setData({ selectedSize: size, selectedQuantity: quantity })

    util.request(api.CartAdd, {
      goodsId: this.data.goods.id,
      number: quantity,
      size: size
    }, 'POST').then(function(res) {
      if (res.errno === 0) {
        wx.showToast({ title: '添加成功' })
        that.setData({
          showSkuPicker: false,
          cartGoodsCount: res.data
        })
        tracker.trackAddCart(that.data.goods.id, that.data.goods.name, that.data.goods.retailPrice, quantity)
      } else {
        wx.showToast({ title: res.errmsg, icon: 'none' })
      }
    })
  },

  // 立即购买
  skuBuyNow(e) {
    let that = this
    let { size, quantity } = e.detail

    // 保存选择状态
    this.setData({ selectedSize: size, selectedQuantity: quantity })

    util.request(api.CartFastAdd, {
      goodsId: this.data.goods.id,
      number: quantity,
      size: size
    }, 'POST').then(function(res) {
      if (res.errno === 0) {
        wx.setStorageSync('cartId', res.data)
        that.setData({ showSkuPicker: false })
        wx.navigateTo({
          url: '/pages/confirm_order/confirm_order'
        })
      } else {
        wx.showToast({ title: res.errmsg, icon: 'none' })
      }
    })
  },

  // 获取推荐商品
  getGoodsRelated() {
    let that = this
    util.request(api.GoodsRelated, { id: this.data.id }).then(function(res) {
      if (res.errno === 0) {
        that.setData({
          relatedGoods: res.data.list || []
        })
      }
    })
  },

  onGoodsDetailImageError(e) {
    const { source, index } = e.currentTarget.dataset
    const defaultImage = this.data.defaultImage
    if (source === 'gallery') {
      if (this.data.gallery[index] !== defaultImage) {
        this.setData({
          [`gallery[${index}]`]: defaultImage
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

  onSwiperChange(e) {
    const current = e.detail.current || 0
    this.setData({
      currentSwiper: current + 1
    })
  },

  previewGalleryImage(e) {
    const index = e.currentTarget.dataset.index
    var COS_BASE = 'https://636c-clo-test-4g8ukdond34672de-1258700476.tcb.qcloud.la/'
    const urls = this.data.gallery.map(item => {
      if (!item) return ''
      if (item.indexOf('://') !== -1) return item
      return COS_BASE + item
    })
    wx.previewImage({
      current: urls[index],
      urls: urls
    })
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) {
      return
    }
    wx.navigateTo({
      url: `/pages/goods_detail/goods_detail?id=${id}`
    })
  },

  // 添加/取消收藏
  addCollectOrNot() {
    let that = this
    util.request(api.CollectAddOrDelete, {
      type: 0,
      valueId: this.data.id
    }, 'POST').then(function(res) {
      const isCollect = that.data.userHasCollect !== 1
      if (that.data.userHasCollect === 1) {
        that.setData({
          collect: false,
          userHasCollect: 0
        })
      } else {
        that.setData({
          collect: true,
          userHasCollect: 1
        })
      }
      // 收藏埋点
      tracker.trackCollect(that.data.goods.id, that.data.goods.name, isCollect)
    })
  },

  // 规格选择
  clickSkuValue(e) {
    let specName = e.currentTarget.dataset.name
    let specValueId = e.currentTarget.dataset.valueId
    let _specificationList = this.data.specificationList

    for (let i = 0; i < _specificationList.length; i++) {
      if (_specificationList[i].name === specName) {
        for (let j = 0; j < _specificationList[i].valueList.length; j++) {
          if (_specificationList[i].valueList[j].id === specValueId) {
            _specificationList[i].valueList[j].checked = !_specificationList[i].valueList[j].checked
          } else {
            _specificationList[i].valueList[j].checked = false
          }
        }
      }
    }

    this.setData({ specificationList: _specificationList })
    this.changeSpecInfo()
  },

  // 获取选中的规格信息
  getCheckedSpecValue() {
    let checkedValues = []
    let _specificationList = this.data.specificationList
    for (let i = 0; i < _specificationList.length; i++) {
      let _checkedObj = {
        name: _specificationList[i].name,
        valueId: 0,
        valueText: ''
      }
      for (let j = 0; j < _specificationList[i].valueList.length; j++) {
        if (_specificationList[i].valueList[j].checked) {
          _checkedObj.valueId = _specificationList[i].valueList[j].id
          _checkedObj.valueText = _specificationList[i].valueList[j].value
        }
      }
      checkedValues.push(_checkedObj)
    }
    return checkedValues
  },

  // 判断规格是否选择完整
  isCheckedAllSpec() {
    return !this.getCheckedSpecValue().some(function(v) {
      return v.valueId === 0
    })
  },

  getCheckedSpecKey() {
    let checkedValue = this.getCheckedSpecValue().map(function(v) {
      return v.valueText
    })
    return checkedValue
  },

  // 规格改变时重新计算价格
  changeSpecInfo() {
    let checkedNameValue = this.getCheckedSpecValue()

    // 设置选择的信息
    let checkedValue = checkedNameValue.filter(function(v) {
      return v.valueId !== 0
    }).map(function(v) {
      return v.valueText
    })

    if (checkedValue.length > 0) {
      this.setData({
        tmpSpecText: checkedValue.join('　')
      })
    } else {
      this.setData({
        tmpSpecText: '请选择规格数量'
      })
    }

    if (this.isCheckedAllSpec()) {
      let checkedProductArray = this.getCheckedProductItem(this.getCheckedSpecKey())
      if (!checkedProductArray || checkedProductArray.length === 0) {
        this.setData({
          checkedSpecText: '规格数量选择',
          checkedSpecPrice: this.data.goods.retailPrice,
          soldout: true
        })
        return
      }

      let checkedProduct = checkedProductArray[0]
      if (checkedProduct.number > 0) {
        this.setData({
          checkedSpecText: this.data.tmpSpecText + ' x ' + this.data.number,
          checkedSpecPrice: checkedProduct.price,
          tmpPicUrl: checkedProduct.url,
          soldout: false
        })
      } else {
        this.setData({
          checkedSpecText: this.data.tmpSpecText,
          checkedSpecPrice: checkedProduct.price,
          tmpPicUrl: checkedProduct.url,
          soldout: true
        })
      }
    } else {
      this.setData({
        checkedSpecText: '规格数量选择',
        checkedSpecPrice: this.data.goods.retailPrice,
        soldout: false
      })
    }
  },

  // 获取选中的产品
  getCheckedProductItem(key) {
    return this.data.productList.filter(function(v) {
      return v.specifications.toString() === key.toString()
    })
  },

  // 数量增减
  cutNumber() {
    if (this.data.number > 1) {
      this.setData({ number: this.data.number - 1 })
      this.changeSpecInfo()
    }
  },

  addNumber() {
    this.setData({ number: this.data.number + 1 })
    this.changeSpecInfo()
  },

  // 切换规格弹窗
  switchAttrPop() {
    if (!this.data.openAttr) {
      this.setData({ openAttr: true })
    }
  },

  closeAttr() {
    this.setData({ openAttr: false })
  },

  // 分享
  shareFriendOrCircle() {
    this.setData({ openShare: true })
  },

  closeShare() {
    this.setData({ openShare: false })
  },

  // 保存分享图（按需请求权限）
  saveShare() {
    let that = this
    wx.getSetting({
      success: function(res) {
        if (res.authSetting['scope.writePhotosAlbum'] === false) {
          // 用户曾经拒绝过，引导去设置页开启
          wx.showModal({
            title: '提示',
            content: '需要您授权保存图片到相册',
            confirmText: '去设置',
            confirmColor: '#FF8096',
            success: function(modalRes) {
              if (modalRes.confirm) {
                wx.openSetting()
              }
            }
          })
        } else {
          that.doSaveShare()
        }
      }
    })
  },

  // 实际保存图片到相册
  doSaveShare() {
    let that = this
    wx.downloadFile({
      url: that.data.shareImage,
      success: function(res) {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: function() {
            wx.showModal({
              title: '生成海报成功',
              content: '海报已成功保存到相册，可以分享到朋友圈了',
              showCancel: false,
              confirmText: '好的',
              confirmColor: '#FF8096'
            })
          },
          fail: function() {
            wx.showToast({ title: '保存失败', icon: 'none' })
          }
        })
      },
      fail: function() {
        wx.showToast({ title: '下载失败', icon: 'none' })
      }
    })
  },

  // 打开购物车页面
  openCartPage() {
    wx.switchTab({ url: '/pages/cart/cart' })
  },

  // 联系客服
  contactService() {
    wx.openCustomerServiceChat({
      extInfo: { url: '' },
      corpId: '',
      success: function(res) {
        console.log('客服窗口打开成功', res)
      },
      fail: function(err) {
        console.error('客服窗口打开失败', err)
        wx.showToast({ title: '请联系在线客服', icon: 'none' })
      }
    })
  },

  // 返回
  goBack() {
    wx.navigateBack()
  },

  // 打开服务弹窗
  openServicePopup() {
    this.setData({ showServicePopup: true })
  },

  // 关闭服务弹窗
  closeServicePopup() {
    this.setData({ showServicePopup: false })
  },

  // 加载收货地址（优先用户手动选择的，其次默认地址）
  loadCheckedAddress() {
    let that = this
    let addressId = wx.getStorageSync('addressId')

    util.request(api.AddressList).then(function(res) {
      if (res.errno === 0 && res.data.list && res.data.list.length > 0) {
        let list = res.data.list
        let matched = addressId
          ? list.find(function(addr) { return addr.id === addressId })
          : null
        if (!matched) {
          matched = list.find(function(addr) { return addr.isDefault })
        }
        if (matched) {
          that.setData({ checkedAddress: matched })
        }
      }
    })
  },

  // 选择收货地址
  selectAddress() {
    wx.navigateTo({
      url: '/pages/ucenter/address/address?selectMode=1'
    })
  }
})
