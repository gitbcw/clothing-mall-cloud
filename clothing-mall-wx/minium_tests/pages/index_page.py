"""首页 Page Object"""

import time
from base.base_page import BasePage


class IndexPage(BasePage):
    """首页"""

    NAV_TITLE = '.nav-title'
    BANNER_SLIDE = '.banner-slide'
    ACTIVITY_ITEM = '.activity-item'
    HOT_ITEM = '.hot-item'
    GRID_ITEM = '.grid-item'
    SKU_PICKER = '.sku-picker'
    SKU_OPTION = '.size-option'
    SKU_BTN_CART = '.sku-picker .btn-cart'
    SKU_BTN_BUY = '.sku-picker .btn-buy'
    SKU_CLOSE = '.sku-close'

    def wait_loaded(self, timeout: int = 10) -> bool:
        return self.wait_for_data_loaded(timeout)

    def get_nav_title(self) -> str:
        return self.get_text(self.NAV_TITLE)

    def has_banners(self) -> bool:
        return self.get_elements_count(self.BANNER_SLIDE) > 0

    def has_activity_goods(self) -> bool:
        return self.get_elements_count(self.ACTIVITY_ITEM) > 0

    def has_hot_sales(self) -> bool:
        return self.get_elements_count(self.HOT_ITEM) > 0

    def has_grid_goods(self) -> bool:
        return self.get_elements_count(self.GRID_ITEM) > 0

    def get_activity_goods_count(self) -> int:
        return self.get_elements_count(self.ACTIVITY_ITEM)

    def get_hot_sales_count(self) -> int:
        return self.get_elements_count(self.HOT_ITEM)

    def click_first_activity_goods(self):
        self.click(self.ACTIVITY_ITEM)

    def click_first_hot_sale(self):
        self.click(self.HOT_ITEM)

    def click_first_grid_goods(self):
        self.click(self.GRID_ITEM)

    def open_sku_picker_via_activity(self, index: int = 0):
        cart_icons = self.page.get_elements('.activity-scroll .cart-icon-small')
        if cart_icons and len(cart_icons) > index:
            cart_icons[index].click()
            time.sleep(1)

    def is_sku_picker_visible(self) -> bool:
        return self.get_elements_count(self.SKU_PICKER) > 0

    def select_first_size(self):
        sizes = self.page.get_elements(self.SKU_OPTION)
        if sizes:
            sizes[0].click()
            time.sleep(0.3)

    def click_sku_add_to_cart(self):
        self.click(self.SKU_BTN_CART)
        time.sleep(1)

    def click_sku_buy_now(self):
        self.click(self.SKU_BTN_BUY)
        time.sleep(1)

    def close_sku_picker(self):
        el = self.page.get_element(self.SKU_CLOSE)
        if el:
            el.click()
            time.sleep(0.3)
