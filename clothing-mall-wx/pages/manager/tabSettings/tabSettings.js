const homeRefresh = require('../../../utils/home-refresh.js');

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    menuList: [
      {
        group: '运营管理',
        items: [
          { key: 'coupon', label: '优惠券管理', icon: 'coupon', desc: '管理优惠券与发放' },
          { key: 'specialPrice', label: '特价管理', icon: 'specialPrice', desc: '设置特价商品' },
          { key: 'holiday', label: '节日活动', icon: 'holiday', desc: '管理节日活动与商品' }
        ]
      },
      {
        group: '内容管理',
        items: [
          { key: 'outfit', label: '穿搭推荐', icon: 'outfit', desc: '管理穿搭推荐内容' },
          { key: 'scene', label: '场景管理', icon: 'scene', desc: '管理场景标签与海报' }
        ]
      },
      {
        group: '系统',
        items: [
          { key: 'systemConfig', label: '系统配置', icon: 'system', desc: '首页外观与常用设置' },
          { key: 'switchUser', label: '返回用户端', icon: 'switch', desc: '切换到买家视角' }
        ]
      }
    ]
  },

  onLoad() {
    const { system } = wx.getDeviceInfo();
    const { statusBarHeight } = wx.getWindowInfo();
    const isIOS = system.indexOf('iOS') > -1;
    this.setData({
      statusBarHeight,
      navBarHeight: isIOS ? 44 : 48
    });
  },

  onShow() {
    const tabBar = this.selectComponent('#managerTabBar');
    if (tabBar) {
      tabBar.setData({ active: 2 });
    }
  },

  onMenuTap(e) {
    var key = e.currentTarget.dataset.key;
    switch (key) {
      case 'coupon':
        wx.navigateTo({ url: '/pages/manager/couponManage/couponManage' });
        break;
      case 'specialPrice':
        wx.navigateTo({ url: '/pages/manager/specialPrice/specialPrice' });
        break;
      case 'holiday':
        wx.navigateTo({ url: '/pages/manager/holidayManage/holidayManage' });
        break;
      case 'outfit':
        wx.navigateTo({ url: '/pages/manager/outfitManage/outfitManage' });
        break;
      case 'scene':
        wx.navigateTo({ url: '/pages/manager/sceneManage/sceneManage' });
        break;
      case 'systemConfig':
        wx.navigateTo({ url: '/pages/manager/systemConfig/systemConfig' });
        break;
      case 'switchUser':
        homeRefresh.markHomeRefreshNeeded();
        wx.reLaunch({ url: '/pages/index/index' });
        break;
    }
  }
});
