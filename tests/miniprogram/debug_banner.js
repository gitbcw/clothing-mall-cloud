/**
 * 调试脚本：检查小程序轮播图数据
 */
const automator = require('miniprogram-automator');

async function debug() {
  let miniProgram = null;

  try {
    console.log('尝试连接到小程序调试服务 (端口 11392)...');

    // 连接到已运行的 automator 实例
    miniProgram = await automator.connect({
      wsEndpoint: 'ws://127.0.0.1:11392'
    });

    console.log('✓ 连接成功！');

    // 获取当前页面
    let page = await miniProgram.currentPage();
    console.log('当前页面路径:', page.path);

    // 如果不是首页，重新加载
    if (!page.path.includes('index/index')) {
      console.log('重新加载到首页...');
      page = await miniProgram.reLaunch('/pages/index/index');
      await sleep(3000);
    } else {
      await sleep(2000);
    }

    // 获取页面数据
    const data = await page.data();

    console.log('\n========== 页面数据 keys ==========');
    console.log(Object.keys(data));

    // 重点检查 banner 数据
    console.log('\n========== Banner 数据 ==========');
    const banner = data.banner;
    console.log('banner 类型:', typeof banner);
    console.log('banner 是否为数组:', Array.isArray(banner));
    console.log('banner 长度:', banner ? banner.length : 'N/A');

    if (Array.isArray(banner) && banner.length > 0) {
      console.log('\n========== Banner Item 详细结构 ==========');
      banner.forEach((item, index) => {
        console.log(`\n--- Banner ${index + 1} ---`);
        console.log('  item 类型:', typeof item);
        console.log('  item.url:', item.url);
        console.log('  item.url 类型:', typeof item.url);
        console.log('  item.linkType:', item.linkType);
        console.log('  item.link:', item.link);
      });
    } else {
      console.log('\n⚠️ Banner 数据为空！');
    }

    // 检查轮播图 DOM
    console.log('\n========== 轮播图 DOM ==========');
    const swiper = await page.$('swiper');
    if (swiper) {
      console.log('✓ swiper 元素存在');
      const swiperItems = await page.$$('swiper-item');
      console.log('swiper-item 数量:', swiperItems.length);

      if (swiperItems.length > 0) {
        const firstImage = await swiperItems[0].$('image');
        if (firstImage) {
          const src = await firstImage.attribute('src');
          console.log('第一个 image src:', src);
          console.log('src 类型:', typeof src);
        }
      }
    }

    console.log('\n========== 调试完成 ==========');

  } catch (error) {
    console.error('错误:', error.message);
    console.error(error.stack);
  }
  // 注意：connect 模式下不要关闭 miniProgram，否则会断开连接
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

debug();
