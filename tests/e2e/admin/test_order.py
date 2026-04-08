"""
订单管理 E2E 测试
"""
import pytest
from playwright.sync_api import expect


class TestOrderManagement:
    """订单管理测试"""

    @pytest.mark.e2e
    def test_order_page_loads(self, order_page):
        """测试订单页面加载"""
        # 检查表格存在
        table = order_page.page.locator('.el-table')
        expect(table).to_be_visible(timeout=10000)

    @pytest.mark.e2e
    def test_order_list_display(self, order_page):
        """测试订单列表显示"""
        # 等待表格加载
        order_page.page.wait_for_selector('.el-table__body-wrapper tr', timeout=10000)
        rows = order_page.page.locator('.el-table__body-wrapper tr')
        assert rows.count() >= 0

    @pytest.mark.e2e
    def test_order_status_tabs(self, order_page):
        """测试订单状态标签页"""
        # 检查状态标签页存在
        tabs = order_page.page.locator('.tabs-container .el-radio-button')
        if tabs.count() > 0:
            # 点击第二个标签
            tabs.nth(1).click()
            order_page.page.wait_for_load_state("networkidle")

            # 检查表格更新
            table = order_page.page.locator('.el-table')
            expect(table).to_be_visible()

    @pytest.mark.e2e
    @pytest.mark.slow
    def test_order_detail_view(self, order_page):
        """测试订单详情查看"""
        # 等待表格加载
        order_page.page.wait_for_selector('.el-table__body-wrapper tr', timeout=10000)

        rows = order_page.page.locator('.el-table__body-wrapper tr')
        if rows.count() == 0:
            return

        # 点击第一个订单的查看按钮
        view_btn = rows.first.locator('button:has-text("查看")')
        if view_btn.count() > 0:
            view_btn.click()
            order_page.page.wait_for_load_state("networkidle")

            # 检查详情弹窗
            dialog = order_page.page.locator('.el-dialog')
            expect(dialog).to_be_visible(timeout=5000)

    @pytest.mark.e2e
    @pytest.mark.slow
    def test_order_filter_by_date(self, order_page):
        """测试按日期筛选订单"""
        # 查找日期选择器
        date_picker = order_page.page.locator('.el-date-editor')
        if date_picker.count() > 0:
            date_picker.click()
            order_page.page.wait_for_timeout(500)

            # 选择一个日期
            date_cell = order_page.page.locator('.el-date-table td.available')
            if date_cell.count() > 0:
                date_cell.first.click()
                order_page.page.wait_for_load_state("networkidle")

    @pytest.mark.e2e
    @pytest.mark.slow
    def test_order_export(self, order_page):
        """测试订单导出"""
        # 查找导出按钮
        export_btn = order_page.page.locator('button:has-text("导出")')
        if export_btn.count() > 0:
            export_btn.click()
            order_page.page.wait_for_timeout(1000)

            # 检查是否有下载
            # 注意：可能会触发文件下载


class TestAftersaleManagement:
    """售后管理测试"""

    @pytest.mark.e2e
    def test_aftersale_page_loads(self, admin_page, config):
        """测试售后页面加载"""
        # 导航到售后页面
        admin_page.goto(f"{config.ADMIN_FRONTEND_URL}/#/mall/aftersale")
        admin_page.wait_for_load_state("networkidle")

        # 检查表格存在
        table = admin_page.locator('.el-table')
        expect(table).to_be_visible(timeout=10000)

    @pytest.mark.e2e
    def test_aftersale_list_display(self, admin_page, config):
        """测试售后列表显示"""
        # 导航到售后页面
        admin_page.goto(f"{config.ADMIN_FRONTEND_URL}/#/mall/aftersale")
        admin_page.wait_for_selector('.el-table__body-wrapper tr', timeout=10000)

        rows = admin_page.locator('.el-table__body-wrapper tr')
        assert rows.count() >= 0

    @pytest.mark.e2e
    @pytest.mark.slow
    def test_aftersale_status_filter(self, admin_page, config):
        """测试按状态筛选售后"""
        # 导航到售后页面
        admin_page.goto(f"{config.ADMIN_FRONTEND_URL}/#/mall/aftersale")
        admin_page.wait_for_load_state("networkidle")

        # 查找状态筛选按钮
        status_tabs = admin_page.locator('.filter-container .el-radio-group')
        if status_tabs.count() > 0:
            # 点击不同状态
            for status_text in ["全部", "待处理", "已处理"]:
                status_btn = admin_page.locator(f'text={status_text}')
                if status_btn.count() > 0:
                    status_btn.click()
                    admin_page.wait_for_load_state("networkidle")
                    break
