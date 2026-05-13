var util = require('../../../utils/util.js');
var api = require('../../../config/api.js');
var homeRefresh = require('../../../utils/home-refresh.js');

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    goodsList: [],
    loading: true,
    page: 1,
    limit: 20,
    total: 0,
    hasMore: true,
    // 批量操作
    batchMode: false,
    selectedIds: [],
    // 添加特价弹窗
    showAddPopup: false,
    searchKeyword: '',
    searchResults: [],
    searchPage: 1,
    searchLoading: false,
    searchHasMore: true,
    addSelectedIds: [],
    addSpecialPrice: '',
    // 取消特价弹窗
    showCancelPopup: false
  },

  onLoad: function() {
    var system = wx.getDeviceInfo().system || '';
    var statusBarHeight = wx.getWindowInfo().statusBarHeight;
    var isIOS = system.indexOf('iOS') > -1;
    this.setData({
      statusBarHeight: statusBarHeight,
      navBarHeight: isIOS ? 44 : 48
    });
    this.loadGoods();
  },

  loadGoods: function() {
    var that = this;
    that.setData({ loading: true, page: 1 });
    util.request(api.ManagerGoodsList, {
      page: 1,
      limit: that.data.limit,
      isSpecialPrice: true,
      status: 'on_sale'
    }, 'GET').then(function(res) {
      var data = res.data || {};
      var list = (data.list || []).map(function(item) {
        item._selected = that.data.selectedIds.indexOf(item.id) > -1;
        return item;
      });
      that.setData({
        goodsList: list,
        total: data.total || 0,
        page: 1,
        hasMore: (data.list || []).length >= that.data.limit,
        loading: false
      });
    }).catch(function() {
      that.setData({ loading: false });
    });
  },

  onReachBottom: function() {
    if (!this.data.hasMore || this.data.loading) return;
    var that = this;
    var nextPage = that.data.page + 1;
    that.setData({ loading: true });
    util.request(api.ManagerGoodsList, {
      page: nextPage,
      limit: that.data.limit,
      isSpecialPrice: true,
      status: 'on_sale'
    }, 'GET').then(function(res) {
      var data = res.data || {};
      var newList = (data.list || []).map(function(item) {
        item._selected = that.data.selectedIds.indexOf(item.id) > -1;
        return item;
      });
      that.setData({
        goodsList: that.data.goodsList.concat(newList),
        page: nextPage,
        hasMore: newList.length >= that.data.limit,
        loading: false
      });
    }).catch(function() {
      that.setData({ loading: false });
    });
  },

  onPullDownRefresh: function() {
    this.loadGoods();
    wx.stopPullDownRefresh();
  },

  // ---- 批量模式 ----

  onToggleBatch: function() {
    this.setData({
      batchMode: !this.data.batchMode,
      selectedIds: []
    });
  },

  onToggleSelect: function(e) {
    var id = e.currentTarget.dataset.id;
    var ids = this.data.selectedIds.slice();
    var idx = ids.indexOf(id);
    if (idx > -1) {
      ids.splice(idx, 1);
    } else {
      ids.push(id);
    }
    var goodsList = this.data.goodsList.map(function(item) {
      item._selected = ids.indexOf(item.id) > -1;
      return item;
    });
    this.setData({ selectedIds: ids, goodsList: goodsList });
  },

  // ---- 编辑特价 ----

  onEditPrice: function(e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    var currentPrice = e.currentTarget.dataset.price;
    wx.showModal({
      title: '设置特价',
      editable: true,
      placeholderText: '请输入特价金额',
      content: currentPrice ? String(currentPrice) : '',
      success: function(res) {
        if (res.confirm && res.content) {
          var price = parseFloat(res.content);
          if (isNaN(price) || price <= 0) {
            wx.showToast({ title: '请输入有效金额', icon: 'none' });
            return;
          }
          util.request(api.ManagerGoodsSetSpecialPrice, {
            ids: [id],
            specialPrice: price
          }, 'POST').then(function() {
            wx.showToast({ title: '已更新', icon: 'success' });
            homeRefresh.markHomeRefreshNeeded();
            that.loadGoods();
          });
        }
      }
    });
  },

  // ---- 添加特价弹窗 ----

  onShowAddPopup: function() {
    this.setData({
      showAddPopup: true,
      searchKeyword: '',
      searchResults: [],
      searchPage: 1,
      addSelectedIds: [],
      addSpecialPrice: ''
    });
    this.searchGoods();
  },

  onHideAddPopup: function() {
    this.setData({ showAddPopup: false });
  },

  onSearchInput: function(e) {
    this.setData({ searchKeyword: e.detail.value, searchPage: 1, searchResults: [] });
    this.searchGoods();
  },

  searchGoods: function() {
    var that = this;
    var selectedIds = that.data.addSelectedIds;
    that.setData({ searchLoading: true });
    util.request(api.ManagerGoodsList, {
      page: that.data.searchPage,
      limit: 20,
      isSpecialPrice: false,
      status: 'on_sale',
      keyword: that.data.searchKeyword
    }, 'GET').then(function(res) {
      var data = res.data || {};
      var list = (data.list || []).map(function(item) {
        item._selected = selectedIds.indexOf(item.id) > -1;
        return item;
      });
      that.setData({
        searchResults: that.data.searchPage === 1 ? list : that.data.searchResults.concat(list),
        searchHasMore: list.length >= 20,
        searchLoading: false
      });
    }).catch(function() {
      that.setData({ searchLoading: false });
    });
  },

  onSearchMore: function() {
    if (!this.data.searchHasMore || this.data.searchLoading) return;
    this.setData({ searchPage: this.data.searchPage + 1 });
    this.searchGoods();
  },

  onToggleAddSelect: function(e) {
    var id = e.currentTarget.dataset.id;
    var ids = this.data.addSelectedIds.slice();
    var idx = ids.indexOf(id);
    if (idx > -1) {
      ids.splice(idx, 1);
    } else {
      ids.push(id);
    }
    var searchResults = this.data.searchResults.map(function(item) {
      item._selected = ids.indexOf(item.id) > -1;
      return item;
    });
    this.setData({ addSelectedIds: ids, searchResults: searchResults });
  },

  onAddPriceInput: function(e) {
    this.setData({ addSpecialPrice: e.detail.value });
  },

  onConfirmAdd: function() {
    var that = this;
    var ids = that.data.addSelectedIds;
    if (ids.length === 0) {
      wx.showToast({ title: '请选择商品', icon: 'none' });
      return;
    }

    var price = that.data.addSpecialPrice ? parseFloat(that.data.addSpecialPrice) : null;
    util.request(api.ManagerGoodsSetSpecialPrice, {
      ids: ids,
      specialPrice: price
    }, 'POST').then(function() {
      wx.showToast({ title: '设置成功', icon: 'success' });
      homeRefresh.markHomeRefreshNeeded();
      that.setData({ showAddPopup: false });
      that.loadGoods();
    });
  },

  // ---- 取消特价 ----

  onShowCancelPopup: function() {
    if (this.data.selectedIds.length === 0) {
      wx.showToast({ title: '请先选择商品', icon: 'none' });
      return;
    }
    this.setData({ showCancelPopup: true });
  },

  onConfirmCancel: function() {
    var that = this;
    util.request(api.ManagerGoodsCancelSpecialPrice, {
      ids: that.data.selectedIds
    }, 'POST').then(function() {
      wx.showToast({ title: '已取消特价', icon: 'success' });
      homeRefresh.markHomeRefreshNeeded();
      that.setData({
        showCancelPopup: false,
        batchMode: false,
        selectedIds: []
      });
      that.loadGoods();
    });
  },

  onHideCancelPopup: function() {
    this.setData({ showCancelPopup: false });
  },

  onBack: function() {
    wx.navigateBack();
  }
});
