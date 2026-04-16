const util = require('../../../utils/util.js');
const api = require('../../../config/api.js');
const tracker = require('../../../utils/tracker.js');

Page({
  data: {
    couponList: [],
    expiredList: [],
    loading: false,
    showExpired: false,
    page: 1,
    limit: 50,
    count: 0,
    expandedId: null
  },

  onLoad() {
    this.loadCouponList();
  },

  onShow() {
    tracker.trackPageView('优惠券');
  },

  onPullDownRefresh() {
    this.setData({
      page: 1,
      couponList: [],
      expiredList: [],
      count: 0,
      loading: false,
      showExpired: false
    });
    this.loadCouponList(true).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (this.data.loading) return;
    if (this.data.page * this.data.limit < this.data.count) {
      this.setData({ page: this.data.page + 1 });
      this.loadCouponList(true);
    }
  },

  loadCouponList(quiet) {
    if (this.data.loading) return Promise.resolve();
    this.setData({ loading: true });
    if (!quiet) {
      wx.showLoading({ title: '加载中...' });
    }

    return util.request(api.CouponMyList, {
      status: 0,
      page: this.data.page,
      limit: this.data.limit
    }).then((res) => {
      if (res.errno === 0) {
        const list = res.data.list.map(item => this.formatCoupon(item));
        this.setData({
          couponList: this.data.couponList.concat(list),
          count: res.data.total
        });
      }
    }).finally(() => {
      if (!quiet) {
        wx.hideLoading();
      }
      this.setData({ loading: false });
    });
  },

  loadExpiredList() {
    if (this.data.expiredList.length > 0) return;
    wx.showLoading({ title: '加载中...' });
    // 加载已用 + 已过期
    util.request(api.CouponMyList, { status: 1, page: 1, limit: 50 }).then((res1) => {
      const used = (res1.errno === 0) ? res1.data.list.map(item => this.formatCoupon(item)) : [];
      util.request(api.CouponMyList, { status: 2, page: 1, limit: 50 }).then((res2) => {
        const expired = (res2.errno === 0) ? res2.data.list.map(item => this.formatCoupon(item)) : [];
        this.setData({
          expiredList: used.concat(expired),
          showExpired: true
        });
        wx.hideLoading();
      });
    });
  },

  formatCoupon(item) {
    if (item.discountType === 1) {
      item.discountText = ((100 - Number(item.discount)) / 10) + '折';
      item.discountSymbol = '';
    } else {
      item.discountText = item.discount;
      item.discountSymbol = '¥';
    }
    item.isBirthday = item.type === 4;
    item.isUsable = item.status === 0;
    // 格式化日期，只取日期部分
    if (item.startTime) {
      item.startTimeText = item.startTime.substring(0, 10);
    }
    if (item.endTime) {
      item.endTimeText = item.endTime.substring(0, 10);
    }
    return item;
  },

  toggleRule(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      expandedId: this.data.expandedId === id ? null : id
    });
  },

  goUse() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  showExpiredCoupons() {
    this.loadExpiredList();
  }
});
