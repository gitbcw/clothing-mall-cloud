const util = require('../../../utils/util.js');
const api = require('../../../config/api.js');

Page({
  data: {
    // 模式
    isEdit: false,
    navTitle: '新建商品',
    statusBarHeight: 20,
    navBarHeight: 44,
    // 商品数据
    goodsId: null,
    loading: true,
    submitting: false,
    // 商品状态（编辑模式）
    goodsStatus: '',
    isOnSale: false,
    // 草稿（仅新建模式）
    hasDraft: false,
    // 传给组件的数据
    formData: {},
    formFeatures: { keywords: true },
    presetScenes: [],
    categoryList: []
  },

  onLoad(options) {
    const { system } = wx.getDeviceInfo();
    const { statusBarHeight } = wx.getWindowInfo();
    const isIOS = system.indexOf('iOS') > -1;
    this.setData({
      statusBarHeight,
      navBarHeight: isIOS ? 44 : 48
    });
    this.loadScenes();

    if (options.id) {
      this.setData({ isEdit: true, navTitle: '编辑商品', goodsId: parseInt(options.id) });
      this.getCategoryList();
      this.getGoodsDetail();
    } else {
      this.setData({ isEdit: false, navTitle: '新建商品' });
      this.getCategoryList();
      this.loadDraft();
      this.setData({ loading: false });
    }
  },

  // ========== 场景标签 ==========

  loadScenes() {
    let that = this;
    util.request(api.SceneList).then(function(res) {
      if (res.errno === 0 && res.data) {
        that.setData({ presetScenes: (res.data || []).map(function(item) { return item.name || item }) });
      }
    });
  },

  // ========== 分类 ==========

  getCategoryList() {
    let that = this;
    util.request(api.ManagerGoodsCategory).then(function(res) {
      if (res.errno === 0) {
        that.setData({ categoryList: res.data.list || res.data || [] });
      }
    });
  },

  getGoodsDetail() {
    let that = this;
    this.setData({ loading: true });

    util.request(api.ManagerGoodsDetail, { id: this.data.goodsId }).then(function(res) {
      if (res.errno === 0) {
        var data = res.data;
        var goods = data.goods || {};

        // 解析 sceneTags
        var scenes = [];
        if (goods.sceneTags) {
          try { scenes = JSON.parse(goods.sceneTags); } catch (e) {}
        }

        // 解析 goodsParams
        var params = [];
        if (goods.goodsParams) {
          try { params = JSON.parse(goods.goodsParams); } catch (e) {}
        }

        // 查找分类名称
        var categoryName = '';
        if (goods.categoryId && that.data.categoryList.length > 0) {
          var cat = that.data.categoryList.find(function(c) { return c.id === goods.categoryId; });
          if (cat) categoryName = cat.name;
        }

        // 组装 gallery
        var gallery = goods.gallery ? Array.from(goods.gallery) : [];

        that.setData({
          formData: {
            picUrl: goods.picUrl || '',
            gallery: gallery,
            name: goods.name || '',
            brief: goods.brief || '',
            detail: goods.detail || '',
            retailPrice: goods.retailPrice ? goods.retailPrice.toString() : '',
            specialPrice: goods.specialPrice ? goods.specialPrice.toString() : '',
            categoryId: goods.categoryId || '',
            categoryName: categoryName,
            keywords: goods.keywords || '',
            scenes: scenes,
            params: params
          },
          goodsStatus: goods.status || '',
          isOnSale: !!goods.isOnSale,
          loading: false
        });
      } else {
        that.setData({ loading: false });
        wx.showToast({ title: '商品不存在', icon: 'none' });
      }
    }).catch(function() {
      that.setData({ loading: false });
    });
  },

  // ========== 草稿 ==========

  autoSaveDraft() {
    if (this.data.isEdit) return;
    var draft = {
      formData: this.data.formData,
      savedAt: new Date().toISOString()
    };
    wx.setStorageSync('managerGoodsEditDraft', draft);
    this.setData({ hasDraft: true });
  },

  loadDraft() {
    try {
      var draft = wx.getStorageSync('managerGoodsEditDraft');
      if (draft && draft.formData) {
        this.setData({
          formData: draft.formData,
          hasDraft: true
        });
      }
    } catch (e) {
      console.error('加载草稿失败', e);
    }
  },

  clearDraft() {
    wx.removeStorageSync('managerGoodsEditDraft');
    this.setData({ hasDraft: false });
  },

  // ========== 组件事件处理 ==========

  onGoodsFormChange(e) {
    this.setData({ formData: e.detail.formData });
    this.autoSaveDraft();
  },

  onGoodsFormSave(e) {
    if (this.data.submitting) return;
    var that = this;
    var data = e.detail.formData;
    this.setData({ submitting: true });

    var saveApi = this.data.goodsId ? api.ManagerGoodsEdit : api.ManagerGoodsCreate;
    if (this.data.goodsId) {
      data.id = this.data.goodsId;
    }
    util.request(saveApi, data, 'POST').then(function(res) {
      if (res.errno === 0) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        if (!that.data.isEdit) {
          that.clearDraft();
        }
        setTimeout(function() { wx.navigateBack(); }, 1000);
      } else {
        that.setData({ submitting: false });
        wx.showToast({ title: res.errmsg || '保存失败', icon: 'none' });
      }
    }).catch(function() {
      that.setData({ submitting: false });
    });
  },

  onGoodsFormPublish(e) {
    if (this.data.submitting) return;
    var that = this;
    var data = e.detail.formData;
    this.setData({ submitting: true });

    var saveApi = this.data.goodsId ? api.ManagerGoodsEdit : api.ManagerGoodsCreate;
    if (this.data.goodsId) {
      data.id = this.data.goodsId;
    }
    util.request(saveApi, data, 'POST').then(function(res) {
      if (res.errno === 0) {
        var goodsId = that.data.goodsId || res.data;
        util.request(api.ManagerGoodsPublish, { id: goodsId }, 'POST').then(function(res2) {
          if (res2.errno === 0) {
            wx.showToast({ title: '上架成功', icon: 'success' });
            if (!that.data.isEdit) {
              that.clearDraft();
            }
            setTimeout(function() { wx.navigateBack(); }, 1000);
          } else {
            that.setData({ submitting: false });
            wx.showToast({ title: '保存成功但上架失败', icon: 'none' });
          }
        });
      } else {
        that.setData({ submitting: false });
        wx.showToast({ title: res.errmsg || '保存失败', icon: 'none' });
      }
    }).catch(function() {
      that.setData({ submitting: false });
    });
  },

  onGoodsFormUnpublish() {
    if (!this.data.goodsId) return;
    var that = this;
    util.request(api.ManagerGoodsUnpublish, { id: this.data.goodsId }, 'POST').then(function(res) {
      if (res.errno === 0) {
        wx.showToast({ title: '已下架', icon: 'success' });
        that.getGoodsDetail();
      } else {
        wx.showToast({ title: res.errmsg || '下架失败', icon: 'none' });
      }
    });
  },

  onGoodsFormPreview() {
    wx.navigateTo({
      url: '/pages/goods_detail/goods_detail?preview=1&from=draft'
    });
  },

  // ========== 导航 ==========

  onGoBack() {
    wx.navigateBack();
  }
});
