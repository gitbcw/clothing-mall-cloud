"""分类页 Page Object"""

import time
from base.base_page import BasePage


class CategoryPage(BasePage):
    """商品分类页"""

    NAV_TITLE = '.nav-title'
    CATEGORY_ITEM = '.category-item'
    CATEGORY_ACTIVE = '.category-item.active'
    GOODS_CARD = '.goods-card'
    SEARCH_BAR = '.search-bar'

    def wait_loaded(self, timeout: int = 8) -> bool:
        return self.wait_for_data_loaded(timeout)

    def get_nav_title(self) -> str:
        return self.get_text(self.NAV_TITLE)

    def get_category_count(self) -> int:
        return self.get_elements_count(self.CATEGORY_ITEM)

    def get_active_category_name(self) -> str:
        el = self.page.get_element(self.CATEGORY_ACTIVE)
        return el.text if el else ''

    def get_goods_count(self) -> int:
        return self.get_elements_count(self.GOODS_CARD)

    def click_category_by_index(self, index: int):
        items = self.page.get_elements(self.CATEGORY_ITEM)
        if items and len(items) > index:
            items[index].click()
            time.sleep(1)

    def click_first_goods(self):
        self.click(self.GOODS_CARD)
