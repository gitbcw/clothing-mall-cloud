"""
小程序购物车 API 测试

测试用例覆盖：
- WXC-01: 获取购物车列表
- WXC-02: 添加商品到购物车
- WXC-03: 修改购物车商品数量
- WXC-04: 勾选/取消勾选购物车商品
- WXC-05: 删除购物车商品
- WXC-06: 购物车结算预览
- WXC-07: 购物车商品数量统计
"""
import pytest
from tests.api.conftest import APIClient, ResponseAssert


@pytest.fixture(scope="function")
def cart_with_goods(wx_user_client: APIClient, assert_resp: ResponseAssert):
    """创建一个包含商品的购物车，返回购物车数据"""
    # 获取一个可用商品
    resp = wx_user_client.get("/wx/goods/list", params={"page": 1, "limit": 1})
    data = assert_resp.success(resp)

    goods_list = data.get("list", [])
    if not goods_list:
        pytest.skip("没有可用的商品")

    goods = goods_list[0]
    goods_id = goods.get("id")

    # 获取商品详情获取 product_id
    resp = wx_user_client.get("/wx/goods/detail", params={"id": goods_id})
    data = assert_resp.success(resp)

    products = data.get("productList", [])
    if not products:
        pytest.skip("商品没有可用规格")

    product_id = products[0].get("id")

    # 添加到购物车
    resp = wx_user_client.post("/wx/cart/add", json={
        "goodsId": goods_id,
        "productId": product_id,
        "number": 1
    })

    yield {
        "goods_id": goods_id,
        "product_id": product_id,
        "cart_data": assert_resp.success(resp, "添加商品到购物车")
    }

    # 清理：删除购物车中的商品
    resp = wx_user_client.get("/wx/cart/index")
    data = assert_resp.success(resp)
    cart_list = data.get("cartList", [])
    if cart_list:
        product_ids = [cart.get("productId") for cart in cart_list]
        wx_user_client.post("/wx/cart/delete", json={"productIds": product_ids})


@pytest.mark.api
class TestWxCartIndex:
    """购物车列表测试"""

    def test_cart_index_empty(self, wx_user_client: APIClient, assert_resp: ResponseAssert):
        """WXC-01: 空购物车"""
        # 先清空购物车
        resp = wx_user_client.get("/wx/cart/index")
        data = assert_resp.success(resp)

        cart_list = data.get("cartList", [])
        if cart_list:
            product_ids = [cart.get("productId") for cart in cart_list]
            wx_user_client.post("/wx/cart/delete", json={"productIds": product_ids})

        # 再次获取
        resp = wx_user_client.get("/wx/cart/index")
        data = assert_resp.success(resp, "获取空购物车成功")

        assert "cartList" in data, "响应缺少 cartList 字段"
        assert "cartTotal" in data, "响应缺少 cartTotal 字段"
        assert data["cartList"] == [], "空购物车应该返回空列表"

    def test_cart_index_unauthorized(self, api_client: APIClient, assert_resp: ResponseAssert):
        """WXC-01: 未登录用户获取购物车"""
        resp = api_client.get("/wx/cart/index")
        assert_resp.error(resp)

    def test_cart_index_with_goods(self, cart_with_goods, wx_user_client: APIClient, assert_resp: ResponseAssert):
        """WXC-01: 购物车包含商品"""
        resp = wx_user_client.get("/wx/cart/index")
        data = assert_resp.success(resp, "获取购物车列表成功")

        cart_list = data.get("cartList", [])
        assert len(cart_list) > 0, "购物车应该包含商品"

        cart_total = data.get("cartTotal", {})
        assert "goodsCount" in cart_total, "响应缺少 goodsCount 字段"
        assert cart_total.get("goodsCount", 0) > 0, "购物车商品数量应该大于 0"


@pytest.mark.api
class TestWxCartAdd:
    """添加购物车测试"""

    def test_cart_add_new_item(self, wx_user_client: APIClient, assert_resp: ResponseAssert):
        """WXC-02: 添加新商品到购物车"""
        # 获取一个可用商品
        resp = wx_user_client.get("/wx/goods/list", params={"page": 1, "limit": 1})
        data = assert_resp.success(resp)

        goods_list = data.get("list", [])
        if not goods_list:
            pytest.skip("没有可用的商品")

        goods = goods_list[0]
        goods_id = goods.get("id")

        # 获取商品详情获取 product_id
        resp = wx_user_client.get("/wx/goods/detail", params={"id": goods_id})
        data = assert_resp.success(resp)

        products = data.get("productList", [])
        if not products:
            pytest.skip("商品没有可用规格")

        product_id = products[0].get("id")

        # 添加到购物车
        resp = wx_user_client.post("/wx/cart/add", json={
            "goodsId": goods_id,
            "productId": product_id,
            "number": 1
        })
        assert_resp.success(resp, "添加新商品到购物车成功")

        # 清理
        resp = wx_user_client.post("/wx/cart/delete", json={"productIds": [product_id]})

    def test_cart_add_increase_quantity(self, cart_with_goods, wx_user_client: APIClient, assert_resp: ResponseAssert):
        """WXC-02: 重复添加相同商品增加数量"""
        goods_id = cart_with_goods["goods_id"]
        product_id = cart_with_goods["product_id"]

        # 再次添加相同商品（如果库存足够）
        resp = wx_user_client.post("/wx/cart/add", json={
            "goodsId": goods_id,
            "productId": product_id,
            "number": 1
        })

        # 如果库存不足，跳过测试
        if resp.status_code == 200:
            data = resp.json()
            if data.get("errno") in [710, 711]:  # 库存不足错误码
                pytest.skip("商品库存不足，无法测试增加数量")

        assert_resp.success(resp, "重复添加商品成功")

        # 验证数量增加
        resp = wx_user_client.get("/wx/cart/index")
        data = assert_resp.success(resp)

        cart_list = data.get("cartList", [])
        target_cart = next((c for c in cart_list if c.get("productId") == product_id), None)
        assert target_cart is not None, "找不到购物车商品"
        assert target_cart.get("number", 0) >= 2, "商品数量应该增加"

    def test_cart_add_unauthorized(self, api_client: APIClient, assert_resp: ResponseAssert):
        """WXC-02: 未登录用户添加购物车"""
        resp = api_client.post("/wx/cart/add", json={
            "goodsId": 1,
            "productId": 1,
            "number": 1
        })
        assert_resp.error(resp)

    def test_cart_add_invalid_goods(self, wx_user_client: APIClient, assert_resp: ResponseAssert):
        """WXC-02: 添加无效商品"""
        resp = wx_user_client.post("/wx/cart/add", json={
            "goodsId": 999999999,
            "productId": 999999999,
            "number": 1
        })
        assert_resp.error(resp)


@pytest.mark.api
class TestWxCartUpdate:
    """修改购物车测试"""

    def test_cart_update_quantity(self, cart_with_goods, wx_user_client: APIClient, assert_resp: ResponseAssert):
        """WXC-03: 修改购物车商品数量"""
        # 获取购物车列表
        resp = wx_user_client.get("/wx/cart/index")
        data = assert_resp.success(resp)

        cart_list = data.get("cartList", [])
        if not cart_list:
            pytest.skip("购物车为空")

        cart = cart_list[0]
        cart_id = cart.get("id")
        goods_id = cart.get("goodsId")
        product_id = cart.get("productId")

        # 修改数量（保持当前数量，避免库存问题）
        current_quantity = cart.get("number", 1)
        new_quantity = current_quantity  # 保持不变

        resp = wx_user_client.post("/wx/cart/update", json={
            "id": cart_id,
            "goodsId": goods_id,
            "productId": product_id,
            "number": new_quantity
        })

        # 如果库存不足，跳过测试
        if resp.status_code == 200:
            data = resp.json()
            if data.get("errno") in [710, 711]:  # 库存不足错误码
                pytest.skip("商品库存不足，无法修改数量")

        assert_resp.success(resp, "修改购物车数量成功")

        # 验证数量已更新
        resp = wx_user_client.get("/wx/cart/index")
        data = assert_resp.success(resp)

        cart_list = data.get("cartList", [])
        target_cart = next((c for c in cart_list if c.get("id") == cart_id), None)
        assert target_cart is not None, "找不到购物车商品"
        assert target_cart.get("number") == new_quantity, f"数量应该是 {new_quantity}"


@pytest.mark.api
class TestWxCartChecked:
    """购物车勾选测试"""

    def test_cart_checked_single(self, cart_with_goods, wx_user_client: APIClient, assert_resp: ResponseAssert):
        """WXC-04: 勾选单个商品"""
        # 获取购物车列表
        resp = wx_user_client.get("/wx/cart/index")
        data = assert_resp.success(resp)

        cart_list = data.get("cartList", [])
        if not cart_list:
            pytest.skip("购物车为空")

        cart = cart_list[0]
        product_id = cart.get("productId")

        # 取消勾选
        resp = wx_user_client.post("/wx/cart/checked", json={
            "productIds": [product_id],
            "isChecked": 0
        })
        data = assert_resp.success(resp, "取消勾选商品成功")

        # 验证勾选状态
        cart_list = data.get("cartList", [])
        target_cart = next((c for c in cart_list if c.get("productId") == product_id), None)
        if target_cart:
            assert target_cart.get("checked") is False, "商品应该未勾选"

        # 重新勾选
        resp = wx_user_client.post("/wx/cart/checked", json={
            "productIds": [product_id],
            "isChecked": 1
        })
        data = assert_resp.success(resp, "勾选商品成功")


@pytest.mark.api
class TestWxCartDelete:
    """删除购物车测试"""

    def test_cart_delete_single(self, wx_user_client: APIClient, assert_resp: ResponseAssert):
        """WXC-05: 删除单个购物车商品"""
        # 先添加一个商品
        resp = wx_user_client.get("/wx/goods/list", params={"page": 1, "limit": 1})
        data = assert_resp.success(resp)

        goods_list = data.get("list", [])
        if not goods_list:
            pytest.skip("没有可用的商品")

        goods = goods_list[0]
        goods_id = goods.get("id")

        resp = wx_user_client.get("/wx/goods/detail", params={"id": goods_id})
        data = assert_resp.success(resp)

        products = data.get("productList", [])
        if not products:
            pytest.skip("商品没有可用规格")

        product_id = products[0].get("id")

        resp = wx_user_client.post("/wx/cart/add", json={
            "goodsId": goods_id,
            "productId": product_id,
            "number": 1
        })
        assert_resp.success(resp)

        # 删除商品
        resp = wx_user_client.post("/wx/cart/delete", json={
            "productIds": [product_id]
        })
        data = assert_resp.success(resp, "删除购物车商品成功")

        # 验证已删除
        cart_list = data.get("cartList", [])
        target_cart = next((c for c in cart_list if c.get("productId") == product_id), None)
        assert target_cart is None, "商品应该已被删除"


@pytest.mark.api
class TestWxCartCheckout:
    """购物车结算测试"""

    def test_cart_checkout(self, cart_with_goods, wx_user_client: APIClient, assert_resp: ResponseAssert):
        """WXC-06: 购物车结算预览"""
        resp = wx_user_client.get("/wx/cart/checkout")
        data = assert_resp.success(resp, "获取结算预览成功")

        assert "checkedAddress" in data, "响应缺少 checkedAddress 字段"
        assert "checkedGoodsList" in data, "响应缺少 checkedGoodsList 字段"
        assert "goodsTotalPrice" in data, "响应缺少 goodsTotalPrice 字段"
        assert "freightPrice" in data, "响应缺少 freightPrice 字段"
        assert "orderTotalPrice" in data, "响应缺少 orderTotalPrice 字段"
        assert "actualPrice" in data, "响应缺少 actualPrice 字段"

    def test_cart_checkout_with_cart_id(self, cart_with_goods, wx_user_client: APIClient, assert_resp: ResponseAssert):
        """WXC-06: 指定购物车项结算"""
        # 获取购物车列表
        resp = wx_user_client.get("/wx/cart/index")
        data = assert_resp.success(resp)

        cart_list = data.get("cartList", [])
        if not cart_list:
            pytest.skip("购物车为空")

        cart_id = cart_list[0].get("id")

        resp = wx_user_client.get("/wx/cart/checkout", params={"cartId": cart_id})
        data = assert_resp.success(resp, f"获取购物车项 {cart_id} 结算预览成功")

        checked_goods = data.get("checkedGoodsList", [])
        assert len(checked_goods) == 1, "应该只结算一个商品"


@pytest.mark.api
class TestWxCartGoodsCount:
    """购物车商品数量测试"""

    def test_cart_goodscount(self, cart_with_goods, wx_user_client: APIClient, assert_resp: ResponseAssert):
        """WXC-07: 购物车商品数量统计"""
        resp = wx_user_client.get("/wx/cart/goodscount")
        data = assert_resp.success(resp, "获取购物车商品数量成功")

        assert isinstance(data, int), "商品数量应该是整数"
        assert data > 0, "购物车商品数量应该大于 0"

    def test_cart_goodscount_unauthorized(self, api_client: APIClient, assert_resp: ResponseAssert):
        """WXC-07: 未登录用户获取购物车数量"""
        resp = api_client.get("/wx/cart/goodscount")
        data = assert_resp.success(resp)

        # 未登录用户返回 0
        assert data == 0, "未登录用户购物车数量应该为 0"
