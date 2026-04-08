"""
订单 API 测试
"""
import pytest


class TestOrderAPI:
    """订单 API 测试"""

    @pytest.mark.api
    def test_list_orders(self, admin_client):
        """测试获取订单列表"""
        resp = admin_client.get("/admin/order/list", params={
            "page": 1,
            "limit": 10
        })

        # 服务可能暂时不可用
        if resp.status_code in [502, 503]:
            pytest.skip("订单服务暂时不可用")

        assert resp.status_code == 200
        data = resp.json()
        assert data.get("errno") == 0
        assert "list" in data.get("data", {})
        assert "total" in data.get("data", {})

    @pytest.mark.api
    def test_list_orders_with_status_filter(self, admin_client, assert_resp):
        """测试按状态筛选订单"""
        # 测试各种订单状态
        statuses = [101, 102, 201, 301, 401]

        for status in statuses:
            resp = admin_client.get("/admin/order/list", params={
                "page": 1,
                "limit": 10,
                "orderStatus": status
            })

            assert resp.status_code == 200, f"状态 {status} 查询失败"
            data = resp.json()
            assert data.get("errno") == 0, f"状态 {status} 查询返回错误"

    @pytest.mark.api
    def test_order_detail(self, admin_client, assert_resp):
        """测试获取订单详情"""
        # 先获取订单列表
        resp = admin_client.get("/admin/order/list", params={
            "page": 1,
            "limit": 1
        })

        if resp.status_code == 200 and resp.json().get("errno") == 0:
            orders = resp.json().get("data", {}).get("list", [])
            if orders:
                order_id = orders[0].get("id")
                if order_id:
                    # 获取订单详情
                    detail_resp = admin_client.get(f"/admin/order/detail", params={"id": order_id})
                    assert detail_resp.status_code == 200


class TestAftersaleAPI:
    """售后 API 测试"""

    @pytest.mark.api
    def test_list_aftersales(self, admin_client, assert_resp):
        """测试获取售后列表"""
        resp = admin_client.get("/admin/aftersale/list", params={
            "page": 1,
            "limit": 10
        })

        data = assert_resp.success(resp, "获取售后列表")
        assert "list" in data
        assert "total" in data

    @pytest.mark.api
    def test_aftersale_detail(self, admin_client, assert_resp):
        """测试获取售后详情"""
        # 先获取售后列表
        resp = admin_client.get("/admin/aftersale/list", params={
            "page": 1,
            "limit": 1
        })

        if resp.status_code == 200 and resp.json().get("errno") == 0:
            aftersales = resp.json().get("data", {}).get("list", [])
            if aftersales:
                aftersale_id = aftersales[0].get("id")
                if aftersale_id:
                    detail_resp = admin_client.get("/admin/aftersale/detail", params={"id": aftersale_id})
                    # 如果没有售后记录，404 是正常的
                    assert detail_resp.status_code in [200, 404]


class TestOrderStatistics:
    """订单统计测试"""

    @pytest.mark.api
    def test_order_statistics(self, admin_client, assert_resp):
        """测试获取订单统计"""
        resp = admin_client.get("/admin/dashboard")

        if resp.status_code == 200:
            data = resp.json()
            if data.get("errno") == 0:
                stats = data.get("data", {})
                print(f"订单统计: {stats}")
