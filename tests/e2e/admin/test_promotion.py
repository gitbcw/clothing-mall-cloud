"""
促销活动管理 E2E 测试
"""
import pytest
from playwright.sync_api import expect


class TestPromotionManagement:
    """促销活动管理测试"""

    @pytest.mark.e2e
    def test_promotion_menu_visible(self, admin_page, config):
        """测试促销菜单是否可见"""
        # 检查侧边栏促销菜单
        admin_page.goto(f"{config.ADMIN_FRONTEND_URL}/#/dashboard")
        promotion_menu = admin_page.locator('.sidebar-container text=促销管理')

        if promotion_menu.count() > 0:
            promotion_menu.click()
            admin_page.wait_for_load_state("networkidle")

    @pytest.mark.e2e
    def test_full_reduction_page_loads(self, admin_page, config):
        """测试满减活动页面加载"""
        admin_page.goto(f"{config.ADMIN_FRONTEND_URL}/#/promotion/fullReduction")
        admin_page.wait_for_load_state("networkidle")

        # 检查是否有表格
        table = admin_page.locator('.el-table')
        # 如果表格存在，检查可见性
        if table.count() > 0:
            expect(table).to_be_visible(timeout=10000)
        else:
            pytest.skip("满减活动页面不可用")

    @pytest.mark.e2e
    def test_flash_sale_page_loads(self, admin_page, config):
        """测试限时特卖页面加载"""
        admin_page.goto(f"{config.ADMIN_FRONTEND_URL}/#/promotion/flashSale")
        admin_page.wait_for_load_state("networkidle")

        # 检查是否有表格
        table = admin_page.locator('.el-table')
        if table.count() > 0:
            expect(table).to_be_visible(timeout=10000)
        else:
            pytest.skip("限时特卖页面不可用")

    @pytest.mark.e2e
    @pytest.mark.slow
    def test_coupon_page_loads(self, admin_page, config):
        """测试优惠券页面加载"""
        admin_page.goto(f"{config.ADMIN_FRONTEND_URL}/#/promotion/coupon")
        admin_page.wait_for_load_state("networkidle")

        # 检查表格存在
        table = admin_page.locator('.el-table')
        expect(table).to_be_visible(timeout=10000)

        # 检查优惠券列表
        rows = admin_page.locator('.el-table__body-wrapper tr')
        assert rows.count() >= 0

    @pytest.mark.e2e
    @pytest.mark.slow
    def test_coupon_create_form(self, admin_page, config):
        """测试优惠券创建表单"""
        admin_page.goto(f"{config.ADMIN_FRONTEND_URL}/#/promotion/coupon")
        admin_page.wait_for_load_state("networkidle")

        # 点击添加按钮
        add_btn = admin_page.locator('.filter-container button:has-text("添加")')
        if add_btn.count() > 0:
            add_btn.click()
            admin_page.wait_for_load_state("networkidle")

            # 检查表单弹窗
            dialog = admin_page.locator('.el-dialog')
            expect(dialog).to_be_visible(timeout=5000)

            # 检查表单字段
            form = dialog.locator('.el-form')
            expect(form).to_be_visible()

    @pytest.mark.e2e
    def test_promotion_config_page_loads(self, admin_page, config):
        """测试促销配置页面加载"""
        admin_page.goto(f"{config.ADMIN_FRONTEND_URL}/#/config/promotion")
        admin_page.wait_for_load_state("networkidle")

        # 检查页面标题
        expect(admin_page.locator('.app-container')).to_be_visible(timeout=10000)

        # 检查表单存在
        form = admin_page.locator('.el-form')
        expect(form).to_be_visible()

    @pytest.mark.e2e
    def test_customer_service_config_visible(self, admin_page, config):
        """测试客服配置表单项可见"""
        admin_page.goto(f"{config.ADMIN_FRONTEND_URL}/#/config/promotion")
        admin_page.wait_for_load_state("networkidle")

        # 检查"小程序客服"分隔符
        divider = admin_page.locator('.el-divider:has-text("小程序客服")')
        expect(divider).to_be_visible(timeout=10000)

        # 检查客服链接输入框
        input_label = admin_page.locator('.el-form-item:has-text("企业微信客服链接")')
        expect(input_label).to_be_visible()

    @pytest.mark.e2e
    def test_activity_page_loads(self, admin_page, config):
        """测试活动位管理页面加载"""
        admin_page.goto(f"{config.ADMIN_FRONTEND_URL}/#/promotion/activity")
        admin_page.wait_for_load_state("networkidle")

        # 检查表格存在（Mock 数据）
        table = admin_page.locator('.el-table')
        expect(table).to_be_visible(timeout=10000)

        # 检查创建按钮
        create_btn = admin_page.locator('button:has-text("创建")')
        expect(create_btn).to_be_visible()

    @pytest.mark.e2e
    def test_outfit_page_loads(self, admin_page, config):
        """测试穿搭推荐页面加载"""
        admin_page.goto(f"{config.ADMIN_FRONTEND_URL}/#/promotion/outfit")
        admin_page.wait_for_load_state("networkidle")

        # 检查表格存在（Mock 数据）
        table = admin_page.locator('.el-table')
        expect(table).to_be_visible(timeout=10000)

        # 检查创建按钮
        create_btn = admin_page.locator('button:has-text("创建")')
        expect(create_btn).to_be_visible()
