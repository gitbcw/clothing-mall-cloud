var util = require('../../../utils/util.js');
var api = require('../../../config/api.js');

var TYPE_OPTIONS = ['通用领券', '新人券', '兑换码', '生日专属'];
var TYPE_MAP = [0, 1, 2, 4]; // 索引到实际 type 值的映射

function getTypeName(type) {
  var idx = TYPE_MAP.indexOf(type);
  if (idx === -1) idx = 0;
  return TYPE_OPTIONS[idx];
}

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    isEdit: false,
    form: {
      name: '',
      type: 0,
      desc: '',
      tag: '',
      discountType: 0,
      discount: '',
      min: '',
      limit: '',
      total: '',
      timeType: 0,
      days: '',
      startDate: '',
      endDate: '',
      popup: 0
    },
    typeOptions: TYPE_OPTIONS,
    typeName: TYPE_OPTIONS[0],
    showTypePicker: false,
    pickerIndex: 0,
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
      this.setData({ isEdit: true });
      this.loadCoupon(parseInt(options.id));
    }
  },

  loadCoupon: function(id) {
    var that = this;
    util.request(api.ManagerCouponRead, { id: id }, 'GET').then(function(res) {
      var c = res.data;
      var pickerIndex = TYPE_MAP.indexOf(c.type || 0);
      if (pickerIndex === -1) pickerIndex = 0;
      that.setData({
        form: {
          name: c.name || '',
          type: c.type || 0,
          desc: c.desc || '',
          tag: c.tag || '',
          discountType: c.discount_type || 0,
          discount: c.discount != null ? String(c.discount) : '',
          min: c.min != null ? String(c.min) : '',
          limit: c.limit != null ? String(c.limit) : '',
          total: c.total != null ? String(c.total) : '',
          timeType: c.time_type || 0,
          days: c.days != null ? String(c.days) : '',
          startDate: c.start_time ? c.start_time.slice(0, 10) : '',
          endDate: c.end_time ? c.end_time.slice(0, 10) : '',
          popup: c.popup || 0
        },
        pickerIndex: pickerIndex,
        typeName: getTypeName(c.type || 0)
      });
    });
  },

  // ---- 表单输入 ----

  onInputName: function(e) {
    this.setData({ 'form.name': e.detail.value });
  },

  onInputDesc: function(e) {
    this.setData({ 'form.desc': e.detail.value });
  },

  onInputTag: function(e) {
    this.setData({ 'form.tag': e.detail.value });
  },

  onInputDiscount: function(e) {
    this.setData({ 'form.discount': e.detail.value });
  },

  onInputMin: function(e) {
    this.setData({ 'form.min': e.detail.value });
  },

  onInputLimit: function(e) {
    this.setData({ 'form.limit': e.detail.value });
  },

  onInputTotal: function(e) {
    this.setData({ 'form.total': e.detail.value });
  },

  onInputDays: function(e) {
    this.setData({ 'form.days': e.detail.value });
  },

  // ---- 类型选择 ----

  onShowTypePicker: function() {
    this.setData({ showTypePicker: true });
  },

  onTypeConfirm: function(e) {
    var idx = e.detail.value;
    // idx 可能是数组 [0] 或数字
    var pickerIdx = Array.isArray(idx) ? idx[0] : idx;
    var typeVal = TYPE_MAP[parseInt(pickerIdx)] || 0;
    this.setData({
      'form.type': typeVal,
      pickerIndex: parseInt(pickerIdx),
      typeName: getTypeName(typeVal),
      showTypePicker: false
    });
  },

  onTypeCancel: function() {
    this.setData({ showTypePicker: false });
  },

  onTogglePopup: function() {
    this.setData({ 'form.popup': this.data.form.popup === 0 ? 1 : 0 });
  },

  // ---- 折扣类型切换 ----

  onToggleDiscountType: function() {
    this.setData({ 'form.discountType': this.data.form.discountType === 0 ? 1 : 0 });
  },

  // ---- 有效期类型切换 ----

  onToggleTimeType: function() {
    this.setData({ 'form.timeType': this.data.form.timeType === 0 ? 1 : 0 });
  },

  onStartDateChange: function(e) {
    this.setData({ 'form.startDate': e.detail.value });
  },

  onEndDateChange: function(e) {
    this.setData({ 'form.endDate': e.detail.value });
  },

  // ---- 保存 ----

  onSave: function() {
    var that = this;
    var form = this.data.form;

    if (!form.name || !form.name.trim()) {
      wx.showToast({ title: '请输入优惠券名称', icon: 'none' });
      return;
    }
    if (!form.discount || parseFloat(form.discount) <= 0) {
      wx.showToast({ title: '请输入有效的折扣值', icon: 'none' });
      return;
    }

    that.setData({ saving: true });

    var requestData = {
      name: form.name.trim(),
      type: form.type,
      desc: form.desc || '',
      tag: form.tag || '',
      discountType: form.discountType,
      discount: parseFloat(form.discount) || 0,
      min: parseFloat(form.min) || 0,
      limit: parseInt(form.limit) || 0,
      total: parseInt(form.total) || 0,
      timeType: form.timeType,
      days: parseInt(form.days) || 0,
      startTime: form.startDate || null,
      endTime: form.endDate || null,
      popup: form.popup || 0,
      status: 0
    };

    var requestUrl;
    if (that.data.isEdit) {
      // 编辑模式需要传 id，从 loadCoupon 获取
      var pages = getCurrentPages();
      var prevPage = pages[pages.length - 1];
      // id 存在 options 中
      var options = prevPage.options || {};
      requestData.id = parseInt(options.id);
      requestUrl = api.ManagerCouponUpdate;
    } else {
      requestUrl = api.ManagerCouponCreate;
    }

    util.request(requestUrl, requestData, 'POST').then(function(res) {
      that.setData({ saving: false });
      if (res.errno !== 0) {
        wx.showToast({ title: res.errmsg || '操作失败', icon: 'none' });
        return;
      }
      wx.showToast({ title: that.data.isEdit ? '保存成功' : '创建成功', icon: 'success' });
      setTimeout(function() {
        wx.navigateBack();
      }, 800);
    }).catch(function() {
      that.setData({ saving: false });
    });
  },

  onBack: function() {
    wx.navigateBack();
  }
});
