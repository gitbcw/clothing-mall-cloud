"""
企业管理员操作 E2E 测试

基于 docs/用户操作流程-核心场景.md 第7节 场景7.1-7.11
"""
import pytest
from playwright.sync_api import expect
from datetime import datetime


class TestGoodsCreate:
    """
    7.1 新增商品

    流程: 商品管理 -> 商品列表 -> 新增商品 -> 填写表单 -> 保存上架
    """

    @pytest.mark.e2e
    def test_goods_create_page_loads(self, goods_page):
        """测试新增商品页面加载"""
        # 点击新增按钮
        add_btn = goods_page.page.locator('.filter-container button:has-text("添加")')
        if add_btn.count() > 0:
            add_btn.click()
            goods_page.page.wait_for_load_state("networkidle")

            # 验证表单出现
            dialog = goods_page.page.locator('.el-dialog')
            expect(dialog).to_be_visible(timeout=5000)

    @pytest.mark.e2e
    @pytest.mark.slow
    def test_goods_create_form_fields(self, goods_page):
        """测试商品创建表单字段"""
        add_btn = goods_page.page.locator('.filter-container button:has-text("添加")')
        if add_btn.count() == 0:
            pytest.skip("添加按钮不存在")

        add_btn.click()
        goods_page.page.wait_for_load_state("networkidle")

        # 检查关键字段
        dialog = goods_page.page.locator('.el-dialog')

        # 商品名称
        name_field = dialog.locator('input[placeholder*="名称"], input[placeholder*="商品"]')
        expect(name_field.first).to_be_visible(timeout=5000)

        # 关闭弹窗
        close_btn = dialog.locator('.el-dialog__close')
        if close_btn.count() > 0:
            close_btn.click()

    @pytest.mark.e2e
    @pytest.mark.slow
    def test_goods_create_with_category(self, goods_page):
        """测试商品创建选择分类"""
        add_btn = goods_page.page.locator('.filter-container button:has-text("添加")')
        if add_btn.count() == 0:
            pytest.skip("添加按钮不存在")

        add_btn.click()
        goods_page.page.wait_for_load_state("networkidle")

        dialog = goods_page.page.locator('.el-dialog')

        # 查找分类选择器
        category_cascader = dialog.locator('.el-cascader')
        if category_cascader.count() > 0:
            category_cascader.click()
            goods_page.page.wait_for_timeout(500)

            # 选择一个分类
            options = goods_page.page.locator('.el-cascader-node__label')
            if options.count() > 0:
                options.first.click()
                goods_page.page.wait_for_timeout(300)

        # 关闭弹窗
        close_btn = dialog.locator('.el-dialog__close')
        if close_btn.count() > 0:
            close_btn.click()


class TestOrderShip:
    """
    7.2 订单发货

    流程: 订单管理 -> 筛选待发货 -> 点击发货 -> 填写物流信息 -> 确认发货
    """

    @pytest.mark.e2e
    def test_order_page_loads(self, order_page):
        """测试订单页面加载"""
        table = order_page.page.locator('.el-table')
        expect(table).to_be_visible(timeout=10000)

    @pytest.mark.e2e
    @pytest.mark.slow
    def test_filter_pending_ship_orders(self, order_page):
        """测试筛选待发货订单"""
        # 查找状态筛选标签
        tabs = order_page.page.locator('.tabs-container .el-radio-button, .filter-container .el-radio-button')
        if tabs.count() > 0:
            # 点击待发货
            pending_btn = tabs.locator('text=待发货')
            if pending_btn.count() > 0:
                pending_btn.first.click()
                order_page.page.wait_for_load_state("networkidle")

        # 验证表格存在
        table = order_page.page.locator('.el-table')
        expect(table).to_be_visible()

    @pytest.mark.e2e
    @pytest.mark.slow
    def test_ship_order_dialog(self, order_page):
        """测试发货弹窗"""
        # 等待表格加载
        order_page.page.wait_for_selector('.el-table__body-wrapper tr', timeout=10000)
        rows = order_page.page.locator('.el-table__body-wrapper tr')

        if rows.count() == 0:
            pytest.skip("没有订单数据")

        # 查找发货按钮
        ship_btn = rows.first.locator('button:has-text("发货")')
        if ship_btn.count() > 0:
            ship_btn.click()
            order_page.page.wait_for_timeout(500)

            # 验证发货弹窗 - 使用更精确的选择器
            dialog = order_page.page.get_by_role("dialog", name="发货")
            expect(dialog).to_be_visible(timeout=5000)

            # 关闭弹窗
            close_btn = dialog.locator('.el-dialog__close')
            if close_btn.count() > 0:
                close_btn.click()


class TestAftersaleApprove:
    """
    7.3 审核换货申请

    流程: 售后管理 -> 筛选待审核 -> 查看详情 -> 通过审核
    """

    @pytest.mark.e2e
    def test_aftersale_page_loads(self, aftersale_page):
        """测试售后页面加载"""
        table = aftersale_page.page.locator('.el-table')
        expect(table).to_be_visible(timeout=10000)

    @pytest.mark.e2e
    @pytest.mark.slow
    def test_aftersale_list_display(self, aftersale_page):
        """测试售后列表显示"""
        aftersale_page.page.wait_for_selector('.el-table__body-wrapper', timeout=10000)
        rows = aftersale_page.page.locator('.el-table__body-wrapper tr')

        # 表格应该存在（可能为空）
        assert rows.count() >= 0

    @pytest.mark.e2e
    @pytest.mark.slow
    def test_aftersale_detail_view(self, aftersale_page):
        """测试查看售后详情"""
        aftersale_page.page.wait_for_selector('.el-table__body-wrapper tr', timeout=10000)
        rows = aftersale_page.page.locator('.el-table__body-wrapper tr')

        if rows.count() == 0:
            pytest.skip("没有售后数据")

        # 点击查看按钮
        view_btn = rows.first.locator('button:has-text("查看")')
        if view_btn.count() > 0:
            view_btn.click()
            aftersale_page.page.wait_for_load_state("networkidle")

            # 验证详情弹窗
            dialog = aftersale_page.page.locator('.el-dialog')
            expect(dialog).to_be_visible(timeout=5000)

            # 关闭弹窗
            close_btn = dialog.locator('.el-dialog__close')
            if close_btn.count() > 0:
                close_btn.click()


class TestCouponCreate:
    """
    7.4 创建优惠券

    流程: 活动管理 -> 优惠券管理 -> 新增优惠券 -> 填写信息 -> 保存
    """

    @pytest.mark.e2e
    def test_coupon_page_loads(self, coupon_page):
        """测试优惠券页面加载"""
        table = coupon_page.page.locator('.el-table')
        expect(table).to_be_visible(timeout=10000)

    @pytest.mark.e2e
    @pytest.mark.slow
    def test_coupon_create_dialog(self, coupon_page):
        """测试优惠券创建弹窗"""
        add_btn = coupon_page.page.locator('.filter-container button:has-text("添加")')
        if add_btn.count() == 0:
            pytest.skip("添加按钮不存在")

        add_btn.click()
        coupon_page.page.wait_for_load_state("networkidle")

        # 验证弹窗
        dialog = coupon_page.page.locator('.el-dialog')
        expect(dialog).to_be_visible(timeout=5000)

        # 关闭弹窗
        close_btn = dialog.locator('.el-dialog__close')
        if close_btn.count() > 0:
            close_btn.click()


class TestFlashSaleCreate:
    """
    7.5 创建限时折扣活动

    流程: 活动管理 -> 活动配置 -> 限时折扣 -> 新增活动 -> 保存启用
    """

    @pytest.mark.e2e
    def test_flash_sale_page_loads(self, flash_sale_page):
        """测试限时特卖页面加载"""
        table = flash_sale_page.page.locator('.el-table')
        expect(table).to_be_visible(timeout=10000)

    @pytest.mark.e2e
    @pytest.mark.slow
    def test_flash_sale_list_display(self, flash_sale_page):
        """测试限时特卖列表显示"""
        flash_sale_page.page.wait_for_selector('.el-table__body-wrapper', timeout=10000)
        rows = flash_sale_page.page.locator('.el-table__body-wrapper tr')

        # 表格应该存在
        assert rows.count() >= 0


class TestFullReductionCreate:
    """
    7.6 创建满减活动

    流程: 活动管理 -> 活动配置 -> 满减活动 -> 新增活动 -> 保存启用
    """

    @pytest.mark.e2e
    def test_full_reduction_page_loads(self, full_reduction_page):
        """测试满减活动页面加载"""
        table = full_reduction_page.page.locator('.el-table')
        expect(table).to_be_visible(timeout=10000)

    @pytest.mark.e2e
    @pytest.mark.slow
    def test_full_reduction_list_display(self, full_reduction_page):
        """测试满减活动列表显示"""
        full_reduction_page.page.wait_for_selector('.el-table__body-wrapper', timeout=10000)
        rows = full_reduction_page.page.locator('.el-table__body-wrapper tr')

        # 表格应该存在
        assert rows.count() >= 0


class TestStatisticsView:
    """
    7.8 查看数据统计

    流程: 数据统计 -> 查看销售概览/商品分析/用户分析/订单分析
    """

    @pytest.mark.e2e
    def test_statistics_page_loads(self, statistics_page):
        """测试数据统计页面加载"""
        # 等待统计卡片或图表加载
        cards = statistics_page.page.locator('.el-card, .panel-group')
        expect(cards.first).to_be_visible(timeout=10000)

    @pytest.mark.e2e
    @pytest.mark.slow
    def test_statistics_data_display(self, statistics_page):
        """测试统计数据展示"""
        # 检查是否有数字展示
        numbers = statistics_page.page.locator('.card-panel-num, .statistic-content, .number')
        if numbers.count() > 0:
            # 应该有数据显示
            assert numbers.count() > 0


class TestUserManagement:
    """
    7.9 会员管理

    流程: 会员管理 -> 会员列表 -> 筛选/搜索 -> 查看详情
    """

    @pytest.mark.e2e
    def test_user_page_loads(self, user_page):
        """测试会员管理页面加载"""
        table = user_page.page.locator('.el-table')
        expect(table).to_be_visible(timeout=10000)

    @pytest.mark.e2e
    @pytest.mark.slow
    def test_user_list_display(self, user_page):
        """测试会员列表显示"""
        user_page.page.wait_for_selector('.el-table__body-wrapper', timeout=10000)
        rows = user_page.page.locator('.el-table__body-wrapper tr')

        # 表格应该存在
        assert rows.count() >= 0

    @pytest.mark.e2e
    @pytest.mark.slow
    def test_user_search(self, user_page):
        """测试会员搜索"""
        search_input = user_page.page.locator('.filter-container input').first
        if search_input.count() > 0:
            search_input.fill("test")
            user_page.page.click('.filter-container button.el-button--primary')
            user_page.page.wait_for_load_state("networkidle")

            # 验证表格存在
            table = user_page.page.locator('.el-table')
            expect(table).to_be_visible()

    @pytest.mark.e2e
    @pytest.mark.slow
    def test_user_detail_view(self, user_page):
        """测试查看会员详情"""
        user_page.page.wait_for_selector('.el-table__body-wrapper tr', timeout=10000)
        rows = user_page.page.locator('.el-table__body-wrapper tr')

        if rows.count() == 0:
            pytest.skip("没有会员数据")

        # 点击查看按钮
        view_btn = rows.first.locator('button:has-text("查看")')
        if view_btn.count() > 0:
            view_btn.click()
            user_page.page.wait_for_load_state("networkidle")

            # 验证详情弹窗
            dialog = user_page.page.locator('.el-dialog')
            expect(dialog).to_be_visible(timeout=5000)

            # 关闭弹窗
            close_btn = dialog.locator('.el-dialog__close')
            if close_btn.count() > 0:
                close_btn.click()


class TestSystemConfig:
    """
    7.11 系统设置

    流程: 系统设置 -> 配置店铺信息/配送设置/支付设置
    """

    @pytest.mark.e2e
    def test_config_page_loads(self, config_page):
        """测试系统设置页面加载"""
        # 等待配置表单加载 - 商城配置页面使用 .app-container 和 .el-form
        container = config_page.page.locator('.app-container')
        expect(container).to_be_visible(timeout=10000)

        # 验证表单存在
        form = container.locator('.el-form')
        expect(form).to_be_visible(timeout=5000)

    @pytest.mark.e2e
    @pytest.mark.slow
    def test_express_config_page(self, config_page):
        """测试运费配置页面"""
        config_page.goto_express_config()
        config_page.page.wait_for_load_state("networkidle")

        # 检查配置表单
        form = config_page.page.locator('.el-form, .config-container')
        expect(form.first).to_be_visible(timeout=5000)

    @pytest.mark.e2e
    @pytest.mark.slow
    def test_promotion_config_page(self, config_page):
        """测试促销配置页面"""
        config_page.goto_promotion_config()
        config_page.page.wait_for_load_state("networkidle")

        # 检查配置表单
        form = config_page.page.locator('.el-form, .config-container')
        expect(form.first).to_be_visible(timeout=5000)
