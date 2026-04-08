"""
管理端认证 API 测试
"""
import pytest
from tests.api.conftest import login_admin


class TestAdminAuth:
    """管理端认证测试"""

    @pytest.mark.api
    def test_login_success(self, api_client, assert_resp):
        """测试登录成功"""
        resp = api_client.post("/admin/auth/login", json={
            "username": "admin123",
            "password": "admin123"
        })

        data = assert_resp.success(resp, "管理员登录")
        assert "token" in data
        assert "adminInfo" in data
        assert data["adminInfo"]["nickName"] == "admin123"

    @pytest.mark.api
    def test_login_wrong_password(self, api_client, assert_resp):
        """测试密码错误"""
        resp = api_client.post("/admin/auth/login", json={
            "username": "admin123",
            "password": "wrongpassword"
        })

        assert_resp.error(resp)

    @pytest.mark.api
    def test_login_nonexistent_user(self, api_client, assert_resp):
        """测试不存在的用户"""
        resp = api_client.post("/admin/auth/login", json={
            "username": "nonexistent",
            "password": "password123"
        })

        assert_resp.error(resp)

    @pytest.mark.api
    def test_logout(self, admin_client, assert_resp):
        """测试登出"""
        resp = admin_client.post("/admin/auth/logout")
        assert_resp.success(resp, "管理员登出")

    @pytest.mark.api
    def test_get_admin_info(self, admin_client, assert_resp):
        """测试获取管理员信息"""
        resp = admin_client.get("/admin/auth/info")

        data = assert_resp.success(resp, "获取管理员信息")
        assert "name" in data
        assert "avatar" in data
        assert "roles" in data
