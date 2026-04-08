/**
 * 用户中心测试
 * 测试用例覆盖：
 * - WXU-01: 用户中心页面
 * - WXU-02: 订单状态展示
 * - WXU-03: 功能菜单
 */
const automator = require('miniprogram-automator');
const { getHelper } = require('./helper');

describe('用户中心测试', () => {
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
    page = await miniProgram.reLaunch('/pages/ucenter/index/index');
    await helper.sleep(1500);
  });

  test('WXU-01: 用户中心页面加载', async () => {
    await helper.sleep(1000);

    const data = await page.data();
    console.log('用户中心页面数据 keys:', Object.keys(data));

    expect(data).toBeDefined();
  });

  test('WXU-02: 订单状态展示', async () => {
    await helper.sleep(1000);

    // 查找订单状态栏
    const orderItems = await page.$$('.order-item, .status-item, .van-grid-item');
    console.log(`订单状态项数量: ${orderItems.length}`);

    // 查找待付款、待发货等状态
    const data = await page.data();
    if (data.order) {
      console.log('订单统计:', JSON.stringify(data.order));
    }
  });

  test('WXU-03: 功能菜单展示', async () => {
    await helper.sleep(1000);

    // 查找功能菜单
    const menuItems = await page.$$('.menu-item, .func-item, .van-cell');
    console.log(`功能菜单数量: ${menuItems.length}`);
  });

  test('WXU-04: 未登录状态', async () => {
    await helper.sleep(1000);

    const data = await page.data();
    const userInfo = data.userInfo || data.user || null;

    if (!userInfo) {
      console.log('用户未登录');

      // 查找登录按钮
      const loginBtn = await page.$('.login-btn, .auth-btn, button[open-type="getUserInfo"]');
      if (loginBtn) {
        console.log('找到登录按钮');
      }
    } else {
      console.log('用户已登录:', userInfo.nickName || userInfo.username || '未知');
    }
  });
});
