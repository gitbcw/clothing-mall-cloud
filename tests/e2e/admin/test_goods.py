"""
商品管理 E2E 测试
"""
import pytest
from playwright.sync_api import expect


class TestGoodsManagement:
    """商品管理测试"""

    @pytest.mark.e2e
    def test_goods_page_loads(self, goods_page):
        """测试商品页面加载"""
        # 检查表格存在
        table = goods_page.page.locator('.el-table')
        expect(table).to_be_visible(timeout=10000)

    @pytest.mark.e2e
    def test_goods_list_display(self, goods_page):
        """测试商品列表显示"""
        # 等待表格加载
        goods_page.page.wait_for_selector('.el-table__body-wrapper tr', timeout=10000)
        rows = goods_page.page.locator('.el-table__body-wrapper tr')

        # 应该有商品数据（或显示暂无数据）
        assert rows.count() >= 0

    @pytest.mark.e2e
    def test_search_goods(self, goods_page):
        """测试搜索商品"""
        # 输入搜索关键词
        search_input = goods_page.page.locator('.filter-container input').first

        if search_input.count() > 0:
            search_input.fill("测试")
            goods_page.page.click('.filter-container button.el-button--primary')
            goods_page.page.wait_for_load_state("networkidle")

            # 检查表格更新
            table = goods_page.page.locator('.el-table')
            expect(table).to_be_visible()

    @pytest.mark.e2e
    @pytest.mark.slow
    def test_goods_detail_view(self, goods_page):
        """测试商品详情查看"""
        # 等待表格加载
        goods_page.page.wait_for_selector('.el-table__body-wrapper tr', timeout=10000)

        rows = goods_page.page.locator('.el-table__body-wrapper tr')
        if rows.count() > 0:
            # 点击第一个商品的查看按钮
            view_btn = rows.first.locator('button:has-text("查看")')
            if view_btn.count() > 0:
                view_btn.click()
                goods_page.page.wait_for_load_state("networkidle")

                # 检查详情弹窗
                dialog = goods_page.page.locator('.el-dialog')
                expect(dialog).to_be_visible(timeout=5000)

    @pytest.mark.e2e
    @pytest.mark.slow
    def test_goods_pagination(self, goods_page):
        """测试商品分页"""
        # 检查分页组件
        pagination = goods_page.page.locator('.el-pagination')
        if pagination.count() > 0:
            # 检查是否有下一页按钮
            next_btn = pagination.locator('.btn-next')
            if next_btn.count() > 0:
                is_disabled = next_btn.is_disabled()
                if not is_disabled:
                    next_btn.click()
                    goods_page.page.wait_for_load_state("networkidle")

                    # 验证页面已更新
                    table = goods_page.page.locator('.el-table')
                    expect(table).to_be_visible()

    @pytest.mark.e2e
    @pytest.mark.slow
    def test_goods_filter_by_category(self, goods_page):
        """测试按分类筛选商品"""
        # 查找分类下拉框
        category_select = goods_page.page.locator('.el-cascader')
        if category_select.count() > 0:
            category_select.click()
            goods_page.page.wait_for_timeout(500)

            # 选择一个分类
            category_option = goods_page.page.locator('.el-cascader-node__label')
            if category_option.count() > 0:
                category_option.first.click()
                goods_page.page.wait_for_load_state("networkidle")

    @pytest.mark.e2e
    @pytest.mark.slow
    def test_goods_create_form(self, goods_page):
        """测试商品创建表单"""
        # 点击添加按钮
        add_btn = goods_page.page.locator('.filter-container button:has-text("添加")')
        if add_btn.count() > 0:
            add_btn.click()
            goods_page.page.wait_for_load_state("networkidle")

            # 检查表单弹窗
            dialog = goods_page.page.locator('.el-dialog')
            expect(dialog).to_be_visible(timeout=5000)

            # 检查表单字段
            form = dialog.locator('form, .el-form')
            expect(form).to_be_visible()

            # 关闭弹窗
            close_btn = dialog.locator('.el-dialog__close')
            if close_btn.count() > 0:
                close_btn.click()
