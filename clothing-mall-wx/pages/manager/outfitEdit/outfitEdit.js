var util = require('../../../utils/util.js');
var api = require('../../../config/api.js');

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    isEdit: false,
    outfitId: null,
    form: {
      title: '',
      description: '',
      coverPic: '',
      tags: '',
      brandColor: 'white',
      brandPosition: 'top-right',
      floatPosition: 'left',
      sortOrder: 0,
      status: 1
    },
    goodsList: [],
    uploading: false,
    saving: false
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
      this.setData({ isEdit: true, outfitId: parseInt(options.id) });
      this.loadOutfit(parseInt(options.id));
    } else if (options.count !== undefined) {
      var defaultSort = parseInt(options.count) + 1;
      this.setData({ 'form.sortOrder': defaultSort });
    }
  },

  loadOutfit: function(id) {
    var that = this;
    util.request(api.ManagerOutfitRead, { id: id }, 'GET').then(function(res) {
      var outfit = res.data;
      that.setData({
        form: {
          title: outfit.title || '',
          description: outfit.description || '',
          coverPic: outfit.coverPic || '',
          brandColor: outfit.brandColor || 'white',
          brandPosition: outfit.brandPosition || 'top-right',
          floatPosition: outfit.floatPosition || 'left',
          sortOrder: outfit.sortOrder || 0,
          status: outfit.status !== undefined ? outfit.status : 1
        },
        goodsList: outfit.goodsList || []
      });
    });
  },

  onInputTitle: function(e) {
    this.setData({ 'form.title': e.detail.value });
  },

  onInputDesc: function(e) {
    this.setData({ 'form.description': e.detail.value });
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
    var val = this.data.form.sortOrder;
    this.setData({ 'form.sortOrder': val + 1 });
  },

  onToggleStatus: function() {
    this.setData({ 'form.status': this.data.form.status === 1 ? 0 : 1 });
  },

  onSelectColor: function(e) {
    this.setData({ 'form.brandColor': e.currentTarget.dataset.color });
  },

  onSelectPosition: function(e) {
    this.setData({ 'form.brandPosition': e.currentTarget.dataset.position });
  },

  onSelectFloatPosition: function(e) {
    this.setData({ 'form.floatPosition': e.currentTarget.dataset.position });
  },

  onChooseCover: function() {
    var that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        var tempFilePath = res.tempFiles[0].tempFilePath;
        that.setData({ uploading: true });
        util.uploadFile(tempFilePath).then(function(url) {
          that.setData({
            'form.coverPic': url,
            uploading: false
          });
        }).catch(function() {
          that.setData({ uploading: false });
        });
      }
    });
  },

  onRemoveCover: function() {
    this.setData({ 'form.coverPic': '' });
  },

  onAddGoods: function() {
    var that = this;
    var currentIds = this.data.goodsList.map(function(g) { return g.id; });
    wx.navigateTo({
      url: '/pages/manager/goodsPicker/goodsPicker?selectedIds=' + currentIds.join(',') + '&maxSelect=4',
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

  onViewGoods: function(e) {
    var goodsId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/goods_detail/goods_detail?id=' + goodsId
    });
  },

  onSave: function() {
    var that = this;
    var form = this.data.form;

    if (!form.title || !form.title.trim()) {
      wx.showToast({ title: '请输入穿搭标题', icon: 'none' });
      return;
    }
    if (!form.coverPic) {
      wx.showToast({ title: '请上传穿搭图片', icon: 'none' });
      return;
    }

    that.setData({ saving: true });

    var goodsIds = that.data.goodsList.map(function(g) { return g.id; });

    var requestData = {
      title: form.title.trim(),
      description: form.description || '',
      coverPic: form.coverPic,
      goodsIds: goodsIds,
      brandColor: form.brandColor || 'white',
      brandPosition: form.brandPosition || 'top-right',
      floatPosition: form.floatPosition || 'left',
      sortOrder: form.sortOrder || 0,
      status: form.status
    };

    var requestUrl;
    if (that.data.isEdit) {
      requestData.id = that.data.outfitId;
      requestUrl = api.ManagerOutfitUpdate;
    } else {
      requestUrl = api.ManagerOutfitCreate;
    }

    util.request(requestUrl, requestData, 'POST').then(function(res) {
      that.setData({ saving: false });
      if (res.errno === 0) {
        wx.showToast({ title: that.data.isEdit ? '保存成功' : '创建成功', icon: 'success' });
        setTimeout(function() {
          wx.navigateBack();
        }, 800);
      } else {
        wx.showToast({ title: res.errmsg || '操作失败', icon: 'none' });
      }
    }).catch(function() {
      that.setData({ saving: false });
    });
  },

  onBack: function() {
    wx.navigateBack();
  }
});
