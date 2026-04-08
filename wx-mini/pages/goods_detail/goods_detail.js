Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    currentSwiper: 1, // 当前轮播图索引(从1开始显示)
    swiperList: [
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
      '/images/jimeng-2026-03-13-7228-春天淡雅风格，干练西装外套，柔和自然光，浅灰色调，简约高级感，服装摄影.png',
      'https://images.unsplash.com/photo-1475180098004-ca77a66827be?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1550639525-c97d455acf70?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
    ],
    goodsInfo: {
      title: '【川着】 会员俱乐部卷纸',
      price: '168',
      originalPrice: '188',
      tags: ['上上新优选', '成团后发货', '3天内']
    },
    // Mock 尺码表数据
    sizeTable: [
      { size: 'L', chest: '106', length: '49', shoulder: '22', sleeve: '71' },
      { size: 'XL', chest: '111', length: '50', shoulder: '22.5', sleeve: '73' },
      { size: '2XL', chest: '116', length: '51', shoulder: '23', sleeve: '75' },
      { size: '3XL', chest: '122', length: '52', shoulder: '23.5', sleeve: '77' },
      { size: '4XL', chest: '128', length: '54', shoulder: '24', sleeve: '78' },
      { size: '5XL', chest: '134', length: '56', shoulder: '24.5', sleeve: '79' }
    ],
    // Mock 推荐表数据
    recommendTable: [
      { height: '160-170', weight: '60-70', recSize: 'M' },
      { height: '170-175', weight: '65-75', recSize: 'L' },
      { height: '175-180', weight: '70-80', recSize: 'XL' },
      { height: '180-185', weight: '75-85', recSize: '2XL' },
      { height: '185-190', weight: '85-95', recSize: '3XL' },
      { height: '190-195', weight: '95-105', recSize: '4XL' },
      { height: '190-195', weight: '105-115', recSize: '5XL' }
    ]
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync();
    const isIOS = sysInfo.system.indexOf('iOS') > -1;
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight,
      navBarHeight: isIOS ? 44 : 48
    });
  },

  // 监听轮播图切换
  onSwiperChange(e) {
    this.setData({
      currentSwiper: e.detail.current + 1
    });
  },

  goBack() {
    wx.navigateBack({
      fail: () => {
        wx.switchTab({
          url: '/pages/index/index' // 降级处理
        });
      }
    });
  }
});