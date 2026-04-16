const util = require('../../../utils/util.js');
const api = require('../../../config/api.js');
const tracker = require('../../../utils/tracker.js');

Page({
  data: {
    collectList: [],
    page: 1,
    limit: 10,
    totalPages: 1,
    loading: false
  },

  onLoad() {
    this.getCollectList();
  },

  onShow() {
    tracker.trackPageView('收藏页');
  },

  onPullDownRefresh() {
    this.setData({
      collectList: [],
      page: 1,
      totalPages: 1,
      loading: false
    });
    this.getCollectList(true).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (this.data.loading) return;
    if (this.data.page < this.data.totalPages) {
      this.setData({ page: this.data.page + 1 });
      this.getCollectList(true);
    }
  },

  getCollectList(quiet) {
    if (this.data.loading) return Promise.resolve();
    this.setData({ loading: true });
    if (!quiet) {
      wx.showLoading({ title: '加载中...' });
    }

    return util.request(api.CollectList, {
      type: 0,
      page: this.data.page,
      limit: this.data.limit
    }).then((res) => {
      if (res.errno === 0) {
        this.setData({
          collectList: this.data.collectList.concat(res.data.list),
          totalPages: res.data.pages
        });
      }
    }).finally(() => {
      if (!quiet) {
        wx.hideLoading();
      }
      this.setData({ loading: false });
    });
  },

  openCollect(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.collectList[index];
    if (!item) return;
    wx.navigateTo({
      url: '/pages/goods_detail/goods_detail?id=' + item.valueId
    });
  },

  deleteCollect(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.collectList[index];
    if (!item) return;

    wx.showModal({
      title: '',
      content: '确定取消收藏吗？',
      confirmColor: '#FF8096',
      success: (res) => {
        if (res.confirm) {
          util.request(api.CollectAddOrDelete, {
            type: 0,
            valueId: item.valueId
          }, 'POST').then((res) => {
            if (res.errno === 0) {
              wx.showToast({ title: '已取消收藏', icon: 'success' });
              this.setData({
                collectList: this.data.collectList.filter((_, i) => i !== index)
              });
            }
          });
        }
      }
    });
  }
});
