const util = require('../../../utils/util.js');
const api = require('../../../config/api.js');

// 防抖函数
function debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    activeSubTab: 'upload',  // 'upload' | 'list'
    listTab: 'on_sale',
    // 表单数据（传给组件）
    formData: {},
    formFeatures: {},
    // 预设场景标签（从数据库加载）
    presetScenes: [],
    // 商品列表
    goodsList: [],
    page: 1,
    limit: 20,
    total: 0,
    tabCounts: {
      onSaleCount: 0,
      pendingCount: 0,
      draftCount: 0
    },
    loading: false,
    hasDraft: false,
    showDraftTip: false,
    searchKeyword: '',
    batchMode: false,
    selectedIds: [],
    selectedMap: {},
    // 分类数据
    categoryList: [],
    // 草稿保存时间
    draftSavedAt: '',
    defaultImage: '/static/images/fallback-image.svg'
  },

  onLoad() {
    const { system } = wx.getDeviceInfo();
    const { statusBarHeight } = wx.getWindowInfo();
    const isIOS = system.indexOf('iOS') > -1;
    this.setData({
      statusBarHeight,
      navBarHeight: isIOS ? 44 : 48
    });
    this.loadScenes();
    this.loadDraft();
    this.getCategoryList();
    this.getGoodsList();
  },

  onShow() {
    const tabBar = this.selectComponent('#managerTabBar');
    if (tabBar) {
      tabBar.setData({ active: 1 });
    }
    // 从编辑页返回时刷新列表
    if (this.data.activeSubTab === 'list') {
      this.refreshGoodsList();
    }
  },

  // ========== 子 Tab 切换 ==========

  onSubTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.activeSubTab) return;
    this.setData({ activeSubTab: tab });
    if (tab === 'list') {
      this.refreshGoodsList();
    }
  },

  // ========== 场景标签预加载 ==========

  loadScenes() {
    let that = this;
    util.request(api.SceneList).then(function(res) {
      if (res.errno === 0 && res.data) {
        that.setData({ presetScenes: (res.data || []).map(function(item) { return item.name || item }) });
      }
    });
  },

  // ========== 分类相关 ==========

  getCategoryList() {
    let that = this;
    util.request(api.ManagerGoodsCategory).then(function(res) {
      if (res.errno === 0) {
        that.setData({
          categoryList: res.data.list || res.data || []
        });
      }
    });
  },

  // ========== 草稿操作 ==========

  autoSaveDraft() {
    var now = new Date();
    var timeStr = now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
    const draft = {
      formData: this.data.formData,
      savedAt: now.toISOString()
    };
    wx.setStorageSync('managerShelfDraft', draft);
    this.setData({ hasDraft: true, draftSavedAt: timeStr });
  },

  loadDraft() {
    try {
      const draft = wx.getStorageSync('managerShelfDraft');
      if (draft && draft.formData) {
        var savedAt = '';
        if (draft.savedAt) {
          var d = new Date(draft.savedAt);
          savedAt = d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
        }
        this.setData({
          formData: draft.formData,
          hasDraft: true,
          showDraftTip: true,
          draftSavedAt: savedAt
        });
      }
    } catch (e) {
      console.error('加载草稿失败', e);
    }
  },

  clearDraft() {
    wx.removeStorageSync('managerShelfDraft');
    this.setData({
      formData: {},
      hasDraft: false,
      showDraftTip: false,
      draftSavedAt: ''
    });
  },

  onClearDraft() {
    let that = this;
    wx.showModal({
      title: '确认清除',
      content: '确认清除草稿内容？清除后不可恢复。',
      success(res) {
        if (res.confirm) {
          that.clearDraft();
        }
      }
    });
  },

  onContinueDraft() {
    this.setData({ activeSubTab: 'upload' });
  },

  // ========== 组件事件处理 ==========

  onGoodsFormChange(e) {
    this.setData({ formData: e.detail.formData });
    this.autoSaveDraft();
  },

  onGoodsFormSave(e) {
    let that = this;
    const data = e.detail.formData;

    util.request(api.ManagerGoodsCreate, data, 'POST').then(function(res) {
      if (res.errno === 0) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        that.clearDraft();
      } else {
        wx.showToast({ title: res.errmsg || '保存失败', icon: 'none' });
      }
    });
  },

  onGoodsFormPublish(e) {
    let that = this;
    const data = e.detail.formData;

    util.request(api.ManagerGoodsCreate, data, 'POST').then(function(res) {
      if (res.errno === 0) {
        const goodsId = res.data;
        util.request(api.ManagerGoodsPublish, { id: goodsId }, 'POST').then(function(res2) {
          if (res2.errno === 0) {
            wx.showToast({ title: '上架成功', icon: 'success' });
            that.clearDraft();
            that.setData({ activeSubTab: 'list', listTab: 'on_sale' });
            that.refreshGoodsList();
          } else {
            wx.showToast({ title: '保存成功但上架失败', icon: 'none' });
          }
        });
      } else {
        wx.showToast({ title: res.errmsg || '上架失败', icon: 'none' });
      }
    });
  },

  onGoodsFormPreview(e) {
    // 预览数据已由组件保存到 storage，直接跳转
    wx.navigateTo({
      url: '/pages/goods_detail/goods_detail?preview=1&from=draft'
    });
  },

  // 列表卡片点击跳转预览
  onPreviewGoods(e) {
    var id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({
      url: '/pages/goods_detail/goods_detail?id=' + id + '&preview=1'
    });
  },

  // ========== 商品列表 ==========

  onListTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.listTab) return;
    this.setData({ listTab: tab, page: 1, goodsList: [] });
    this.getGoodsList();
  },

  onSearchInput: debounce(function(e) {
    this.setData({ searchKeyword: e.detail.value, page: 1, goodsList: [] });
    this.getGoodsList();
  }, 300),

  refreshGoodsList() {
    this.setData({ page: 1, goodsList: [] });
    this.getGoodsList();
  },

  getGoodsList() {
    if (this.data.loading) return;
    let that = this;
    this.setData({ loading: true });

    var params = {
      status: this.data.listTab,
      page: this.data.page,
      limit: this.data.limit
    };
    var keyword = (this.data.searchKeyword || '').trim();
    if (keyword) {
      params.keyword = keyword;
    }
    util.request(api.ManagerGoodsList, params).then(function(res) {
      if (res.errno === 0) {
        const data = res.data;
        that.setData({
          goodsList: that.data.page === 1 ? (data.list || []) : that.data.goodsList.concat(data.list || []),
          total: data.total || 0,
          tabCounts: {
            onSaleCount: data.onSaleCount || 0,
            pendingCount: data.pendingCount || 0,
            draftCount: data.draftCount || 0
          },
          loading: false
        });
      } else {
        that.setData({ loading: false });
      }
    }).catch(function() {
      that.setData({ loading: false });
    });
  },

  onPullDownRefresh() {
    if (this.data.activeSubTab === 'list') {
      this.refreshGoodsList();
    }
    wx.stopPullDownRefresh();
  },

  onReachBottom() {
    if (this.data.activeSubTab === 'list' && this.data.goodsList.length < this.data.total) {
      this.setData({ page: this.data.page + 1 });
      this.getGoodsList();
    }
  },

  onEditGoods(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/manager/goodsEdit/goodsEdit?id=' + id
    });
  },

  onUnpublishGoods(e) {
    const id = e.currentTarget.dataset.id;
    let that = this;
    wx.showModal({
      title: '确认下架',
      content: '确认下架该商品？',
      success(res) {
        if (res.confirm) {
          util.request(api.ManagerGoodsUnpublish, { ids: [id] }, 'POST').then(function(res) {
            if (res.errno === 0) {
              wx.showToast({ title: '已下架', icon: 'success' });
              that.refreshGoodsList();
            } else {
              wx.showToast({ title: res.errmsg || '操作失败', icon: 'none' });
            }
          });
        }
      }
    });
  },

  onPublishGoods(e) {
    const id = e.currentTarget.dataset.id;
    let that = this;
    util.request(api.ManagerGoodsPublish, { ids: [id] }, 'POST').then(function(res) {
      if (res.errno === 0) {
        wx.showToast({ title: '已上架', icon: 'success' });
        that.refreshGoodsList();
      } else {
        wx.showToast({ title: res.errmsg || '操作失败', icon: 'none' });
      }
    });
  },

  onDeleteGoods(e) {
    const id = e.currentTarget.dataset.id;
    let that = this;
    wx.showModal({
      title: '确认删除',
      content: '确认删除该草稿商品？删除后不可恢复。',
      success(res) {
        if (res.confirm) {
          util.request(api.ManagerGoodsBatchDelete, { ids: [id] }, 'POST').then(function(res) {
            if (res.errno === 0) {
              wx.showToast({ title: '已删除', icon: 'success' });
              that.refreshGoodsList();
            } else {
              wx.showToast({ title: res.errmsg || '删除失败', icon: 'none' });
            }
          });
        }
      }
    });
  },

  onUnpublishAll() {
    let that = this;
    wx.showModal({
      title: '确认一键下架',
      content: '确认下架全部在售商品？',
      success(res) {
        if (res.confirm) {
          util.request(api.ManagerGoodsUnpublishAll, {}, 'POST').then(function(res) {
            if (res.errno === 0) {
              wx.showToast({ title: '已全部下架', icon: 'success' });
              that.refreshGoodsList();
            } else {
              wx.showToast({ title: res.errmsg || '操作失败', icon: 'none' });
            }
          });
        }
      }
    });
  },

  _syncSelectedMap: function(selectedIds) {
    var map = {};
    selectedIds.forEach(function(id) {
      map[id] = true;
    });
    return map;
  },

  toggleBatchMode() {
    this.setData({
      batchMode: !this.data.batchMode,
      selectedIds: [],
      selectedMap: {}
    });
  },

  onSelectGoods(e) {
    var id = e.currentTarget.dataset.id;
    var selectedIds = this.data.selectedIds.slice();
    var index = -1;
    for (var i = 0; i < selectedIds.length; i++) {
      if (selectedIds[i] == id) { index = i; break; }
    }
    if (index > -1) {
      selectedIds.splice(index, 1);
    } else {
      selectedIds.push(id);
    }
    this.setData({
      selectedIds: selectedIds,
      selectedMap: this._syncSelectedMap(selectedIds)
    });
  },

  onSelectAll() {
    var allIds = this.data.goodsList.map(function(g) { return g.id; });
    var allSelected = allIds.length > 0 && allIds.every(function(id) {
      return this.data.selectedMap[id];
    }.bind(this));
    if (allSelected) {
      this.setData({ selectedIds: [], selectedMap: {} });
    } else {
      this.setData({
        selectedIds: allIds,
        selectedMap: this._syncSelectedMap(allIds)
      });
    }
  },

  onBatchDelete() {
    const ids = this.data.selectedIds;
    if (ids.length === 0) {
      wx.showToast({ title: '请先选择商品', icon: 'none' });
      return;
    }
    let that = this;
    wx.showModal({
      title: '确认删除',
      content: '确认删除选中的 ' + ids.length + ' 件商品？删除后不可恢复。',
      success(res) {
        if (res.confirm) {
          util.request(api.ManagerGoodsBatchDelete, { ids: ids }, 'POST').then(function(res) {
            if (res.errno === 0) {
              wx.showToast({ title: '删除成功', icon: 'success' });
              that.setData({ batchMode: false, selectedIds: [], selectedMap: {} });
              that.refreshGoodsList();
            } else {
              wx.showToast({ title: res.errmsg || '删除失败', icon: 'none' });
            }
          });
        }
      }
    });
  },

  onGoodsImageError: function(e) {
    var index = e.currentTarget.dataset.index;
    var list = this.data.goodsList || [];
    if (list[index] && list[index].picUrl !== this.data.defaultImage) {
      this.setData({
        ['goodsList[' + index + '].picUrl']: this.data.defaultImage
      });
    }
  }
});
