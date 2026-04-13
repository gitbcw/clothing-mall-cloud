"""我的页面 Page Object"""

import time
from base.base_page import BasePage


class MinePage(BasePage):
    """我的页面"""

    NICKNAME = '.nickname'
    LOGIN_STATUS = '.status'
    ORDER_ITEM = '.order-item'
    BADGE = '.badge'
    STATS_ITEM = '.stats-item'
    MENU_ITEM = '.menu-item'
    MANAGER_ENTRY = '.manager-entry'

    def wait_loaded(self, timeout: int = 5) -> bool:
        time.sleep(1)
        return True

    def get_nickname(self) -> str:
        return self.get_text(self.NICKNAME)

    def is_logged_in(self) -> str:
        return self.get_text(self.LOGIN_STATUS) == '已登录'

    def has_order_section(self) -> bool:
        return self.get_elements_count(self.ORDER_ITEM) > 0

    def has_manager_entry(self) -> bool:
        return self.get_elements_count(self.MANAGER_ENTRY) > 0

    def get_order_badge_count(self, index: int) -> int:
        badges = self.page.get_elements(self.BADGE)
        if badges and len(badges) > index:
            try:
                return int(badges[index].text)
            except (ValueError, TypeError):
                return 0
        return 0

    def click_order_all(self):
        """点击「全部订单」"""
        self.click('.card-header')

    def click_order_tab(self, index: int):
        items = self.page.get_elements(self.ORDER_ITEM)
        if items and len(items) > index:
            items[index].click()
            time.sleep(1)
