"""
管理后台登录 E2E 测试
"""
import pytest
from playwright.sync_api import expect


class TestAdminLogin:
    """管理后台登录测试"""

    @pytest.mark.e2e
    def test_login_page_loads(self, page, config):
        """测试登录页面加载"""
        page.goto(f"{config.ADMIN_FRONTEND_URL}/#/login")
        page.wait_for_load_state("networkidle")

        # 检查登录表单存在
        username_input = page.locator('input.el-input__inner[type="text"]').first
        password_input = page.locator('input.el-input__inner[type="password"]').first

        expect(username_input).to_be_visible()
        expect(password_input).to_be_visible()

    @pytest.mark.e2e
    def test_login_success(self, login_page, config):
        """测试登录成功"""
        login_page.login(config.ADMIN_USERNAME, config.ADMIN_PASSWORD)

        # 验证跳转到首页
        expect(login_page.page).to_have_url(config.ADMIN_FRONTEND_URL + "/#/dashboard", timeout=10000)

    @pytest.mark.e2e
    def test_login_wrong_password(self, login_page):
        """测试密码错误"""
        login_page.login("admin123", "wrongpassword")

        # 检查错误提示
        error_msg = login_page.get_error_message()
        assert error_msg is not None, "未显示错误提示"

    @pytest.mark.e2e
    def test_logout(self, admin_page, config):
        """测试登出"""
        # 点击用户头像
        admin_page.click('.avatar-container')
        admin_page.wait_for_timeout(500)

        # 点击登出
        admin_page.click('text=退出登录')
        admin_page.wait_for_load_state("networkidle")

        # 验证跳转到登录页
        expect(admin_page).to_have_url(config.ADMIN_FRONTEND_URL + "/#/login", timeout=10000)
