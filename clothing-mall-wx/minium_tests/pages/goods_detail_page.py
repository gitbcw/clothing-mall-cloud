"""商品详情页 Page Object"""

import time
from base.base_page import BasePage


class GoodsDetailPage(BasePage):
    """商品详情页"""

    NAV_TITLE = '.nav-title'
    GOODS_TITLE = '.goods-title'
    PRICE_NUM = '.price-num'
    SWIPER_IMAGE = '.swiper-image'
    BTN_CART = '.btn-cart'
    ATTR_ITEM = '.attr-item'
    ISSUE_ITEM = '.issue-item'
    DETAIL_SECTION = '.detail-section'
    UNSHELVED_NOTICE = '.unshelved-notice'
    LOADING_STATE = '.loading-state'
    SKU_PICKER = '.sku-picker'
    SKU_OPTION = '.size-option'
    SKU_BTN_CART = '.sku-picker .btn-cart'
    SKU_BTN_BUY = '.sku-picker .btn-buy'
    SKU_CLOSE = '.sku-close'
    BACK_BTN = '.back-btn'

    def wait_loaded(self, timeout: int = 8) -> bool:
        start = time.time()
        while time.time() - start < timeout:
            loading = self.page.get_element(self.LOADING_STATE)
            if not loading:
                return True
            time.sleep(0.3)
        return self.get_elements_count(self.UNSHELVED_NOTICE) > 0

    def is_unshelved(self) -> bool:
        return self.get_elements_count(self.UNSHELVED_NOTICE) > 0

    def get_goods_name(self) -> str:
        return self.get_text(self.GOODS_TITLE)

    def get_goods_brief(self) -> str:
        el = self.page.get_element('.goods-brief')
        return el.text if el else ''

    def get_price(self) -> str:
        return self.get_text(self.PRICE_NUM)

    def get_image_count(self) -> int:
        return self.get_elements_count(self.SWIPER_IMAGE)

    def has_detail_section(self) -> bool:
        return self.get_elements_count(self.DETAIL_SECTION) > 0

    def has_attr_items(self) -> bool:
        return self.get_elements_count(self.ATTR_ITEM) > 0

    def has_issue_items(self) -> bool:
        return self.get_elements_count(self.ISSUE_ITEM) > 0

    def open_sku_picker(self):
        el = self.page.get_element(self.BTN_CART)
        if el:
            el.click()
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

    def go_back(self):
        self.click(self.BACK_BTN)
