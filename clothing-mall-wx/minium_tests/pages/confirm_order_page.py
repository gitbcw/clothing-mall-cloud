"""确认订单页 Page Object"""

import time
from base.base_page import BasePage


class ConfirmOrderPage(BasePage):
    """确认订单页"""

    NAV_TITLE = '.nav-title'
    ADDRESS_CARD = '.address-card'
    ADDRESS_DETAIL = '.address-detail'
    GOODS_IMG = '.goods-img'
    GOODS_TITLE = '.goods-title'
    GOODS_COUNT = '.goods-count'
    BTN_SUBMIT = '.btn-submit'
    TOTAL_NUM = '.total-num'
    BOTTOM_PRICE = '.bottom-price'
    FEE_ITEM = '.fee-item'
    DELIVERY_TAB = '.delivery-tabs .tab'
    BACK_BTN = '.back-btn'

    def wait_loaded(self, timeout: int = 8) -> bool:
        """等待页面加载（出现提交按钮）"""
        return self.wait_for_element(self.BTN_SUBMIT, timeout)

    def get_total_price(self) -> str:
        return self.get_text(self.BOTTOM_PRICE)

    def has_address(self) -> bool:
        detail = self.get_text(self.ADDRESS_DETAIL)
        return bool(detail and detail != '请选择收货地址')

    def get_goods_count(self) -> int:
        return self.get_elements_count(self.GOODS_IMG)

    def click_submit(self):
        """提交订单"""
        self.click(self.BTN_SUBMIT)
        time.sleep(2)

    def go_back(self):
        self.click(self.BACK_BTN)
