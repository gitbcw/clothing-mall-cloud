const util = require('../../../utils/util.js');

Page({
  data: {
    userInfo: {
      nickName: '',
      avatarUrl: '',
      mobile: '',
      birthday: ''
    },
    today: '',
    privacyReady: false
  },

  onLoad: function (options) {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    this.setData({
      today: todayStr
    });
    this.getUserInfo();
    this.refreshPrivacyReady();
  },

  refreshPrivacyReady: function () {
    const that = this;
    util.getPrivacySetting().then(function (res) {
      that.setData({ privacyReady: !res.needAuthorization });
    });
  },

  requestPrivacyAuthorization: function () {
    const that = this;
    util.ensurePrivacyAuthorized({
      message: '完善头像、手机号和生日信息前，请先阅读并同意小程序用户隐私保护指引。'
    }).then(function () {
      that.setData({ privacyReady: true });
      wx.showToast({ title: '已同意，请继续操作', icon: 'none' });
    }).catch(function () {});
  },

  getUserInfo: function () {
    util.request({ func: 'wx-user', action: 'info' }).then(res => {
      if (res.errno === 0) {
        this.setData({
          userInfo: {
            nickName: res.data.nickname,
            avatarUrl: res.data.avatar,
            mobile: res.data.mobile || '',
            birthday: this.formatBirthday(res.data.birthday)
          }
        });
      }
    });
  },

  formatBirthday(date) {
    if (!date) return ''
    if (date.indexOf('T') !== -1) {
      var d = new Date(date)
      var y = d.getFullYear()
      var m = (d.getMonth() + 1).toString().padStart(2, '0')
      var day = d.getDate().toString().padStart(2, '0')
      return y + '-' + m + '-' + day
    }
    return date.substring(0, 10)
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    const that = this;
    util.ensurePrivacyAuthorized({
      message: '上传头像前，请先阅读并同意小程序用户隐私保护指引。'
    }).then(function () {
      that.setData({ privacyReady: true });
      return util.uploadFile(avatarUrl, 'avatar');
    }).then(fileID => {
      if (fileID) {
        that.setData({
          'userInfo.avatarUrl': fileID
        });
      }
    }).catch(function () {});
  },

  bindNicknameInput(e) {
    this.setData({
      'userInfo.nickName': e.detail.value
    });
  },

  bindBirthdayChange(e) {
    this.setData({
      'userInfo.birthday': this.formatBirthday(e.detail.value)
    });
  },

  onGetPhoneNumber(e) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      // 用户拒绝授权
      if (e.detail.errMsg.indexOf('user deny') !== -1) {
        util.showErrorToast('已取消授权');
        return;
      }
      // 接口不可用（未认证等），降级到手动输入
      this.showManualBindPhone();
      return;
    }

    // 优先使用 cloudID（CloudBase 模式）
    const cloudID = e.detail.cloudID
    if (cloudID) {
      util.request({ func: 'wx-auth', action: 'bindPhone' }, { cloudID }, 'POST').then(res => {
        if (res.errno === 0) {
          wx.showToast({ title: '绑定成功', icon: 'success' });
          this.getUserInfo();
        } else {
          // cloudID 解密失败，降级手动输入
          this.showManualBindPhone();
        }
      });
      return;
    }

    // 没有 cloudID，直接降级手动输入
    this.showManualBindPhone();
  },

  showManualBindPhone() {
    const that = this;
    util.ensurePrivacyAuthorized({
      message: '绑定手机号前，请先阅读并同意小程序用户隐私保护指引。'
    }).then(function () {
      that.setData({ privacyReady: true });
      wx.showModal({
        title: '绑定手机号',
        editable: true,
        placeholderText: '请输入手机号',
        success: (res) => {
          if (!res.confirm) return;
          const mobile = (res.content || '').trim();
          if (!/^1[3-9]\d{9}$/.test(mobile)) {
            util.showErrorToast('手机号格式不正确');
            return;
          }
          util.request({ func: 'wx-auth', action: 'bindPhoneManual' }, { mobile }, 'POST').then(res => {
            if (res.errno === 0) {
              wx.showToast({ title: '绑定成功', icon: 'success' });
              that.setData({ 'userInfo.mobile': mobile });
            } else {
              util.showErrorToast(res.errmsg || '绑定失败');
            }
          });
        }
      });
    }).catch(function () {});
  },

  onChangePhone() {
    this.showManualBindPhone();
  },

  saveProfile() {
    const { nickName, avatarUrl, mobile, birthday } = this.data.userInfo;
    if (!nickName) {
      util.showErrorToast('请输入昵称');
      return;
    }

    util.ensurePrivacyAuthorized({
      message: '保存个人资料前，请先阅读并同意小程序用户隐私保护指引。'
    }).then(() => {
      this.setData({ privacyReady: true });
      return util.request({ func: 'wx-user', action: 'profile' }, {
        nickname: nickName,
        avatar: avatarUrl,
        mobile: mobile,
        birthday: birthday
      }, 'POST');
    }).then(res => {
      if (res.errno === 0) {
        // 更新本地缓存
        const localUserInfo = wx.getStorageSync('userInfo') || {};
        wx.setStorageSync('userInfo', {
          ...localUserInfo,
          nickName: nickName,
          avatarUrl: avatarUrl
        });

        // 如果获得了生日优惠券，弹出提示
        if (res.data && res.data.coupon) {
          const coupon = res.data.coupon;
          let discountText = '';
          if (coupon.discountType === 1) {
            discountText = ((100 - coupon.discount) / 10) + '折';
          } else {
            discountText = '¥' + coupon.discount;
          }
          wx.showModal({
            title: '生日专属优惠券',
            content: '您已获得' + discountText + '优惠券「' + coupon.name + '」，仅限生日当天使用',
            confirmText: '去使用',
            cancelText: '我知道了',
            showCancel: true,
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.switchTab({ url: '/pages/category/category' });
              } else {
                wx.navigateBack({ delta: 1 });
              }
            }
          });
        } else {
          wx.showToast({ title: '保存成功', icon: 'success' });
          setTimeout(() => {
            wx.navigateBack({ delta: 1 });
          }, 1500);
        }
      } else {
        util.showErrorToast(res.errmsg || '保存失败');
      }
    }).catch(function () {});
  }
});
