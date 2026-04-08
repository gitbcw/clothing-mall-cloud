"""
E2E 测试配置和 fixtures
"""
import pytest
from playwright.sync_api import Page, BrowserContext, expect
from typing import Optional


class AdminPage:
    """管理后台页面基类"""

    def __init__(self, page: Page, base_url: str):
        self.page = page
        self.base_url = base_url.rstrip("/#")

    def goto(self, path: str = ""):
        """跳转到指定路径"""
        url = f"{self.base_url}/#{path}"
        self.page.goto(url)
        self.page.wait_for_load_state("networkidle")


class LoginPage(AdminPage):
    """登录页面"""

    def login(self, username: str, password: str):
        """执行登录"""
        self.goto("/login")

        # 等待登录表单加载
        self.page.wait_for_selector('.login-form', timeout=10000)

        # 填写用户名密码 - 使用 name 属性定位
        username_input = self.page.locator('input[name="username"]')
        password_input = self.page.locator('input[name="password"]')

        # 清空并填写
        username_input.fill(username)
        password_input.fill(password)

        # 点击登录按钮
        self.page.click('.login-form button.el-button--primary')
        self.page.wait_for_load_state("networkidle")

        # 等待跳转
        self.page.wait_for_timeout(2000)

    def is_logged_in(self) -> bool:
        """检查是否已登录"""
        # 检查是否还在登录页
        return "/login" not in self.page.url

    def get_error_message(self) -> Optional[str]:
        """获取错误消息"""
        error_el = self.page.locator('.el-message--error')
        if error_el.count() > 0:
            return error_el.text_content()
        return None


class DashboardPage(AdminPage):
    """工作台页面"""

    def goto(self):
        """跳转到工作台"""
        super().goto("/dashboard")

    def get_statistics(self) -> dict:
        """获取统计数据"""
        # 等待数据加载
        self.page.wait_for_selector('.panel-group', timeout=10000)

        return {
            "total_users": self.page.locator('.card-panel-text').nth(0).text_content() if self.page.locator('.card-panel-text').count() > 0 else None
        }


class GoodsPage(AdminPage):
    """商品管理页面"""

    def goto(self):
        """跳转到商品管理"""
        super().goto("/mall/goods")

    def get_goods_list(self) -> list:
        """获取商品列表"""
        self.page.wait_for_selector('.el-table__body-wrapper', timeout=10000)
        rows = self.page.locator('.el-table__body-wrapper tr')
        return [rows.nth(i).text_content() for i in range(rows.count())]

    def search_goods(self, keyword: str):
        """搜索商品"""
        search_input = self.page.locator('input[placeholder*="商品"]').first
        if search_input.count() == 0:
            search_input = self.page.locator('.filter-container input').first

        search_input.fill(keyword)

        # 点击搜索按钮
        self.page.click('.filter-container button.el-button--primary')
        self.page.wait_for_load_state("networkidle")


class OrderPage(AdminPage):
    """订单管理页面"""

    def goto(self):
        """跳转到订单管理"""
        super().goto("/mall/order")

    def get_order_count(self) -> int:
        """获取订单数量"""
        self.page.wait_for_selector('.el-table__body-wrapper', timeout=10000)
        return self.page.locator('.el-table__body-wrapper tr').count()

    def filter_by_status(self, status: str):
        """按状态筛选订单"""
        # 点击状态筛选
        self.page.click(f'text={status}')
        self.page.wait_for_load_state("networkidle")

    def ship_order(self, order_id: int, ship_channel: str, ship_sn: str):
        """发货操作"""
        # 找到订单行
        rows = self.page.locator('.el-table__body-wrapper tr')
        for i in range(rows.count()):
            row = rows.nth(i)
            if str(order_id) in row.text_content():
                # 点击发货按钮
                ship_btn = row.locator('button:has-text("发货")')
                if ship_btn.count() > 0:
                    ship_btn.click()
                    self.page.wait_for_timeout(500)

                    # 填写发货信息
                    channel_select = self.page.locator('.el-dialog .el-select').first
                    if channel_select.count() > 0:
                        channel_select.click()
                        self.page.wait_for_timeout(300)
                        self.page.click(f'.el-select-dropdown__item:has-text("{ship_channel}")')

                    sn_input = self.page.locator('.el-dialog input[placeholder*="单号"]')
                    if sn_input.count() > 0:
                        sn_input.fill(ship_sn)

                    # 确认发货
                    self.page.click('.el-dialog button.el-button--primary')
                    self.page.wait_for_load_state("networkidle")
                    return True
        return False


class AftersalePage(AdminPage):
    """售后管理页面"""

    def goto(self):
        """跳转到售后管理"""
        super().goto("/mall/aftersale")

    def get_aftersale_list(self) -> list:
        """获取售后列表"""
        self.page.wait_for_selector('.el-table__body-wrapper', timeout=10000)
        rows = self.page.locator('.el-table__body-wrapper tr')
        return [rows.nth(i).text_content() for i in range(rows.count())]

    def approve_aftersale(self, aftersale_id: int):
        """审核通过售后"""
        rows = self.page.locator('.el-table__body-wrapper tr')
        for i in range(rows.count()):
            row = rows.nth(i)
            if str(aftersale_id) in row.text_content():
                approve_btn = row.locator('button:has-text("通过")')
                if approve_btn.count() > 0:
                    approve_btn.click()
                    self.page.wait_for_load_state("networkidle")
                    return True
        return False


class CouponPage(AdminPage):
    """优惠券管理页面"""

    def goto(self):
        """跳转到优惠券管理"""
        super().goto("/promotion/coupon")

    def create_coupon(self, name: str, discount: float, min_amount: float):
        """创建优惠券"""
        # 点击新增按钮
        add_btn = self.page.locator('.filter-container button:has-text("添加")')
        if add_btn.count() > 0:
            add_btn.click()
            self.page.wait_for_load_state("networkidle")

            # 填写表单
            name_input = self.page.locator('.el-dialog input[placeholder*="名称"]')
            if name_input.count() > 0:
                name_input.fill(name)

            # 保存
            self.page.click('.el-dialog button.el-button--primary')
            self.page.wait_for_load_state("networkidle")
            return True
        return False


class FlashSalePage(AdminPage):
    """限时特卖页面"""

    def goto(self):
        """跳转到限时特卖"""
        super().goto("/promotion/flashSale")

    def get_flash_sale_list(self) -> list:
        """获取限时特卖列表"""
        self.page.wait_for_selector('.el-table__body-wrapper', timeout=10000)
        rows = self.page.locator('.el-table__body-wrapper tr')
        return [rows.nth(i).text_content() for i in range(rows.count())]


class FullReductionPage(AdminPage):
    """满减活动页面"""

    def goto(self):
        """跳转到满减活动"""
        super().goto("/promotion/fullReduction")

    def get_full_reduction_list(self) -> list:
        """获取满减活动列表"""
        self.page.wait_for_selector('.el-table__body-wrapper', timeout=10000)
        rows = self.page.locator('.el-table__body-wrapper tr')
        return [rows.nth(i).text_content() for i in range(rows.count())]


class UserPage(AdminPage):
    """会员管理页面"""

    def goto(self):
        """跳转到会员管理"""
        super().goto("/user/user")

    def get_user_count(self) -> int:
        """获取会员数量"""
        self.page.wait_for_selector('.el-table__body-wrapper', timeout=10000)
        return self.page.locator('.el-table__body-wrapper tr').count()

    def search_user(self, keyword: str):
        """搜索会员"""
        search_input = self.page.locator('.filter-container input').first
        if search_input.count() > 0:
            search_input.fill(keyword)
            self.page.click('.filter-container button.el-button--primary')
            self.page.wait_for_load_state("networkidle")


class StatisticsPage(AdminPage):
    """数据统计页面"""

    def goto(self):
        """跳转到数据统计"""
        super().goto("/stat/user")

    def get_statistics_data(self) -> dict:
        """获取统计数据"""
        self.page.wait_for_selector('.el-card', timeout=10000)
        return {
            "cards": self.page.locator('.el-card').count()
        }


class ConfigPage(AdminPage):
    """系统设置页面"""

    def goto(self):
        """跳转到系统设置（商城配置）"""
        super().goto("/config/mall")

    def goto_express_config(self):
        """跳转到运费配置"""
        super().goto("/config/express")

    def goto_promotion_config(self):
        """跳转到促销配置"""
        super().goto("/config/promotion")


# ==================== Fixtures ====================

@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    """浏览器上下文配置"""
    return {
        **browser_context_args,
        "viewport": {"width": 1920, "height": 1080},
        "locale": "zh-CN",
    }


@pytest.fixture(scope="function")
def admin_page(page, config):
    """已登录的管理后台页面"""
    login_page = LoginPage(page, config.ADMIN_FRONTEND_URL)
    login_page.login(config.ADMIN_USERNAME, config.ADMIN_PASSWORD)

    # 验证登录成功
    assert login_page.is_logged_in(), "登录失败"

    yield page


@pytest.fixture
def login_page(page, config) -> LoginPage:
    """登录页面"""
    return LoginPage(page, config.ADMIN_FRONTEND_URL)


@pytest.fixture
def goods_page(admin_page, config) -> GoodsPage:
    """商品页面（已登录）"""
    goods_page = GoodsPage(admin_page, config.ADMIN_FRONTEND_URL)
    goods_page.goto()
    return goods_page


@pytest.fixture
def order_page(admin_page, config) -> OrderPage:
    """订单页面（已登录）"""
    order_page = OrderPage(admin_page, config.ADMIN_FRONTEND_URL)
    order_page.goto()
    return order_page


@pytest.fixture
def aftersale_page(admin_page, config) -> AftersalePage:
    """售后页面（已登录）"""
    aftersale_page = AftersalePage(admin_page, config.ADMIN_FRONTEND_URL)
    aftersale_page.goto()
    return aftersale_page


@pytest.fixture
def coupon_page(admin_page, config) -> CouponPage:
    """优惠券页面（已登录）"""
    coupon_page = CouponPage(admin_page, config.ADMIN_FRONTEND_URL)
    coupon_page.goto()
    return coupon_page


@pytest.fixture
def flash_sale_page(admin_page, config) -> FlashSalePage:
    """限时特卖页面（已登录）"""
    flash_sale_page = FlashSalePage(admin_page, config.ADMIN_FRONTEND_URL)
    flash_sale_page.goto()
    return flash_sale_page


@pytest.fixture
def full_reduction_page(admin_page, config) -> FullReductionPage:
    """满减活动页面（已登录）"""
    full_reduction_page = FullReductionPage(admin_page, config.ADMIN_FRONTEND_URL)
    full_reduction_page.goto()
    return full_reduction_page


@pytest.fixture
def user_page(admin_page, config) -> UserPage:
    """会员管理页面（已登录）"""
    user_page = UserPage(admin_page, config.ADMIN_FRONTEND_URL)
    user_page.goto()
    return user_page


@pytest.fixture
def statistics_page(admin_page, config) -> StatisticsPage:
    """数据统计页面（已登录）"""
    statistics_page = StatisticsPage(admin_page, config.ADMIN_FRONTEND_URL)
    statistics_page.goto()
    return statistics_page


@pytest.fixture
def config_page(admin_page, config) -> ConfigPage:
    """系统设置页面（已登录）"""
    config_page = ConfigPage(admin_page, config.ADMIN_FRONTEND_URL)
    config_page.goto()
    return config_page
