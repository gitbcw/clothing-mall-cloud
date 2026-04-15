var util = require('../../../utils/util.js');
var api = require('../../../config/api.js');

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    isEdit: false,
    sceneId: null,
    form: {
      name: '',
      posterUrl: '',
      description: '',
      sortOrder: 0,
      enabled: true
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
      this.setData({ isEdit: true, sceneId: parseInt(options.id) });
      this.loadScene(parseInt(options.id));
      this.loadSceneGoods(parseInt(options.id));
    } else if (options.count !== undefined) {
      var defaultSort = parseInt(options.count) + 1;
      this.setData({ 'form.sortOrder': defaultSort });
    }
  },

  loadScene: function(id) {
    var that = this;
    util.request(api.ManagerSceneRead, { id: id }, 'GET').then(function(res) {
      var scene = res.data;
      that.setData({
        form: {
          name: scene.name || '',
          posterUrl: scene.posterUrl || '',
          description: scene.description || '',
          sortOrder: scene.sortOrder || 0,
          enabled: scene.enabled !== false
        }
      });
    });
  },

  loadSceneGoods: function(sceneId) {
    var that = this;
    util.request(api.ManagerSceneGoods, { sceneId: sceneId }, 'GET').then(function(res) {
      that.setData({ goodsList: res.data || [] });
    }).catch(function(err) {
      console.error('loadSceneGoods failed:', err);
    });
  },

  onInputName: function(e) {
    this.setData({ 'form.name': e.detail.value });
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

  onToggleEnabled: function() {
    this.setData({ 'form.enabled': !this.data.form.enabled });
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

  onViewGoods: function(e) {
    var goodsId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/goods_detail/goods_detail?id=' + goodsId
    });
  },

  onChoosePoster: function() {
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
            'form.posterUrl': url,
            uploading: false
          });
        }).catch(function() {
          that.setData({ uploading: false });
        });
      }
    });
  },

  onRemovePoster: function() {
    this.setData({ 'form.posterUrl': '' });
  },

  onSave: function() {
    var that = this;
    var form = this.data.form;

    if (!form.name || !form.name.trim()) {
      wx.showToast({ title: '请输入场景名称', icon: 'none' });
      return;
    }

    that.setData({ saving: true });

    var requestData = {
      name: form.name.trim(),
      posterUrl: form.posterUrl || '',
      description: form.description || '',
      sortOrder: form.sortOrder || 0,
      enabled: form.enabled
    };

    var requestUrl;
    if (that.data.isEdit) {
      requestData.id = that.data.sceneId;
      requestUrl = api.ManagerSceneUpdate;
    } else {
      requestUrl = api.ManagerSceneCreate;
    }

    util.request(requestUrl, requestData, 'POST').then(function(res) {
      if (res.errno !== 0) {
        that.setData({ saving: false });
        wx.showToast({ title: res.errmsg || '操作失败', icon: 'none' });
        return;
      }

      // 获取 sceneId（新建时从返回值取）
      var sceneId = that.data.isEdit ? that.data.sceneId : res.data.id;
      var goodsIds = that.data.goodsList.map(function(g) { return g.id; });

      // 更新商品绑定
      util.request(api.ManagerSceneGoodsUpdate, {
        sceneId: sceneId,
        goodsIds: goodsIds
      }, 'POST').then(function() {
        that.setData({ saving: false });
        wx.showToast({ title: that.data.isEdit ? '保存成功' : '创建成功', icon: 'success' });
        setTimeout(function() {
          wx.navigateBack();
        }, 800);
      }).catch(function() {
        that.setData({ saving: false });
        wx.showToast({ title: '场景已保存，但商品绑定更新失败', icon: 'none' });
      });
    }).catch(function() {
      that.setData({ saving: false });
    });
  },

  onBack: function() {
    wx.navigateBack();
  }
});
