var util = require('../../../utils/util.js');
var api = require('../../../config/api.js');
var tracker = require('../../../utils/tracker.js');

var app = getApp();

Page({
  data: {
    footprintList: [],
    page: 1,
    limit: 10,
    totalPages: 1,
    loading: false
  },

  onShow() {
    tracker.trackPageView('足迹');
  },

  getFootprintList() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    let that = this;
    util.request(api.FootprintList, {
      page: that.data.page,
      limit: that.data.limit
    }).then(function(res) {
      if (res.errno === 0) {
        let f1 = that.data.footprintList;
        let f2 = res.data.list;
        for (let i = 0; i < f2.length; i++) {
          f2[i].addDate = f2[i].addTime.substring(0, 10);
          let last = f1.length - 1;
          if (last >= 0 && f1[last][0].addDate === f2[i].addDate) {
            f1[last].push(f2[i]);
          } else {
            f1.push([f2[i]]);
          }
        }
        that.setData({
          footprintList: f1,
          totalPages: res.data.pages
        });
      }
      that.setData({ loading: false });
      wx.hideLoading();
    }).catch(function() {
      that.setData({ loading: false });
      wx.hideLoading();
    });
  },

  goDetail(event) {
    let goodsId = event.currentTarget.dataset.iitem
      ? event.currentTarget.dataset.iitem.goodsId
      : this.data.footprintList[event.currentTarget.dataset.index][event.currentTarget.dataset.iindex].goodsId;
    wx.navigateTo({
      url: '/pages/goods_detail/goods_detail?id=' + goodsId,
    });
  },

  deleteItem(event) {
    let that = this;
    let index = event.currentTarget.dataset.index;
    let iindex = event.currentTarget.dataset.iindex;
    let footprintId = this.data.footprintList[index][iindex].id;

    wx.showModal({
      title: '',
      content: '要删除所选足迹？',
      success: function(res) {
        if (res.confirm) {
          util.request(api.FootprintDelete, {
            id: footprintId
          }, 'POST').then(function(res) {
            if (res.errno === 0) {
              wx.showToast({
                title: '删除成功',
                icon: 'success',
                duration: 2000
              });
              that.data.footprintList[index].splice(iindex, 1);
              if (that.data.footprintList[index].length === 0) {
                that.data.footprintList.splice(index, 1);
              }
              that.setData({
                footprintList: that.data.footprintList
              });
            }
          });
        }
      }
    });
  },

  onLoad: function(options) {
    this.getFootprintList();
  },

  onReachBottom() {
    if (this.data.totalPages > this.data.page) {
      this.setData({
        page: this.data.page + 1
      });
      this.getFootprintList();
    } else {
      wx.showToast({
        title: '没有更多足迹了',
        icon: 'none',
        duration: 2000
      });
    }
  }
});
