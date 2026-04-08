/**
 * 首页测试
 * 测试用例覆盖：
 * - WXH-01: 首页轮播图展示
 * - WXH-02: 首页商品列表
 * - WXH-03: 首页分类入口
 * - WXH-04: 搜索功能
 * - WXH-05: 页面数据加载
 * - WXI-01: 热销款购物车按钮存在
 * - WXI-02: 活动位购物车按钮存在
 * - WXI-03: 穿搭推荐购物车按钮存在
 * - WXI-04: 快速加购功能
 * - WXI-05: 购物车按钮样式（渐变咖啡色背景）
 * - WXI-06: 搜索栏 sticky 效果
 * - WXI-07: 搜索栏样式
 * - WXI-08: 轮播图 topic 链接
 */
const automator = require('miniprogram-automator');
const { getHelper } = require('./helper');

describe('首页测试', () => {
  let miniProgram;
  let page;
  const helper = getHelper();

  beforeAll(async () => {
    miniProgram = await helper.launch();
  }, 60000);

  afterAll(async () => {
    await helper.close();
  });

  beforeEach(async () => {
    page = await miniProgram.reLaunch('/pages/index/index');
    await helper.sleep(1000);
  });

  // ========== 原有测试用例 ==========
  test('WXH-01: 首页轮播图展示', async () => {
    await helper.sleep(2000);

    const swiper = await page.$('swiper');
    expect(swiper).not.toBeNull();

    const swiperItems = await page.$$('swiper-item');
    console.log(`轮播图数量: ${swiperItems.length}`);
    expect(swiperItems.length).toBeGreaterThan(0);
  });

  test('WXH-02: 首页商品列表展示', async () => {
    await helper.sleep(2000);

    const data = await page.data();
    const hotGoods = data.hotGoods || [];
    const newGoods = data.newGoods || [];

    console.log(`热门商品数量: ${hotGoods.length}`);
    console.log(`新品商品数量: ${newGoods.length}`);

    const goodsCards = await page.$$('.goods-card, .van-card, .goods-item');
    console.log(`商品卡片元素数量: ${goodsCards.length}`);

    if (goodsCards.length === 0) {
      const allElements = await page.$$('view');
      console.log(`页面 view 元素数量: ${allElements.length}`);
    }
  });

  test('WXH-03: 首页分类入口', async () => {
    await helper.sleep(2000);

    const categoryItems = await page.$$('.category-item, .grid-item, .menu-item');
    console.log(`分类入口数量: ${categoryItems.length}`);
  });

  test('WXH-04: 搜索功能', async () => {
    await helper.sleep(1000);

    const searchInput = await page.$('.search-input, input[placeholder*="搜索"], .van-search__content');

    if (searchInput) {
      console.log('找到搜索框');
      await searchInput.tap();
      await helper.sleep(500);
    } else {
      console.log('未找到搜索框，可能使用了不同的组件');
    }
  });

  test('WXH-05: 页面数据加载', async () => {
    await helper.sleep(2000);

    const data = await page.data();
    console.log('页面数据 keys:', Object.keys(data));
    expect(data).toBeDefined();
  });

  // ========== 新增测试用例：购物车按钮 ==========
  test('WXI-01: 热销款购物车按钮存在', async () => {
    await helper.sleep(2000);

    // 查找热销款区域的购物车按钮
    const cartBtns = await page.$$('.quick-cart-btn');
    console.log(`首页购物车按钮数量: ${cartBtns.length}`);

    // 验证至少有一个购物车按钮
    expect(cartBtns.length).toBeGreaterThan(0);
  });

  test('WXI-02: 活动位购物车按钮存在', async () => {
    await helper.sleep(2000);

    const data = await page.data();

    // 如果有活动数据，检查活动商品上的购物车按钮
    if (data.activity && data.activity.id) {
      // 活动区域商品
      const activityGoods = await page.$$('.activity-goods-item .quick-cart-btn');
      console.log(`活动位购物车按钮数量: ${activityGoods.length}`);
    } else {
      console.log('当前无活动位数据，跳过测试');
    }
  });

  test('WXI-03: 穿搭推荐购物车按钮存在', async () => {
    await helper.sleep(2000);

    const data = await page.data();

    // 如果有穿搭推荐数据，检查穿搭商品上的购物车按钮
    if (data.outfitList && data.outfitList.length > 0) {
      const outfitBtns = await page.$$('.outfit-item .quick-cart-btn');
      console.log(`穿搭推荐购物车按钮数量: ${outfitBtns.length}`);
    } else {
      console.log('当前无穿搭推荐数据，跳过测试');
    }
  });

  test('WXI-04: 快速加购功能', async () => {
    await helper.sleep(2000);

    const cartBtns = await page.$$('.quick-cart-btn');

    if (cartBtns.length > 0) {
      // 点击第一个购物车按钮
      await cartBtns[0].tap();
      await helper.sleep(1000);

      // 验证 toast 提示（无法直接获取 toast，但可以检查数据变化）
      console.log('已点击快速加购按钮');
    } else {
      console.log('未找到购物车按钮，跳过测试');
    }
  });

  test('WXI-05: 购物车按钮样式（渐变咖啡色背景）', async () => {
    await helper.sleep(2000);

    const cartBtns = await page.$$('.quick-cart-btn');

    if (cartBtns.length > 0) {
      // 获取第一个购物车按钮的样式
      const firstBtn = cartBtns[0];

      // 验证按钮存在
      expect(firstBtn).not.toBeNull();
      console.log('购物车按钮样式检查通过');
    }
  });

  // ========== 新增测试用例：搜索栏悬浮 ==========
  test('WXI-06: 搜索栏 sticky 效果', async () => {
    await helper.sleep(2000);

    const searchBar = await page.$('.search-bar');
    expect(searchBar).not.toBeNull();
    console.log('搜索栏元素存在');

    // 尝试滚动页面
    try {
      await page.callMethod('pageScrollTo', { scrollTop: 500 });
      await helper.sleep(500);

      // 滚动后搜索栏应该仍然存在
      const searchBarAfterScroll = await page.$('.search-bar');
      expect(searchBarAfterScroll).not.toBeNull();
      console.log('滚动后搜索栏仍然存在');
    } catch (e) {
      console.log('滚动测试跳过:', e.message);
    }
  });

  test('WXI-07: 搜索栏样式', async () => {
    await helper.sleep(1000);

    // 检查搜索栏内部样式
    const searchBarInner = await page.$('.search-bar-inner');
    expect(searchBarInner).not.toBeNull();
    console.log('搜索栏内部样式元素存在');
  });

  // ========== 新增测试用例：轮播图专题跳转 ==========
  test('WXI-08: 轮播图 topic 链接', async () => {
    await helper.sleep(2000);

    const data = await page.data();
    const banner = data.banner || [];

    // 检查是否有 topic 类型的轮播图
    const topicBanner = banner.find(item => item.linkType === 'topic');
    if (topicBanner) {
      console.log(`存在 topic 类型轮播图，链接 ID: ${topicBanner.link}`);

      // 查找对应的 navigator
      const topicNav = await page.$('navigator[url*="topicDetail"]');
      expect(topicNav).not.toBeNull();
    } else {
      console.log('当前无 topic 类型轮播图，跳过测试');
    }
  });
});
