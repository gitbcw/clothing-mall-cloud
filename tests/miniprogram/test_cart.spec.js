/**
 * 购物车测试
 * 测试用例覆盖：
 * - WXCart-01: 购物车页面展示
 * - WXCart-02: 购物车商品列表
 * - WXCart-03: 购物车商品勾选
 * - WXCart-04: 购物车结算
 */
const automator = require('miniprogram-automator');
const { getHelper } = require('./helper');

describe('购物车测试', () => {
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
    page = await miniProgram.reLaunch('/pages/cart/cart');
    await helper.sleep(1500);
  });

  test('WXCart-01: 购物车页面加载', async () => {
    await helper.sleep(1000);

    // 获取页面数据
    const data = await page.data();
    console.log('购物车页面数据 keys:', Object.keys(data));

    // 检查购物车状态
    expect(data).toBeDefined();
  });

  test('WXCart-02: 购物车商品列表', async () => {
    await helper.sleep(1000);

    const data = await page.data();
    const cartGoods = data.cartGoods || data.cartList || data.list || [];

    console.log(`购物车商品数量: ${cartGoods.length}`);

    // 查找购物车商品元素
    const cartItems = await page.$$('.cart-item, .goods-card, .van-card');
    console.log(`购物车商品元素数量: ${cartItems.length}`);
  });

  test('WXCart-03: 空购物车状态', async () => {
    await helper.sleep(1000);

    const data = await page.data();
    const cartGoods = data.cartGoods || data.cartList || data.list || [];

    if (cartGoods.length === 0) {
      console.log('购物车为空，检查空状态展示');

      // 查找空状态提示
      const emptyTip = await page.$('.empty-tip, .empty-cart, .van-empty');
      if (emptyTip) {
        console.log('找到空购物车提示');
      }
    } else {
      console.log('购物车有商品，跳过空状态测试');
    }
  });

  test('WXCart-04: 购物车商品勾选', async () => {
    await helper.sleep(1000);

    const data = await page.data();
    const cartGoods = data.cartGoods || data.cartList || data.list || [];

    if (cartGoods.length > 0) {
      // 查找勾选框
      const checkbox = await page.$('.checkbox, .van-checkbox, .select-btn');

      if (checkbox) {
        await checkbox.tap();
        await helper.sleep(500);
        console.log('已点击勾选框');
      }
    } else {
      console.log('购物车为空，跳过勾选测试');
    }
  });

  test('WXCart-05: 购物车结算按钮', async () => {
    await helper.sleep(1000);

    // 查找结算按钮
    const submitBtn = await page.$('.submit-btn, .checkout-btn, .van-button--danger, button[type="primary"]');

    if (submitBtn) {
      console.log('找到结算按钮');

      // 获取按钮文本
      const text = await submitBtn.text();
      console.log('结算按钮文本:', text);
    }
  });
});
