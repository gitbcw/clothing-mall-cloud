var util = require('../../../utils/util.js');
var api = require('../../../config/api.js');
var homeRefresh = require('../../../utils/home-refresh.js');

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    isEdit: false,
    holidayId: null,
    form: {
      name: '',
      startDate: '',
      endDate: '',
      sortOrder: 0,
      enabled: true
    },
    goodsList: [],
    saving: false,
    dateRange: []
  },

  onLoad: function(options) {
    var system = wx.getDeviceInfo().system || '';
    var statusBarHeight = wx.getWindowInfo().statusBarHeight;
    var isIOS = system.indexOf('iOS') > -1;
    this.setData({
      statusBarHeight: statusBarHeight,
      navBarHeight: isIOS ? 44 : 48
    });

    if (options.id) {
      this.setData({ isEdit: true, holidayId: parseInt(options.id) });
      this.loadHoliday(parseInt(options.id));
      this.loadHolidayGoods(parseInt(options.id));
    }
  },

  loadHoliday: function(id) {
    var that = this;
    util.request(api.ManagerHolidayRead, { id: id }, 'GET').then(function(res) {
      var h = res.data;
      that.setData({
        form: {
          name: h.name || '',
          startDate: h.start_date || '',
          endDate: h.end_date || '',
          sortOrder: h.sort_order || 0,
          enabled: h.enabled !== false && h.enabled !== 0
        },
        dateRange: [h.start_date || '', h.end_date || '']
      });
    });
  },

  loadHolidayGoods: function(holidayId) {
    var that = this;
    util.request(api.ManagerHolidayGoods, { holidayId: holidayId }, 'GET').then(function(res) {
      var goodsIds = res.data || [];
      if (goodsIds.length === 0) {
        that.setData({ goodsList: [] });
        return;
      }
      // 根据 ID 查商品详情
      util.request(api.ManagerGoodsList, {
        page: 1,
        limit: 100,
        status: 'on_sale'
      }, 'GET').then(function(goodsRes) {
        var allGoods = (goodsRes.data && goodsRes.data.list) || [];
        var selected = allGoods.filter(function(g) {
          return goodsIds.indexOf(g.id) !== -1;
        });
        that.setData({ goodsList: selected });
      });
    }).catch(function(err) {
      console.error('loadHolidayGoods failed:', err);
    });
  },

  onInputName: function(e) {
    this.setData({ 'form.name': e.detail.value });
  },

  onInputSort: function(e) {
    this.setData({ 'form.sortOrder': parseInt(e.detail.value) || 0 });
  },

  onSortMinus: function() {
    var val = this.data.form.sortOrder;
    if (val > 1) {
      this.setData({ 'form.sortOrder': val - 1 });
    }
  },

  onSortPlus: function() {
    this.setData({ 'form.sortOrder': this.data.form.sortOrder + 1 });
  },

  onToggleEnabled: function() {
    this.setData({ 'form.enabled': !this.data.form.enabled });
  },

  onStartDateChange: function(e) {
    this.setData({
      'form.startDate': e.detail.value,
      'dateRange[0]': e.detail.value
    });
  },

  onEndDateChange: function(e) {
    this.setData({
      'form.endDate': e.detail.value,
      'dateRange[1]': e.detail.value
    });
  },

  onAddGoods: function() {
    var that = this;
    var currentIds = this.data.goodsList.map(function(g) { return g.id; });
    wx.navigateTo({
      url: '/pages/manager/goodsPicker/goodsPicker?selectedIds=' + currentIds.join(','),
      events: {
        confirmGoods: function(data) {
          that.setData({ goodsList: data.goodsList || [] });
        }
      }
    });
  },

  onRemoveGoods: function(e) {
    var idx = e.currentTarget.dataset.index;
    var goodsList = this.data.goodsList;
    goodsList.splice(idx, 1);
    this.setData({ goodsList: goodsList });
  },

  onSave: function() {
    var that = this;
    var form = this.data.form;

    if (!form.name || !form.name.trim()) {
      wx.showToast({ title: '请输入活动名称', icon: 'none' });
      return;
    }
    if (!form.startDate || !form.endDate) {
      wx.showToast({ title: '请选择日期范围', icon: 'none' });
      return;
    }
    if (form.endDate < form.startDate) {
      wx.showToast({ title: '结束日期不能早于开始日期', icon: 'none' });
      return;
    }

    that.setData({ saving: true });

    var requestData = {
      name: form.name.trim(),
      start_date: form.startDate,
      end_date: form.endDate,
      sort_order: form.sortOrder || 0,
      enabled: form.enabled
    };

    var requestUrl;
    if (that.data.isEdit) {
      requestData.id = that.data.holidayId;
      requestUrl = api.ManagerHolidayUpdate;
    } else {
      requestUrl = api.ManagerHolidayCreate;
    }

    util.request(requestUrl, requestData, 'POST').then(function(res) {
      if (res.errno !== 0) {
        that.setData({ saving: false });
        wx.showToast({ title: res.errmsg || '操作失败', icon: 'none' });
        return;
      }

      var holidayId = that.data.isEdit ? that.data.holidayId : res.data.id;
      var goodsIds = that.data.goodsList.map(function(g) { return g.id; });

      // 更新商品绑定
      util.request(api.ManagerHolidayGoodsUpdate, {
        holidayId: holidayId,
        goodsIds: goodsIds
      }, 'POST').then(function() {
        that.setData({ saving: false });
        wx.showToast({ title: that.data.isEdit ? '保存成功' : '创建成功', icon: 'success' });
        homeRefresh.markHomeRefreshNeeded();
        setTimeout(function() {
          wx.navigateBack();
        }, 800);
      }).catch(function() {
        that.setData({ saving: false });
        wx.showToast({ title: '活动已保存，但商品绑定失败', icon: 'none' });
      });
    }).catch(function() {
      that.setData({ saving: false });
    });
  },

  onBack: function() {
    wx.navigateBack();
  }
});
