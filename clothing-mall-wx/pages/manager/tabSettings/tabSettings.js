const util = require('../../../utils/util.js');

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    menuList: [
      {
        group: '运营管理',
        items: [
          { key: 'wework', label: '企微推送', icon: 'wework', desc: '发送消息与卡片推送' }
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
      case 'wework':
        wx.navigateTo({ url: '/pages/manager/pushSend/pushSend' });
        break;
      case 'issue':
        wx.navigateTo({ url: '/pages/manager/issueManage/issueManage' });
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
        wx.switchTab({ url: '/pages/index/index' });
        break;
    }
  }
});
