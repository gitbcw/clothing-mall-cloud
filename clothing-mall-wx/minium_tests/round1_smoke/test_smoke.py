"""第一轮：冒烟测试
覆盖：首页、分类页、商品详情、购物车、订单列表、用户中心

测试期间 conftest.py 会临时禁用自定义 TabBar，
让 minium 的 switch_tab 正常工作。
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
from pages.order_page import OrderPage
from pages.mine_page import MinePage


class SmokeTest(minium.MiniTest):
    """小程序冒烟测试"""

    def _switch_tab(self, path, wait=4):
        """切换 TabBar 页面"""
        self.mini.app.switch_tab(path)
        time.sleep(wait)

    def _nav(self, path, wait=2):
        """navigate_to 非 TabBar 页面"""
        self.mini.app.navigate_to(path)
        time.sleep(wait)

    def _back(self, wait=1):
        """返回上一页"""
        self.mini.app.navigate_back()
        time.sleep(wait)

    # ===== 首页 =====

    def test_01_index_page_load(self):
        """IX-01: 首页加载"""
        page = IndexPage(self.mini)
        page.refresh_page()
        page.wait_for_data_loaded(timeout=15)

    def test_02_index_banner(self):
        """IX-01: 首页轮播图"""
        page = IndexPage(self.mini)
        page.refresh_page()
        time.sleep(2)
        has_banner = page.has_banners()
        print(f'  轮播图存在: {has_banner}')

    def test_03_index_activity_goods(self):
        """IX-04: 活动位商品"""
        page = IndexPage(self.mini)
        page.refresh_page()
        time.sleep(2)
        count = page.get_activity_goods_count()
        print(f'  活动位商品数: {count}')
        self.assertGreater(count, 0, '活动位无商品')

    def test_04_index_hot_sales(self):
        """IX-03: 热销推荐"""
        page = IndexPage(self.mini)
        page.refresh_page()
        time.sleep(2)
        count = page.get_hot_sales_count()
        print(f'  热销推荐商品数: {count}')
        self.assertGreater(count, 0, '热销推荐无商品')

    # ===== 分类页 =====

    def test_05_category_page_load(self):
        """IX-02: 分类页加载"""
        self._switch_tab('/pages/category/category', 5)
        page = CategoryPage(self.mini)
        page.refresh_page()
        time.sleep(3)
        cat_count = page.get_category_count()
        print(f'  分类数量: {cat_count}')
        self.assertGreater(cat_count, 0, '分类列表为空')

    def test_06_category_goods(self):
        """分类页商品列表"""
        page = CategoryPage(self.mini)
        page.refresh_page()
        time.sleep(2)
        goods_count = page.get_goods_count()
        print(f'  当前分类商品数: {goods_count}')

    # ===== 商品详情 =====

    def test_07_goods_detail_load(self):
        """GD-01: 商品详情加载"""
        page = CategoryPage(self.mini)
        page.refresh_page()
        page.click_first_goods()
        time.sleep(3)

        detail = GoodsDetailPage(self.mini)
        detail.refresh_page()
        time.sleep(1)

        name = detail.get_goods_name()
        self.assertTrue(len(name) > 0, '商品名称为空')
        print(f'  商品名称: {name}')

    def test_08_goods_detail_price(self):
        """GD-02: 商品价格"""
        detail = GoodsDetailPage(self.mini)
        detail.refresh_page()
        price = detail.get_price()
        self.assertTrue(len(price) > 0, '商品价格为空')
        print(f'  商品价格: {price}')

    # ===== 购物车 =====

    def test_09_cart_page_load(self):
        """CT-01: 购物车页面"""
        self._back(1)
        self._switch_tab('/pages/cart/cart', 5)
        cart = CartPage(self.mini)
        cart.refresh_page()
        time.sleep(3)
        count = cart.get_cart_goods_count()
        print(f'  购物车商品数: {count}')

    # ===== 用户中心 =====

    def test_10_mine_page_load(self):
        """UC-01: 用户中心"""
        self._switch_tab('/pages/mine/mine', 5)
        mine = MinePage(self.mini)
        mine.refresh_page()
        time.sleep(3)
        self.assertTrue(mine.has_order_section(), '缺少订单入口')

    def test_11_mine_menu_items(self):
        """UC-01: 功能菜单"""
        mine = MinePage(self.mini)
        mine.refresh_page()
        menu_count = mine.get_elements_count('.menu-item')
        self.assertGreater(menu_count, 0, '功能菜单为空')
        print(f'  菜单项数量: {menu_count}')

    # ===== 订单列表（非 TabBar 页面） =====

    def test_12_order_page_load(self):
        """OL-02: 订单列表"""
        self._nav('/pages/order/order', 5)
        order = OrderPage(self.mini)
        order.refresh_page()
        time.sleep(3)
        tab_count = order.get_tab_count()
        self.assertGreater(tab_count, 0, '订单 Tab 为空')
        print(f'  Tab 数量: {tab_count}')

    def test_13_order_tab_switch(self):
        """OL-02: 订单 Tab 切换"""
        order = OrderPage(self.mini)
        order.refresh_page()
        for i in range(min(order.get_tab_count(), 5)):
            order.click_tab(i)
            time.sleep(1)
        print(f'  Tab 切换完成')
