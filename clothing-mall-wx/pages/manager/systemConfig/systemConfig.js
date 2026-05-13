var util = require('../../../utils/util.js');
var api = require('../../../config/api.js');
var homeRefresh = require('../../../utils/home-refresh.js');

var BUILT_IN_BGS = [
  { id: 'none', name: '无', value: '' },
  { id: 'pink', name: '樱花粉', value: 'linear-gradient(135deg, #fff1eb 0%, #ffdde1 100%)' },
  { id: 'lavender', name: '薰衣草', value: 'linear-gradient(135deg, #e8c8f5 0%, #f5e6ff 100%)' },
  { id: 'peach', name: '蜜桃橘', value: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
  { id: 'sky', name: '天空蓝', value: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)' },
  { id: 'mint', name: '薄荷绿', value: 'linear-gradient(135deg, #c1dfc4 0%, #deecdd 100%)' },
  { id: 'cream', name: '奶茶色', value: 'linear-gradient(135deg, #f5e6d3 0%, #e8d5b7 100%)' },
  { id: 'rose', name: '玫瑰金', value: 'linear-gradient(135deg, #f5e0dc 0%, #f0cac4 100%)' },
];

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    uploading: false,
    saving: false,
    isCustomImage: false,
    builtInBgs: BUILT_IN_BGS,
    form: {
      activityBgImage: ''
    },
    birthdayEnabled: false,
    birthdayCouponId: '',
    birthdayDays: 30,
    birthdayCouponList: [],
    birthdayCouponPickerIndex: -1,
    birthdayCouponName: ''
  },

  onLoad: function() {
    var system = wx.getDeviceInfo().system || '';
    var statusBarHeight = wx.getWindowInfo().statusBarHeight;
    var isIOS = system.indexOf('iOS') > -1;
    this.setData({
      statusBarHeight: statusBarHeight,
      navBarHeight: isIOS ? 44 : 48
    });
    this.loadConfig();
  },

  _updateCustomState: function(value) {
    var isCustom = !!value && value.indexOf('linear-gradient') !== 0;
    this.setData({ isCustomImage: isCustom });
  },

  _updateBirthdayPickerState: function() {
    var list = this.data.birthdayCouponList;
    var id = this.data.birthdayCouponId;
    var index = -1;
    var name = '';
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === String(id)) {
        index = i;
        name = list[i].name;
        break;
      }
    }
    this.setData({
      birthdayCouponPickerIndex: index,
      birthdayCouponName: name
    });
  },

  loadConfig: function() {
    var that = this;
    util.request(api.ManagerSystemConfigList, { group: 'home' }).then(function(res) {
      if (res.errno === 0) {
        var configs = res.data.configs || {};
        var value = configs.litemall_home_activity_bg_image || '';
        that.setData({ 'form.activityBgImage': value });
        that._updateCustomState(value);
      }
    });

    // 加载生日券配置
    util.request(api.ManagerSystemConfigList, { group: 'promotion' }).then(function(res) {
      if (res.errno === 0) {
        var configs = res.data.configs || {};
        that.setData({
          birthdayEnabled: configs.litemall_birthday_coupon_coupon_status === '1',
          birthdayCouponId: configs.litemall_birthday_coupon_id || '',
          birthdayDays: parseInt(configs.litemall_birthday_coupon_days) || 30
        });
        that._updateBirthdayPickerState();
      }
    });

    // 加载 type=4 优惠券列表供选择
    util.request(api.ManagerCouponList, { type: 4, limit: 50 }).then(function(res) {
      if (res.errno === 0) {
        that.setData({
          birthdayCouponList: (res.data && res.data.list) || []
        });
        that._updateBirthdayPickerState();
      }
    });
  },

  onSelectBuiltIn: function(e) {
    var value = e.currentTarget.dataset.value;
    this.setData({ 'form.activityBgImage': value });
    this._updateCustomState(value);
  },

  onChooseBgImage: function() {
    var that = this;
    util.ensurePrivacyAuthorized({
      message: '上传活动背景图前，请先阅读并同意小程序用户隐私保护指引。'
    }).then(function() {
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
              'form.activityBgImage': url,
              uploading: false
            });
            that._updateCustomState(url);
          }).catch(function() {
            that.setData({ uploading: false });
            wx.showToast({ title: '上传失败', icon: 'none' });
          });
        }
      });
    }).catch(function() {});
  },

  onRemoveBgImage: function() {
    this.setData({ 'form.activityBgImage': '' });
    this._updateCustomState('');
  },

  onToggleBirthday: function() {
    this.setData({ birthdayEnabled: !this.data.birthdayEnabled });
  },

  onBirthdayCouponChange: function(e) {
    var idx = e.detail.value;
    var coupon = this.data.birthdayCouponList[idx];
    if (coupon) {
      this.setData({ birthdayCouponId: String(coupon.id) });
    }
  },

  onBirthdayDaysInput: function(e) {
    this.setData({ birthdayDays: e.detail.value });
  },

  onSave: function() {
    var that = this;
    if (that.data.saving) return;

    that.setData({ saving: true });

    // 先保存 home 配置
    util.request(api.ManagerSystemConfigUpdate, {
      group: 'home',
      configs: {
        litemall_home_activity_bg_image: that.data.form.activityBgImage
      }
    }).then(function(res) {
      if (res.errno !== 0) {
        that.setData({ saving: false });
        wx.showToast({ title: res.errmsg || '保存失败', icon: 'none' });
        return;
      }
      // 再保存 promotion 配置
      return util.request(api.ManagerSystemConfigUpdate, {
        group: 'promotion',
        configs: {
          litemall_birthday_coupon_coupon_status: that.data.birthdayEnabled ? '1' : '0',
          litemall_birthday_coupon_id: that.data.birthdayCouponId || '',
          litemall_birthday_coupon_days: String(that.data.birthdayDays || 30)
        }
      });
    }).then(function(res) {
      that.setData({ saving: false });
      if (res && res.errno === 0) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        homeRefresh.markHomeRefreshNeeded();
        setTimeout(function() {
          wx.navigateBack();
        }, 1500);
      } else if (res) {
        wx.showToast({ title: res.errmsg || '保存失败', icon: 'none' });
      }
    }).catch(function() {
      that.setData({ saving: false });
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  },

  onBack: function() {
    wx.navigateBack();
  }
});
