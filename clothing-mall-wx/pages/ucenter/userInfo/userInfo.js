const util = require('../../../utils/util.js');
const api = require('../../../config/api.js');
const app = getApp();

Page({
  data: {
    userInfo: {
      nickName: '',
      avatarUrl: '',
      mobile: '',
      birthday: ''
    },
    today: ''
  },

  onLoad: function (options) {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    this.setData({
      today: todayStr
    });
    this.getUserInfo();
  },

  getUserInfo: function () {
    util.request(api.UserInfo).then(res => {
      if (res.errno === 0) {
        this.setData({
          userInfo: {
            nickName: res.data.nickname,
            avatarUrl: res.data.avatar,
            mobile: res.data.mobile || '',
            birthday: res.data.birthday
          }
        });
      }
    });
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    // 这里需要将头像上传到服务器，获取URL，暂时直接使用本地临时路径或上传接口
    // 为了完整性，我们先调用上传接口
    wx.uploadFile({
      url: api.StorageUpload,
      filePath: avatarUrl,
      name: 'file',
      header: {
        'X-Litemall-Token': wx.getStorageSync('token')
      },
      success: (res) => {
        let data = JSON.parse(res.data);
        if (data.errno === 0) {
          this.setData({
            'userInfo.avatarUrl': data.data.url
          });
        }
      }
    });
  },

  bindNicknameInput(e) {
    this.setData({
      'userInfo.nickName': e.detail.value
    });
  },

  bindBirthdayChange(e) {
    this.setData({
      'userInfo.birthday': e.detail.value
    });
  },

  onGetPhoneNumber(e) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      if (e.detail.errMsg.indexOf('user deny') !== -1) {
        util.showErrorToast('已取消授权');
      }
      return;
    }

    util.request(api.AuthBindPhone, {
      encryptedData: e.detail.encryptedData,
      iv: e.detail.iv
    }, 'POST').then(res => {
      if (res.errno === 0) {
        wx.showToast({ title: '绑定成功', icon: 'success' });
        this.setData({
          'userInfo.mobile': res.data.mobile || ''
        });
      } else {
        util.showErrorToast(res.errmsg || '绑定失败');
      }
    });
  },

  saveProfile() {
    const { nickName, avatarUrl, mobile, birthday } = this.data.userInfo;
    if (!nickName) {
      util.showErrorToast('请输入昵称');
      return;
    }

    util.request(api.UserProfile, {
      nickname: nickName,
      avatar: avatarUrl,
      mobile: mobile,
      birthday: birthday
    }, 'POST').then(res => {
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
                wx.switchTab({ url: '/pages/index/index' });
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
    });
  }
});
