var api = require('../../../config/api.js');
var util = require('../../../utils/util.js');
var user = require('../../../utils/user.js');

var app = getApp();
Page({
  data: {
    canIUseGetUserProfile: false,
    showBirthdayPopup: false,
    mobile: '',
    hasLogin: false,
    isDev: api.isDev,
    loading: false
  },
  onLoad: function(options) {
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      })
    }
  },
  onReady: function() {

  },
  onShow: function() {
    var that = this;
    // 页面显示，读取登录状态切换模式
    if (app.globalData.hasLogin) {
      this.setData({ hasLogin: true });
    } else {
      // 非开发环境下，先尝试静默登录
      if (!api.isDev) {
        this.setData({ loading: true });
        app.silentLogin().then(function() {
          that.setData({ hasLogin: true, loading: false });
        }).catch(function() {
          that.setData({ loading: false });
        });
      } else {
        this.setData({ hasLogin: false });
      }
    }
  },
  onHide: function() {
    // 页面隐藏
  },
  onUnload: function() {
    // 页面关闭
  },
  bindMobileInput: function(e) {
    this.setData({
      mobile: e.detail.value
    });
  },
  clearInput: function() {
    this.setData({
      mobile: ''
    });
  },
  bindPhoneNumberManual: function() {
    if (this.data.mobile.length !== 11) {
      wx.showToast({ title: '请输入11位手机号', icon: 'none' });
      return;
    }

    const that = this;
    wx.showLoading({ title: '绑定中...' });
    util.request(api.AuthBindPhoneManual, { mobile: this.data.mobile }, 'POST').then(res => {
      console.log('[bindPhoneManual] response:', JSON.stringify(res));
      if (res.errno === 0) {
        // 绑定成功，刷新用户信息后返回
        util.request(api.UserInfo, {}, 'GET').then(infoRes => {
          wx.hideLoading();
          console.log('[userInfo] response:', JSON.stringify(infoRes));
          if (infoRes.errno === 0) {
            wx.setStorageSync('userInfo', {
              nickName: infoRes.data.nickname,
              avatarUrl: infoRes.data.avatar,
              mobile: infoRes.data.mobile,
              birthday: infoRes.data.birthday
            });
          }

          // 检查是否需要显示生日弹窗
          const userInfo = infoRes.data;
          if (userInfo && !userInfo.birthday) {
            that.setData({ showBirthdayPopup: true });
          } else {
            wx.showToast({ title: '绑定成功', icon: 'success' });
            setTimeout(function() { wx.navigateBack({ delta: 1 }); }, 1000);
          }
        }).catch(function(err) {
          wx.hideLoading();
          console.error('[userInfo] error:', err);
          // 即使获取用户信息失败，绑定已经成功，直接返回
          wx.showToast({ title: '绑定成功', icon: 'success' });
          setTimeout(function() { wx.navigateBack({ delta: 1 }); }, 1000);
        });
      } else {
        wx.hideLoading();
        wx.showToast({ title: res.errmsg || '绑定失败', icon: 'none' });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('[bindPhoneManual] error:', err);
      wx.showToast({ title: '绑定失败', icon: 'none' });
    });
  },
  bindPhoneNumber: function(e) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      if (e.detail.errMsg.indexOf('user deny') !== -1) {
        util.showErrorToast('已取消授权');
      } else if (e.detail.errMsg.indexOf('no permission') !== -1) {
        util.showErrorToast('无权限获取手机号');
      } else {
        util.showErrorToast('授权失败');
      }
      return;
    }

    const that = this;
    const data = {
      encryptedData: e.detail.encryptedData,
      iv: e.detail.iv
    };

    util.request(api.AuthBindPhone, data, 'POST').then(res => {
      if (res.errno === 0) {
        wx.showToast({ title: '绑定成功', icon: 'success' });

        // 重新获取用户信息以更新 mobile
        util.request(api.UserInfo, {}, 'GET').then(infoRes => {
          if (infoRes.errno === 0) {
            wx.setStorageSync('userInfo', {
              nickName: infoRes.data.nickname,
              avatarUrl: infoRes.data.avatar,
              mobile: infoRes.data.mobile,
              birthday: infoRes.data.birthday
            });
          }

          // 检查是否需要显示生日弹窗
          const userInfo = infoRes.data;
          if (userInfo && !userInfo.birthday) {
            that.setData({ showBirthdayPopup: true });
          } else {
            wx.navigateBack({ delta: 1 });
          }
        });
      } else {
        util.showErrorToast(res.errmsg || '绑定失败');
      }
    }).catch(err => {
      util.showErrorToast('绑定失败');
    });
  },

  /**
   * 测试登录（仅开发环境可用）
   */
  testLogin: function() {
    var that = this;
    wx.showLoading({ title: '登录中...' });

    util.request(api.AuthLoginByAccount, {
      username: 'test',
      password: '123456'
    }, 'POST').then(function(res) {
      wx.hideLoading();
      if (res.errno === 0) {
        app.globalData.hasLogin = true;

        // 直接使用返回的用户信息
        var userInfo = res.data.userInfo || {};
        wx.setStorageSync('userInfo', {
          nickName: userInfo.nickName || '',
          avatarUrl: userInfo.avatarUrl || '',
          mobile: userInfo.mobile || ''
        });
        // 存储 token（checkLogin 依赖此字段判断登录状态）
        wx.setStorageSync('token', 'cloud-base');

        that.setData({ hasLogin: true });
        wx.navigateBack({ delta: 1 });
      } else {
        util.showErrorToast(res.errmsg || '登录失败');
      }
    }).catch(function(err) {
      wx.hideLoading();
      util.showErrorToast('登录失败');
    });
  },

  /**
   * 生日提交成功
   */
  onBirthdaySubmit: function(e) {
    this.setData({ showBirthdayPopup: false });
    // 如果获得了生日优惠券，弹出提示
    var coupon = e.detail && e.detail.coupon;
    if (coupon) {
      var discountText = '';
      if (coupon.discountType === 1) {
        discountText = ((100 - Number(coupon.discount)) / 10) + '折';
      } else {
        discountText = '¥' + coupon.discount;
      }
      wx.showModal({
        title: '生日专属优惠券',
        content: '您已获得' + discountText + '优惠券「' + coupon.name + '」，仅限生日当天使用',
        confirmText: '去使用',
        cancelText: '我知道了',
        showCancel: true,
        success: function(modalRes) {
          if (modalRes.confirm) {
            wx.switchTab({ url: '/pages/index/index' });
          } else {
            wx.navigateBack({ delta: 1 });
          }
        }
      });
    } else {
      wx.navigateBack({ delta: 1 });
    }
  },

  /**
   * 跳过生日填写
   */
  onBirthdaySkip: function() {
    this.setData({ showBirthdayPopup: false });
    wx.navigateBack({
      delta: 1
    });
  }
})
