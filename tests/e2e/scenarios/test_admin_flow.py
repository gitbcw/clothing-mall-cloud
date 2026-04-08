"""
管理员流程端到端测试

测试场景: 管理员查看订单 -> 处理发货 -> 验证状态
"""
import pytest
import os
import requests
from tests.e2e.scenarios.conftest import ADMIN_API_BASE

# 管理员配置
ADMIN_USER = {
    "username": os.getenv("ADMIN_USERNAME", "admin123"),
    "password": os.getenv("ADMIN_PASSWORD", "admin123")
}


class TestAdminOrderFlow:
    """管理员订单处理流程"""

    def test_admin_view_orders(self):
        """管理员查看订单列表"""
        client = requests.Session()

        # 管理员登录
        print("\n=== 管理员登录 ===")
        login_resp = client.post("{}/auth/login".format(ADMIN_API_BASE), json={
            "username": ADMIN_USER["username"],
            "password": ADMIN_USER["password"]
        }, timeout=10)

        if login_resp.status_code != 200:
            pytest.skip("管理员登录 API 请求失败")

        login_data = login_resp.json()
        if login_data.get("errno") != 0:
            pytest.skip("管理员登录失败: {}".format(login_data.get("errmsg", "Unknown error")))

        token = login_data["data"]["token"]
        client.headers["X-Litemall-Admin-Token"] = token
        print("管理员登录成功")

        # 查看订单列表
        print("\n=== 管理员流程: 查看订单列表 ===")
        resp = client.get("{}/order/list".format(ADMIN_API_BASE), params={
            "page": 1,
            "limit": 10,
            "orderStatusArray": [],
            "sort": "add_time",
            "order": "desc"
        })

        assert resp.status_code == 200
        data = resp.json()
        assert data["errno"] == 0

        orders = data["data"]["list"]
        print("订单总数: {}".format(data["data"]["total"]))
        return orders
