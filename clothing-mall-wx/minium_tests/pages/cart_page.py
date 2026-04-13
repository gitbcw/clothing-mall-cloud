"""购物车 Page Object"""

import time
from base.base_page import BasePage


class CartPage(BasePage):
    """购物车页"""

    NAV_TITLE = '.nav-title'
    EMPTY_CART = '.empty-cart'
    CART_ITEM = '.cart-item'
    RADIO_WRAP = '.radio-wrap'
    CHECKOUT_BAR = '.checkout-bar'
    BTN_CHECKOUT = '.btn-checkout'
    TOTAL_PRICE = '.total-price'
    TOTAL_COUNT = '.total-count'
    STEP_MINUS = '.step-btn.minus'
    STEP_PLUS = '.step-btn.plus'
    TOOLBAR_MANAGE = '.toolbar-right'
    DELETE_BTN = '.delete-btn'
    LOGIN_BTN = '.login-btn'

    def wait_loaded(self, timeout: int = 5) -> bool:
        time.sleep(1)
        return True

    def is_empty(self) -> bool:
        return self.get_elements_count(self.EMPTY_CART) > 0

    def is_need_login(self) -> bool:
        return self.get_elements_count(self.LOGIN_BTN) > 0

    def get_cart_goods_count(self) -> int:
        return self.get_elements_count(self.CART_ITEM)

    def get_total_count_text(self) -> str:
        return self.get_text(self.TOTAL_COUNT)

    def get_total_price(self) -> str:
        return self.get_text(self.TOTAL_PRICE)

    def check_first_item(self):
        """勾选第一个商品"""
        radios = self.page.get_elements(self.RADIO_WRAP)
        if radios:
            radios[0].click()
            time.sleep(0.3)

    def increase_first_item(self):
        """增加第一个商品数量"""
        plus_btns = self.page.get_elements(self.STEP_PLUS)
        if plus_btns:
            plus_btns[0].click()
            time.sleep(0.5)

    def click_checkout(self):
        """点击去结算"""
        self.click(self.BTN_CHECKOUT)
        time.sleep(1)

    def click_first_goods(self):
        """点击第一个商品进入详情"""
        goods_infos = self.page.get_elements('.goods-info')
        if goods_infos:
            goods_infos[0].click()
            time.sleep(1)
