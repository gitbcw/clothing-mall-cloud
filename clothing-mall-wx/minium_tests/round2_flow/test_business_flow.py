"""第二轮：核心业务流程测试
覆盖：浏览商品 → 选择SKU → 加入购物车 → 结算 → 下单 → 订单确认

注意：小程序使用自定义 TabBar，统一用 navigate_to
"""

import minium
import time
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from pages.index_page import IndexPage
from pages.category_page import CategoryPage
from pages.goods_detail_page import GoodsDetailPage
from pages.cart_page import CartPage
from pages.confirm_order_page import ConfirmOrderPage
from pages.order_page import OrderPage
from pages.mine_page import MinePage


class BusinessFlowTest(minium.MiniTest):
    """核心业务流程测试"""

    def _nav(self, path, wait=2):
        self.mini.app.navigate_to(path)
        time.sleep(wait)

    def _back(self, wait=1):
        self.mini.app.navigate_back()
        time.sleep(wait)

    def test_01_navigate_to_index(self):
        """浏览首页（当前页面）"""
        page = IndexPage(self.mini)
        page.refresh_page()
        page.wait_for_data_loaded(timeout=15)

    def test_02_enter_goods_detail(self):
        """从活动位进入商品详情"""
        page = IndexPage(self.mini)
        page.refresh_page()
        time.sleep(2)
        page.click_first_activity_goods()
        time.sleep(3)

        detail = GoodsDetailPage(self.mini)
        detail.refresh_page()
        time.sleep(1)

        name = detail.get_goods_name()
        self.assertTrue(len(name) > 0, '商品名称为空')
        print(f'  进入商品: {name}')

    def test_03_check_goods_info(self):
        """验证商品信息"""
        detail = GoodsDetailPage(self.mini)
        detail.refresh_page()

        name = detail.get_goods_name()
        price = detail.get_price()
        img_count = detail.get_image_count()

        self.assertTrue(len(name) > 0, '商品名称为空')
        self.assertTrue(len(price) > 0, '商品价格为空')
        self.assertGreater(img_count, 0, '商品图片为空')
        print(f'  {name} | ￥{price} | {img_count}张图')

    def test_04_add_to_cart(self):
        """打开 SKU 选择器，加入购物车"""
        detail = GoodsDetailPage(self.mini)
        detail.refresh_page()

        detail.open_sku_picker()
        time.sleep(1.5)

        visible = detail.is_sku_picker_visible()
        self.assertTrue(visible, 'SKU 选择器未弹出')

        detail.select_first_size()
        time.sleep(0.5)
        detail.click_sku_add_to_cart()
        time.sleep(2)

    def test_05_verify_cart(self):
        """购物车验证"""
        self._back(1)
        self._nav('/pages/cart/cart', 3)
        cart = CartPage(self.mini)
        cart.refresh_page()
        time.sleep(2)

        count = cart.get_cart_goods_count()
        self.assertGreater(count, 0, '购物车为空，添加商品失败')
        print(f'  购物车商品数: {count}')

    def test_06_select_and_checkout(self):
        """勾选商品去结算"""
        cart = CartPage(self.mini)
        cart.refresh_page()
        cart.check_first_item()
        time.sleep(0.5)

        price = cart.get_total_price()
        print(f'  合计: {price}')

        cart.click_checkout()
        time.sleep(3)

    def test_07_confirm_order_page(self):
        """确认订单页"""
        confirm = ConfirmOrderPage(self.mini)
        confirm.refresh_page()
        time.sleep(2)

        goods_count = confirm.get_goods_count()
        self.assertGreater(goods_count, 0, '确认订单页无商品')
        print(f'  订单商品数: {goods_count}')

    def test_08_order_price(self):
        """确认订单金额"""
        confirm = ConfirmOrderPage(self.mini)
        confirm.refresh_page()
        price = confirm.get_total_price()
        self.assertTrue(len(price) > 0, '订单金额为空')
        print(f'  实付金额: {price}')

    def test_09_submit_order(self):
        """提交订单"""
        confirm = ConfirmOrderPage(self.mini)
        confirm.refresh_page()
        confirm.click_submit()
        time.sleep(3)

    def test_10_check_order_created(self):
        """验证订单已创建"""
        self._nav('/pages/order/order', 3)
        order = OrderPage(self.mini)
        order.refresh_page()
        time.sleep(2)

        order.click_tab(0)
        time.sleep(2)
        order.refresh_page()

        count = order.get_order_count()
        print(f'  待付款订单数: {count}')
        self.assertGreater(count, 0, '待付款订单为空')

    def test_11_order_detail(self):
        """查看订单详情"""
        order = OrderPage(self.mini)
        order.refresh_page()
        order.click_first_order()
        time.sleep(2)
