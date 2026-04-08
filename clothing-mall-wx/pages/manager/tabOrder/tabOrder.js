const util = require('../../../utils/util.js');
const api = require('../../../config/api.js');

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    activeSubTab: 'order',  // 'order' | 'aftersale'
    orderList: [],
    page: 1,
    limit: 10,
    total: 0,
    pendingCount: 0,
    aftersaleCount: 0,
    pendingGoodsCount: 0,
    loading: false
  },

  onLoad() {
    // 获取系统信息，设置状态栏高度
    const { system } = wx.getDeviceInfo();
    const { statusBarHeight } = wx.getWindowInfo();
    const isIOS = system.indexOf('iOS') > -1;
    this.setData({
      statusBarHeight,
      navBarHeight: isIOS ? 44 : 48
    });
    this.getOrderList();
    this.getStats();
  },

  onShow() {
    // 更新管理端 TabBar
    const tabBar = this.selectComponent('#managerTabBar');
    if (tabBar) {
      tabBar.setData({ active: 0 });
    }
    // 刷新数据
    if (this.data.orderList.length > 0) {
      this.refreshList();
      this.getStats();
    }
  },

  onPullDownRefresh() {
    this.refreshList();
    wx.stopPullDownRefresh();
  },

  onReachBottom() {
    if (this.data.orderList.length < this.data.total) {
      this.setData({ page: this.data.page + 1 });
      this.getOrderList();
    }
  },

  // 子 Tab 切换
  onSubTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.activeSubTab) return;
    this.setData({
      activeSubTab: tab,
      page: 1,
      orderList: []
    });
    this.getOrderList();
  },

  refreshList() {
    this.setData({ page: 1, orderList: [] });
    this.getOrderList();
  },

  getStats() {
    let that = this;
    util.request(api.ManagerStats).then(function(res) {
      if (res.errno === 0) {
        that.setData({
          pendingCount: res.data.pendingOrderCount || 0,
          aftersaleCount: res.data.aftersaleCount || 0,
          pendingGoodsCount: res.data.pendingGoodsCount || 0
        });
      }
    });
  },

  getOrderList() {
    if (this.data.loading) return;
    let that = this;
    this.setData({ loading: true });

    // 根据子 Tab 选择不同接口
    if (this.data.activeSubTab === 'aftersale') {
      this.getAftersaleList();
      return;
    }

    util.request(api.ManagerOrderList, {
      status: 'pending',
      page: this.data.page,
      limit: this.data.limit
    }).then(function(res) {
      if (res.errno === 0) {
        const data = res.data;
        let newList = data.list || [];

        newList.forEach(function(order) {
          let count = 0;
          if (order.goodsList) {
            order.goodsList.forEach(function(g) {
              count += (g.number || 0);
            });
          }
          order.goodsCount = count;
        });

        that.setData({
          orderList: that.data.page === 1 ? newList : that.data.orderList.concat(newList),
          total: data.total || 0,
          pendingCount: data.pendingCount || 0,
          aftersaleCount: data.aftersaleCount || 0,
          loading: false
        });
      } else {
        that.setData({ loading: false });
      }
    }).catch(function() {
      that.setData({ loading: false });
    });
  },

  getAftersaleList() {
    let that = this;
    util.request(api.ManagerAftersaleList, {
      tab: 'pending',
      page: this.data.page,
      limit: this.data.limit
    }).then(function(res) {
      if (res.errno === 0) {
        const data = res.data;
        let newList = data.list || [];

        that.setData({
          orderList: that.data.page === 1 ? newList : that.data.orderList.concat(newList),
          total: data.total || 0,
          aftersaleCount: data.pendingCount || 0,
          loading: false
        });
      } else {
        that.setData({ loading: false });
      }
    }).catch(function() {
      that.setData({ loading: false });
    });
  },

  goOrderDetail(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/manager/orderDetail/orderDetail?id=' + orderId
    });
  },

  // 发货
  onShip(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/manager/orderDetail/orderDetail?id=' + orderId + '&action=ship'
    });
  },

  // 取消
  onCancel(e) {
    const orderId = e.currentTarget.dataset.id;
    let that = this;
    wx.showModal({
      title: '确认',
      content: '确认取消该订单？已付款订单将自动退款。',
      success(res) {
        if (res.confirm) {
          util.request(api.ManagerOrderCancel, { orderId: orderId }, 'POST').then(function(res) {
            if (res.errno === 0) {
              wx.showToast({ title: '已取消', icon: 'success' });
              that.refreshList();
            } else {
              wx.showToast({ title: res.errmsg || '操作失败', icon: 'none' });
            }
          });
        }
      }
    });
  },

  // 核销
  onVerify(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/manager/orderDetail/orderDetail?id=' + orderId + '&action=verify'
    });
  },

  // 同意退款
  onRefundAgree(e) {
    const orderId = e.currentTarget.dataset.id;
    let that = this;
    wx.showModal({
      title: '确认退款',
      content: '退款金额将原路返回给客户',
      success(res) {
        if (res.confirm) {
          util.request(api.ManagerOrderRefundAgree, { orderId: orderId }, 'POST').then(function(res) {
            if (res.errno === 0) {
              wx.showToast({ title: '退款成功', icon: 'success' });
              that.refreshList();
            } else {
              wx.showToast({ title: res.errmsg || '退款失败', icon: 'none' });
            }
          });
        }
      }
    });
  },

  // 拒绝退款
  onRefundReject(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/manager/orderDetail/orderDetail?id=' + orderId + '&action=refundReject'
    });
  },

  // 售后：审核通过
  onAftersaleRecept(e) {
    const id = e.currentTarget.dataset.id;
    let that = this;
    wx.showModal({
      title: '确认',
      content: '同意该换货申请？',
      success(res) {
        if (res.confirm) {
          util.request(api.ManagerAftersaleRecept, { id: id }, 'POST').then(function(res) {
            if (res.errno === 0) {
              wx.showToast({ title: '已同意', icon: 'success' });
              that.refreshList();
            } else {
              wx.showToast({ title: res.errmsg || '操作失败', icon: 'none' });
            }
          });
        }
      }
    });
  },

  // 售后：审核拒绝
  onAftersaleReject(e) {
    const id = e.currentTarget.dataset.id;
    let that = this;
    wx.showModal({
      title: '确认',
      content: '确认拒绝该换货申请？',
      success(res) {
        if (res.confirm) {
          util.request(api.ManagerAftersaleReject, { id: id }, 'POST').then(function(res) {
            if (res.errno === 0) {
              wx.showToast({ title: '已拒绝', icon: 'success' });
              that.refreshList();
            } else {
              wx.showToast({ title: res.errmsg || '操作失败', icon: 'none' });
            }
          });
        }
      }
    });
  },

  // 售后：换货发货
  onAftersaleShip(e) {
    const id = e.currentTarget.dataset.id;
    let that = this;
    util.request(api.ManagerShippers, {}, 'GET').then(function(res) {
      if (res.errno === 0 && res.data.length > 0) {
        wx.showActionSheet({
          itemList: res.data,
          success(res2) {
            const channelName = res.data[res2.tapIndex];
            that.inputShipSn(id, channelName);
          }
        });
      } else {
        wx.showToast({ title: '请先配置快递公司', icon: 'none' });
      }
    });
  },

  inputShipSn(id, channel) {
    let that = this;
    wx.showModal({
      title: '快递单号',
      editable: true,
      placeholderText: '请输入快递单号',
      success(res) {
        if (res.confirm && res.content) {
          util.request(api.ManagerAftersaleShip, {
            id: id,
            shipChannel: channel,
            shipSn: res.content.trim()
          }, 'POST').then(function(res) {
            if (res.errno === 0) {
              wx.showToast({ title: '发货成功', icon: 'success' });
              that.refreshList();
            } else {
              wx.showToast({ title: res.errmsg || '操作失败', icon: 'none' });
            }
          });
        }
      }
    });
  }
});
