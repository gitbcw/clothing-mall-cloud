"""
商品 API 测试
"""
import pytest


class TestGoodsAPI:
    """商品 API 测试"""

    @pytest.mark.api
    def test_list_goods(self, admin_client, assert_resp):
        """测试获取商品列表"""
        resp = admin_client.get("/admin/goods/list", params={
            "page": 1,
            "limit": 10
        })

        data = assert_resp.success(resp, "获取商品列表")
        assert "list" in data
        assert "total" in data

    @pytest.mark.api
    def test_list_goods_with_filter(self, admin_client, assert_resp):
        """测试带过滤条件的商品列表"""
        resp = admin_client.get("/admin/goods/list", params={
            "page": 1,
            "limit": 10,
            "goodsSn": "",
            "name": "测试"
        })

        assert resp.status_code == 200
        data = resp.json()
        assert data.get("errno") == 0

    @pytest.mark.api
    def test_get_goods_detail(self, api_client, assert_resp):
        """测试获取商品详情（小程序端）"""
        # 先获取商品列表
        resp = api_client.get("/wx/goods/list", params={
            "page": 1,
            "limit": 1
        })

        if resp.status_code == 200 and resp.json().get("errno") == 0:
            goods_list = resp.json().get("data", {}).get("list", [])
            if goods_list:
                goods_id = goods_list[0].get("id")
                if goods_id:
                    # 获取商品详情
                    detail_resp = api_client.get(f"/wx/goods/detail", params={"id": goods_id})
                    assert detail_resp.status_code == 200


class TestCategoryAPI:
    """商品分类 API 测试"""

    @pytest.mark.api
    def test_list_categories(self, admin_client, assert_resp):
        """测试获取分类列表"""
        resp = admin_client.get("/admin/category/list")

        data = assert_resp.success(resp, "获取分类列表")
        # API 返回分页格式，包含 list 字段
        assert "list" in data

    @pytest.mark.api
    def test_l1_categories(self, api_client, assert_resp):
        """测试获取一级分类（小程序端）"""
        resp = api_client.get("/wx/catalog/index")

        assert resp.status_code == 200
