var util = require('../../../utils/util.js');
var api = require('../../../config/api.js');

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    keyword: '',
    goodsList: [],
    selectedIds: [],
    selectedGoods: [],
    maxSelect: 0,
    loading: false,
    page: 1,
    limit: 20,
    hasMore: true,
    scrollHeight: 0
  },

  onLoad: function(options) {
    var system = wx.getDeviceInfo().system || '';
    var statusBarHeight = wx.getWindowInfo().statusBarHeight;
    var isIOS = system.indexOf('iOS') > -1;
    var selectedIds = [];
    if (options.selectedIds) {
      selectedIds = options.selectedIds.split(',').map(function(id) {
        return parseInt(id);
      }).filter(function(id) {
        return !isNaN(id);
      });
    }

    var maxSelect = parseInt(options.maxSelect) || 0;

    this.setData({
      statusBarHeight: statusBarHeight,
      navBarHeight: isIOS ? 44 : 48,
      selectedIds: selectedIds,
      maxSelect: maxSelect
    });

    this.loadGoods();
    this.eventChannel = this.getOpenerEventChannel();
  },

  onReady: function() {
    this._calculateLayout();
  },

  loadGoods: function() {
    var that = this;
    that.setData({ loading: true });
    var data = {
      page: that.data.page,
      limit: that.data.limit
    };
    if (that.data.keyword) {
      data.keyword = that.data.keyword;
    }
    util.request(api.ManagerGoodsList, data, 'GET').then(function(res) {
      var list = (res.data && res.data.list) || [];
      var newGoodsList = that.data.page === 1 ? list : that.data.goodsList.concat(list);
      that.setData({
        goodsList: newGoodsList,
        loading: false,
        hasMore: list.length >= that.data.limit,
        selectedMap: that._buildSelectedMap(null),
        selectedGoods: that._buildSelectedGoods(null, newGoodsList),
        confirmText: that._buildConfirmText(that.data.selectedIds.length)
      }, function() {
        that._calculateLayout();
      });
    });
  },

    onToggleGoods: function(e) {
    var id = e.currentTarget.dataset.id;
    var selectedIds = this.data.selectedIds.slice();
    var idx = selectedIds.indexOf(id);
    if (idx > -1) {
      selectedIds.splice(idx, 1);
    } else {
      var max = this.data.maxSelect;
      if (max > 0 && selectedIds.length >= max) {
        wx.showToast({ title: '最多选择' + max + '件商品', icon: 'none', duration: 1500 });
        return;
      }
      selectedIds.push(id);
    }
    this.setData({
      selectedIds: selectedIds,
      selectedMap: this._buildSelectedMap(selectedIds),
      selectedGoods: this._buildSelectedGoods(selectedIds),
      confirmText: this._buildConfirmText(selectedIds.length)
    });
    },

    onPanelRemove: function(e) {
    var id = e.detail.id;
    var selectedIds = this.data.selectedIds.slice();
    var idx = selectedIds.indexOf(id);
    if (idx > -1) {
      selectedIds.splice(idx, 1);
    }
    this.setData({
      selectedIds: selectedIds,
      selectedMap: this._buildSelectedMap(selectedIds),
      selectedGoods: this._buildSelectedGoods(selectedIds),
      confirmText: this._buildConfirmText(selectedIds.length)
    });
    },

    _buildSelectedGoods: function(ids, list) {
    var selectedIds = ids || this.data.selectedIds;
    var goodsList = list || this.data.goodsList;
    return goodsList.filter(function(g) {
      return selectedIds.indexOf(g.id) > -1;
    }).map(function(g) {
      return { id: g.id, name: g.name, picUrl: g.picUrl, retailPrice: g.retailPrice };
    });
    },

    _buildSelectedMap: function(ids) {
    var map = {};
    (ids || this.data.selectedIds).forEach(function(id) {
      map[id] = true;
    });
    return map;
    },

    onConfirm: function() {
    var that = this;
    var selectedIds = this.data.selectedIds;

    if (selectedIds.length === 0) {
      this.eventChannel.emit('confirmGoods', { goodsList: [] });
      wx.navigateBack();
      return;
    }

    var goodsList = this.data.goodsList.filter(function(g) {
      return selectedIds.indexOf(g.id) > -1;
    }).map(function(g) {
      return {
        id: g.id,
        name: g.name,
        picUrl: g.picUrl,
        retailPrice: g.retailPrice
      };
      });
    goodsList.sort(function(a, b) {
      return selectedIds.indexOf(a.id) - selectedIds.indexOf(b.id);
    });
    this.eventChannel.emit('confirmGoods', { goodsList: goodsList });
    wx.navigateBack();
  },

    onSearchInput: function(e) {
    this.setData({ keyword: e.detail.value });
  },

    onSearch: function() {
    this.setData({ page: 1, hasMore: true });
    this.loadGoods();
  },

    onClearSearch: function() {
    this.setData({ keyword: '', page: 1, hasMore: true });
    this.loadGoods();
  },

    onScrollBottom: function() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadGoods();
    }
  },

  onBack: function() {
    wx.navigateBack();
  },

  _buildConfirmText: function(count) {
    var max = this.data.maxSelect;
    if (count > 0) {
      return max > 0
        ? '确认选择（' + count + '/' + max + '）'
        : '确认选择（' + count + '）';
    }
    return max > 0
      ? '请选择商品（最多' + max + '件）'
      : '请选择商品';
  },

  _calculateLayout: function() {
    var that = this;
    wx.createSelectorQuery()
      .select('.custom-nav').boundingClientRect()
      .select('.search-bar').boundingClientRect()
      .select('.confirm-bar').boundingClientRect()
      .exec(function(res) {
        var navH = (res[0] && res[0].height) || 0;
        var searchH = (res[1] && res[1].height) || 0;
        var confirmH = (res[2] && res[2].height) || 0;
        var winH = wx.getWindowInfo().windowHeight;
        that.setData({
          scrollHeight: winH - navH - searchH - confirmH
        });
      });
  }
  });

