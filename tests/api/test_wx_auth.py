"""
小程序认证 API 测试

测试用例覆盖：
- WXA-01: 账号密码登录
- WXA-02: 登录失败（账号不存在）
- WXA-03: 登录失败（密码错误）
- WXA-04: 获取用户信息
- WXA-05: 更新用户资料
"""
import pytest
from tests.api.conftest import APIClient, ResponseAssert


@pytest.mark.api
class TestWxAuthLogin:
    """小程序登录测试"""

    def test_login_success(self, api_client: APIClient, assert_resp: ResponseAssert):
        """WXA-01: 账号密码登录成功"""
        resp = api_client.post("/wx/auth/login", json={
            "username": "user123",
            "password": "user123"
        })

        # 如果测试用户不存在，跳过此测试
        if resp.status_code == 200:
            data = resp.json()
            if data.get("errno") == 700:  # 账号不存在
                pytest.skip("测试用户 user123 不存在，请先在数据库中创建")

        data = assert_resp.success(resp, "账号密码登录成功")
        assert "token" in data, "响应缺少 token 字段"
        assert "userInfo" in data, "响应缺少 userInfo 字段"
        assert len(data["token"]) > 0, "token 不能为空"

    def test_login_username_empty(self, api_client: APIClient, assert_resp: ResponseAssert):
        """WXA-02: 用户名为空时登录失败"""
        resp = api_client.post("/wx/auth/login", json={
            "username": "",
            "password": "user123"
        })
        assert_resp.error(resp)

    def test_login_password_empty(self, api_client: APIClient, assert_resp: ResponseAssert):
        """WXA-02: 密码为空时登录失败"""
        resp = api_client.post("/wx/auth/login", json={
            "username": "user123",
            "password": ""
        })
        assert_resp.error(resp)

    def test_login_user_not_exist(self, api_client: APIClient, assert_resp: ResponseAssert):
        """WXA-02: 账号不存在时登录失败"""
        resp = api_client.post("/wx/auth/login", json={
            "username": "nonexistent_user_xyz",
            "password": "password123"
        })
        data = assert_resp.error(resp)
        # 账号不存在返回特定错误码 700
        assert data.get("errno") in [401, 502, 700], f"预期错误码 401/502/700，实际 {data.get('errno')}"

    def test_login_wrong_password(self, api_client: APIClient, assert_resp: ResponseAssert):
        """WXA-03: 密码错误时登录失败"""
        resp = api_client.post("/wx/auth/login", json={
            "username": "user123",
            "password": "wrongpassword"
        })
        data = assert_resp.error(resp)
        # 账号密码错误返回特定错误码
        # 注意：如果账号不存在，也会返回 700
        assert data.get("errno") in [401, 502, 700], f"预期错误码 401/502/700，实际 {data.get('errno')}"


@pytest.mark.api
class TestWxAuthInfo:
    """小程序用户信息测试"""

    def test_get_user_info_success(self, wx_user_client: APIClient, assert_resp: ResponseAssert):
        """WXA-04: 获取用户信息成功"""
        resp = wx_user_client.get("/wx/auth/info")

        data = assert_resp.success(resp, "获取用户信息成功")
        assert "nickName" in data, "响应缺少 nickName 字段"
        assert "avatar" in data, "响应缺少 avatar 字段"

    def test_get_user_info_unauthorized(self, api_client: APIClient, assert_resp: ResponseAssert):
        """WXA-04: 未登录时获取用户信息失败"""
        resp = api_client.get("/wx/auth/info")
        # 未登录应该返回错误
        assert_resp.error(resp)

    def test_update_user_profile(self, wx_user_client: APIClient, assert_resp: ResponseAssert):
        """WXA-05: 更新用户资料"""
        # 先获取当前用户信息
        resp = wx_user_client.get("/wx/auth/info")
        original_data = assert_resp.success(resp)

        # 更新昵称
        new_nickname = "测试昵称_" + str(id(original_data))[-4:]
        resp = wx_user_client.post("/wx/auth/profile", json={
            "nickname": new_nickname
        })
        assert_resp.success(resp, "更新用户资料成功")

        # 验证更新成功
        resp = wx_user_client.get("/wx/auth/info")
        data = assert_resp.success(resp)
        assert data.get("nickName") == new_nickname, f"昵称更新失败，期望 {new_nickname}，实际 {data.get('nickName')}"


@pytest.mark.api
class TestWxAuthLogout:
    """小程序登出测试"""

    def test_logout_success(self, wx_user_client: APIClient, assert_resp: ResponseAssert):
        """登出成功"""
        resp = wx_user_client.post("/wx/auth/logout")
        assert_resp.success(resp, "登出成功")
