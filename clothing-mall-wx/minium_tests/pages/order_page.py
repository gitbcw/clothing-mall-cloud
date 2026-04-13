"""订单列表页 Page Object"""

import time
from base.base_page import BasePage


class OrderPage(BasePage):
    """订单列表页"""

    NAV_TITLE = '.nav-title'
    TAB_ITEM = '.tab-item'
    ORDER_CARD = '.order-card'
    ORDER_SN = '.order-sn'
    ORDER_STATUS = '.order-status'
    ORDER_TOTAL = '.order-total'
    EMPTY_STATE = '.empty-state'
    BACK_BTN = '.back-btn'

    def wait_loaded(self, timeout: int = 8) -> bool:
        time.sleep(2)
        return True

    def get_tab_count(self) -> int:
        return self.get_elements_count(self.TAB_ITEM)

    def get_tab_text(self, index: int) -> str:
        tabs = self.page.get_elements(self.TAB_ITEM)
        if tabs and len(tabs) > index:
            return tabs[index].text
        return ''

    def click_tab(self, index: int):
        tabs = self.page.get_elements(self.TAB_ITEM)
        if tabs and len(tabs) > index:
            tabs[index].click()
            time.sleep(1.5)

    def get_order_count(self) -> int:
        return self.get_elements_count(self.ORDER_CARD)

    def is_empty(self) -> bool:
        return self.get_elements_count(self.EMPTY_STATE) > 0

    def get_first_order_sn(self) -> str:
        return self.get_text(self.ORDER_SN)

    def get_first_order_status(self) -> str:
        return self.get_text(self.ORDER_STATUS)

    def click_first_order(self):
        self.click(self.ORDER_CARD)

    def go_back(self):
        self.click(self.BACK_BTN)
