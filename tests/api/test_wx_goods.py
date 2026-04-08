"""
小程序商品 API 测试

测试用例覆盖：
- WXG-01: 商品列表查询
- WXG-02: 商品分类查询
- WXG-03: 商品详情查询
- WXG-04: 商品搜索
- WXG-05: 相关商品推荐
- WXG-06: 商品总数统计
"""
import pytest
from tests.api.conftest import APIClient, ResponseAssert


@pytest.mark.api
class TestWxGoodsList:
    """小程序商品列表测试"""

    def test_goods_list_default(self, api_client: APIClient, assert_resp: ResponseAssert):
        """WXG-01: 默认商品列表查询"""
        resp = api_client.get("/wx/goods/list", params={
            "page": 1,
            "limit": 10
        })

        data = assert_resp.success(resp, "获取商品列表成功")
        assert "list" in data, "响应缺少 list 字段"
        assert "total" in data, "响应缺少 total 字段"
        assert "pages" in data, "响应缺少 pages 字段"

    def test_goods_list_pagination(self, api_client: APIClient, assert_resp: ResponseAssert):
        """WXG-01: 商品列表分页"""
        # 第一页
        resp1 = api_client.get("/wx/goods/list", params={
            "page": 1,
            "limit": 5
        })
        data1 = assert_resp.success(resp1)

        # 第二页
        resp2 = api_client.get("/wx/goods/list", params={
            "page": 2,
            "limit": 5
        })
        data2 = assert_resp.success(resp2)

        # 验证分页有效
        assert data1.get("page") == 1, "第一页 page 应为 1"
        assert data2.get("page") == 2, "第二页 page 应为 2"

    def test_goods_list_by_category(self, api_client: APIClient, assert_resp: ResponseAssert):
        """WXG-01: 按分类查询商品列表"""
        # 先获取分类列表
        resp = api_client.get("/wx/catalog/index")
        data = assert_resp.success(resp)

        if data.get("currentCategory"):
            category_id = data["currentCategory"].get("id")
            if category_id:
                resp = api_client.get("/wx/goods/list", params={
                    "categoryId": category_id,
                    "page": 1,
                    "limit": 10
                })
                assert_resp.success(resp, f"按分类 {category_id} 查询商品成功")

    def test_goods_list_sort_by_price(self, api_client: APIClient, assert_resp: ResponseAssert):
        """WXG-01: 按价格排序"""
        resp = api_client.get("/wx/goods/list", params={
            "page": 1,
            "limit": 10,
            "sort": "retail_price",
            "order": "asc"
        })
        data = assert_resp.success(resp, "按价格升序排序成功")

        goods_list = data.get("list", [])
        if len(goods_list) >= 2:
            # 验证排序
            for i in range(len(goods_list) - 1):
                price1 = goods_list[i].get("retailPrice", 0)
                price2 = goods_list[i + 1].get("retailPrice", 0)
                assert price1 <= price2, f"价格排序错误: {price1} > {price2}"

    def test_goods_list_filter_new(self, api_client: APIClient, assert_resp: ResponseAssert):
        """WXG-01: 筛选新品"""
        resp = api_client.get("/wx/goods/list", params={
            "page": 1,
            "limit": 10,
            "isNew": True
        })
        data = assert_resp.success(resp, "筛选新品成功")

        goods_list = data.get("list", [])
        for goods in goods_list:
            assert goods.get("isNew") is True, f"商品 {goods.get('id')} 不是新品"

    def test_goods_list_filter_hot(self, api_client: APIClient, assert_resp: ResponseAssert):
        """WXG-01: 筛选热卖"""
        resp = api_client.get("/wx/goods/list", params={
            "page": 1,
            "limit": 10,
            "isHot": True
        })
        data = assert_resp.success(resp, "筛选热卖成功")

        goods_list = data.get("list", [])
        for goods in goods_list:
            assert goods.get("isHot") is True, f"商品 {goods.get('id')} 不是热卖商品"


@pytest.mark.api
class TestWxGoodsDetail:
    """小程序商品详情测试"""

    def test_goods_detail_success(self, api_client: APIClient, assert_resp: ResponseAssert):
        """WXG-03: 商品详情查询成功"""
        # 先获取一个商品 ID
        resp = api_client.get("/wx/goods/list", params={"page": 1, "limit": 1})
        data = assert_resp.success(resp)

        goods_list = data.get("list", [])
        if not goods_list:
            pytest.skip("没有可用的商品")

        goods_id = goods_list[0].get("id")

        # 查询商品详情
        resp = api_client.get("/wx/goods/detail", params={"id": goods_id})
        data = assert_resp.success(resp, f"获取商品 {goods_id} 详情成功")

        assert "info" in data, "响应缺少 info 字段"
        assert data["info"].get("id") == goods_id, "商品 ID 不匹配"
        assert "productList" in data, "响应缺少 productList 字段"

    def test_goods_detail_with_login(self, wx_user_client: APIClient, assert_resp: ResponseAssert):
        """WXG-03: 登录用户查询商品详情（包含收藏状态）"""
        # 先获取一个商品 ID
        resp = wx_user_client.get("/wx/goods/list", params={"page": 1, "limit": 1})
        data = assert_resp.success(resp)

        goods_list = data.get("list", [])
        if not goods_list:
            pytest.skip("没有可用的商品")

        goods_id = goods_list[0].get("id")

        # 查询商品详情
        resp = wx_user_client.get("/wx/goods/detail", params={"id": goods_id})
        data = assert_resp.success(resp, f"登录用户获取商品 {goods_id} 详情成功")

        assert "userHasCollect" in data, "响应缺少 userHasCollect 字段"

    def test_goods_detail_invalid_id(self, api_client: APIClient, assert_resp: ResponseAssert):
        """WXG-03: 无效商品 ID"""
        resp = api_client.get("/wx/goods/detail", params={"id": 999999999})
        # 无效 ID 可能返回空数据或错误
        assert resp.status_code == 200


@pytest.mark.api
class TestWxGoodsSearch:
    """小程序商品搜索测试"""

    def test_goods_search_by_keyword(self, api_client: APIClient, assert_resp: ResponseAssert):
        """WXG-04: 关键字搜索商品"""
        # 先获取一个商品名称作为关键字
        resp = api_client.get("/wx/goods/list", params={"page": 1, "limit": 1})
        data = assert_resp.success(resp)

        goods_list = data.get("list", [])
        if not goods_list:
            pytest.skip("没有可用的商品")

        # 取商品名称的第一个字符作为关键字
        keyword = goods_list[0].get("name", "")[:1]
        if not keyword:
            pytest.skip("商品名称为空")

        resp = api_client.get("/wx/goods/list", params={
            "keyword": keyword,
            "page": 1,
            "limit": 10
        })
        assert_resp.success(resp, f"关键字 '{keyword}' 搜索成功")

    def test_goods_search_empty_keyword(self, api_client: APIClient, assert_resp: ResponseAssert):
        """WXG-04: 空关键字搜索"""
        resp = api_client.get("/wx/goods/list", params={
            "keyword": "",
            "page": 1,
            "limit": 10
        })
        # 空关键字应该返回所有商品
        assert_resp.success(resp, "空关键字搜索成功")


@pytest.mark.api
class TestWxGoodsRelated:
    """小程序相关商品测试"""

    def test_goods_related(self, api_client: APIClient, assert_resp: ResponseAssert):
        """WXG-05: 相关商品推荐"""
        # 先获取一个商品 ID
        resp = api_client.get("/wx/goods/list", params={"page": 1, "limit": 1})
        data = assert_resp.success(resp)

        goods_list = data.get("list", [])
        if not goods_list:
            pytest.skip("没有可用的商品")

        goods_id = goods_list[0].get("id")

        # 查询相关商品
        resp = api_client.get("/wx/goods/related", params={"id": goods_id})
        assert_resp.success(resp, f"获取商品 {goods_id} 相关推荐成功")


@pytest.mark.api
class TestWxGoodsCount:
    """小程序商品统计测试"""

    def test_goods_count(self, api_client: APIClient, assert_resp: ResponseAssert):
        """WXG-06: 商品总数统计"""
        resp = api_client.get("/wx/goods/count")
        data = assert_resp.success(resp, "获取商品总数成功")

        # 返回的是数字
        assert isinstance(data, int), "商品总数应该是整数"
        assert data >= 0, "商品总数不能为负数"


@pytest.mark.api
class TestWxGoodsCategory:
    """小程序商品分类测试"""

    def test_goods_category(self, api_client: APIClient, assert_resp: ResponseAssert):
        """WXG-02: 商品分类查询"""
        # 先获取分类 ID
        resp = api_client.get("/wx/catalog/index")
        data = assert_resp.success(resp)

        category_list = data.get("categoryList", [])
        if not category_list:
            pytest.skip("没有可用的分类")

        # 获取子分类
        first_category = category_list[0]
        sub_categories = first_category.get("children", [])
        if sub_categories:
            category_id = sub_categories[0].get("id")
        else:
            category_id = first_category.get("id")

        # 查询分类信息
        resp = api_client.get("/wx/goods/category", params={"id": category_id})
        data = assert_resp.success(resp, f"获取分类 {category_id} 信息成功")

        assert "currentCategory" in data, "响应缺少 currentCategory 字段"
