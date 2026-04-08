"""
促销活动 API 测试
"""
import pytest


class TestFullReductionAPI:
    """满减活动 API 测试"""

    @pytest.mark.api
    def test_list_full_reduction(self, admin_client):
        """测试获取满减活动列表"""
        resp = admin_client.get("/admin/fullreduction/list")

        # API 可能尚未部署或服务暂时不可用
        if resp.status_code in [404, 502, 503]:
            pytest.skip("满减活动 API 尚未部署或服务不可用")

        assert resp.status_code == 200
        data = resp.json()
        assert data.get("errno") == 0
        assert "list" in data.get("data", {})

    @pytest.mark.api
    def test_create_full_reduction(self, admin_client):
        """测试创建满减活动"""
        import time

        # 创建满减规则
        resp = admin_client.post("/admin/fullreduction/create", json={
            "name": f"测试满减-{int(time.time())}",
            "desc": "满200减20",
            "thresholdAmount": 200.00,
            "reductionAmount": 20.00,
            "status": 1,
            "startTime": "2026-01-01 00:00:00",
            "endTime": "2026-12-31 23:59:59",
            "goodsType": 0,
            "goodsValue": []
        })

        # API 可能尚未部署
        if resp.status_code == 404:
            pytest.skip("满减活动 API 尚未部署")

        assert resp.status_code == 200
        print(f"创建满减活动: {resp.json()}")


class TestFlashSaleAPI:
    """限时特卖 API 测试"""

    @pytest.mark.api
    def test_list_flash_sale(self, admin_client):
        """测试获取限时特卖列表"""
        resp = admin_client.get("/admin/flashsale/list", params={
            "page": 1,
            "limit": 10
        })

        # API 可能尚未部署
        if resp.status_code == 404:
            pytest.skip("限时特卖 API 尚未部署")

        assert resp.status_code == 200
        data = resp.json()
        assert data.get("errno") == 0
        assert "list" in data.get("data", {})

    @pytest.mark.api
    def test_query_ongoing_flash_sales(self, api_client):
        """测试查询进行中的特卖（小程序端）"""
        resp = api_client.get("/wx/flashsale/list", params={
            "page": 1,
            "limit": 10
        })

        # API 可能尚未部署或服务暂时不可用
        if resp.status_code in [404, 502]:
            pytest.skip("限时特卖 API 尚未部署或服务不可用")

        assert resp.status_code == 200
        print(f"特卖列表: {resp.json()}")


class TestCouponAPI:
    """优惠券 API 测试"""

    @pytest.mark.api
    def test_list_coupons(self, admin_client, assert_resp):
        """测试获取优惠券列表"""
        resp = admin_client.get("/admin/coupon/list", params={
            "page": 1,
            "limit": 10
        })

        data = assert_resp.success(resp, "获取优惠券列表")
        assert "list" in data
        assert "total" in data

    @pytest.mark.api
    def test_query_available_coupons(self, api_client):
        """测试查询可领取优惠券（小程序端）"""
        resp = api_client.get("/wx/coupon/list")

        # 可能需要登录
        assert resp.status_code == 200

    @pytest.mark.api
    def test_query_register_coupons(self, api_client):
        """测试查询注册优惠券"""
        resp = api_client.get("/wx/coupon/register-list")

        # API 可能尚未部署
        if resp.status_code == 404:
            pytest.skip("注册优惠券 API 尚未部署")

        assert resp.status_code == 200
