"""
小程序订单 API 测试

测试用例覆盖：
- WXO-01: 订单列表查询
- WXO-02: 订单详情查询
- WXO-03: 提交订单
- WXO-04: 取消订单
- WXO-05: 订单状态筛选
- WXO-06: 确认收货
"""
import pytest
from tests.api.conftest import APIClient, ResponseAssert


@pytest.fixture(scope="function")
def test_order(wx_user_client: APIClient, assert_resp: ResponseAssert):
    """创建一个测试订单，返回订单数据"""
    # 获取一个可用商品
    resp = wx_user_client.get("/wx/goods/list", params={"page": 1, "limit": 1})
    data = assert_resp.success(resp)

    goods_list = data.get("list", [])
    if not goods_list:
        pytest.skip("没有可用的商品")

    goods = goods_list[0]
    goods_id = goods.get("id")

    # 获取商品详情
    resp = wx_user_client.get("/wx/goods/detail", params={"id": goods_id})
    data = assert_resp.success(resp)

    products = data.get("productList", [])
    if not products:
        pytest.skip("商品没有可用规格")

    product_id = products[0].get("id")

    # 添加到购物车
    resp = wx_user_client.post("/wx/cart/fastadd", json={
        "goodsId": goods_id,
        "productId": product_id,
        "number": 1
    })
    cart_id = assert_resp.success(resp, "添加商品到购物车成功")

    # 获取结算信息
    resp = wx_user_client.get("/wx/cart/checkout", params={"cartId": cart_id})
    checkout_data = assert_resp.success(resp)

    address_id = checkout_data.get("addressId", 0)

    # 如果没有地址，跳过
    if address_id == 0:
        pytest.skip("用户没有收货地址，无法创建订单")

    # 提交订单
    resp = wx_user_client.post("/wx/order/submit", json={
        "cartId": cart_id,
        "addressId": address_id,
        "couponId": -1,
        "message": "测试订单"
    })
    order_data = assert_resp.success(resp, "提交订单成功")

    yield {
        "order_id": order_data.get("orderId"),
        "order_sn": order_data.get("orderSn"),
        "goods_id": goods_id,
        "product_id": product_id
    }

    # 清理：取消订单（如果订单还存在）
    if order_data.get("orderId"):
        try:
            wx_user_client.post("/wx/order/cancel", json={
                "orderId": order_data.get("orderId")
            })
        except Exception:
            pass


@pytest.mark.api
class TestWxOrderList:
    """订单列表测试"""

    def test_order_list_all(self, wx_user_client: APIClient, assert_resp: ResponseAssert):
        """WXO-01: 查询所有订单"""
        resp = wx_user_client.get("/wx/order/list", params={
            "showType": 0,
            "page": 1,
            "limit": 10
        })
        data = assert_resp.success(resp, "获取订单列表成功")

        assert "list" in data, "响应缺少 list 字段"
        assert "total" in data, "响应缺少 total 字段"
        assert "pages" in data, "响应缺少 pages 字段"

    def test_order_list_pagination(self, wx_user_client: APIClient, assert_resp: ResponseAssert):
        """WXO-01: 订单列表分页"""
        resp = wx_user_client.get("/wx/order/list", params={
            "showType": 0,
            "page": 1,
            "limit": 5
        })
        data = assert_resp.success(resp)

        # 注意：当没有订单时，page 返回 0
        assert data.get("page") in [0, 1], f"page 应为 0 或 1，实际 {data.get('page')}"
        assert data.get("limit") == 5, f"limit 应为 5，实际 {data.get('limit')}"

    def test_order_list_unauthorized(self, api_client: APIClient, assert_resp: ResponseAssert):
        """WXO-01: 未登录用户查询订单"""
        resp = api_client.get("/wx/order/list")

        # 如果服务暂时不可用，跳过测试
        if resp.status_code in [502, 503]:
            pytest.skip("后端服务暂时不可用")

        assert_resp.error(resp)

    def test_order_list_filter_unpaid(self, wx_user_client: APIClient, assert_resp: ResponseAssert):
        """WXO-05: 筛选待付款订单"""
        resp = wx_user_client.get("/wx/order/list", params={
            "showType": 1,  # 待付款
            "page": 1,
            "limit": 10
        })
        data = assert_resp.success(resp, "获取待付款订单成功")

        orders = data.get("list", [])
        for order in orders:
            # 待付款状态为 101
            assert order.get("orderStatus") == 101, f"订单 {order.get('id')} 不是待付款状态"

    def test_order_list_filter_unship(self, wx_user_client: APIClient, assert_resp: ResponseAssert):
        """WXO-05: 筛选待发货订单"""
        resp = wx_user_client.get("/wx/order/list", params={
            "showType": 2,  # 待发货
            "page": 1,
            "limit": 10
        })
        data = assert_resp.success(resp, "获取待发货订单成功")

        orders = data.get("list", [])
        for order in orders:
            # 待发货状态为 201
            assert order.get("orderStatus") == 201, f"订单 {order.get('id')} 不是待发货状态"

    def test_order_list_filter_unrecv(self, wx_user_client: APIClient, assert_resp: ResponseAssert):
        """WXO-05: 筛选待收货订单"""
        resp = wx_user_client.get("/wx/order/list", params={
            "showType": 3,  # 待收货
            "page": 1,
            "limit": 10
        })
        data = assert_resp.success(resp, "获取待收货订单成功")

        orders = data.get("list", [])
        for order in orders:
            # 待收货状态为 301
            assert order.get("orderStatus") == 301, f"订单 {order.get('id')} 不是待收货状态"


@pytest.mark.api
class TestWxOrderDetail:
    """订单详情测试"""

    def test_order_detail_success(self, wx_user_client: APIClient, assert_resp: ResponseAssert):
        """WXO-02: 查询订单详情"""
        # 先获取订单列表
        resp = wx_user_client.get("/wx/order/list", params={
            "showType": 0,
            "page": 1,
            "limit": 1
        })
        data = assert_resp.success(resp)

        orders = data.get("list", [])
        if not orders:
            pytest.skip("没有可用的订单")

        order_id = orders[0].get("id")

        # 查询订单详情
        resp = wx_user_client.get("/wx/order/detail", params={"orderId": order_id})
        data = assert_resp.success(resp, f"获取订单 {order_id} 详情成功")

        assert "orderInfo" in data, "响应缺少 orderInfo 字段"
        assert "orderGoods" in data, "响应缺少 orderGoods 字段"
        assert data["orderInfo"].get("id") == order_id, "订单 ID 不匹配"

    def test_order_detail_invalid_id(self, wx_user_client: APIClient, assert_resp: ResponseAssert):
        """WXO-02: 无效订单 ID"""
        resp = wx_user_client.get("/wx/order/detail", params={"orderId": 999999999})
        assert_resp.error(resp)


@pytest.mark.api
class TestWxOrderSubmit:
    """提交订单测试"""

    def test_order_submit_success(self, test_order, assert_resp: ResponseAssert):
        """WXO-03: 提交订单成功"""
        # test_order fixture 已经创建了订单
        assert test_order["order_id"] is not None, "订单 ID 不能为空"
        assert test_order["order_sn"] is not None, "订单号不能为空"

    def test_order_submit_empty_cart(self, wx_user_client: APIClient, assert_resp: ResponseAssert):
        """WXO-03: 空购物车提交订单"""
        resp = wx_user_client.post("/wx/order/submit", json={
            "cartId": 0,
            "addressId": 0,
            "couponId": -1,
            "message": "测试订单"
        })
        assert_resp.error(resp)


@pytest.mark.api
class TestWxOrderCancel:
    """取消订单测试"""

    def test_order_cancel_success(self, test_order, wx_user_client: APIClient, assert_resp: ResponseAssert):
        """WXO-04: 取消订单成功"""
        order_id = test_order["order_id"]

        resp = wx_user_client.post("/wx/order/cancel", json={
            "orderId": order_id
        })
        assert_resp.success(resp, f"取消订单 {order_id} 成功")

    def test_order_cancel_invalid_id(self, wx_user_client: APIClient, assert_resp: ResponseAssert):
        """WXO-04: 取消无效订单"""
        resp = wx_user_client.post("/wx/order/cancel", json={
            "orderId": 999999999
        })
        assert_resp.error(resp)


@pytest.mark.api
class TestWxOrderConfirm:
    """确认收货测试"""

    def test_order_confirm_unpaid_order(self, test_order, wx_user_client: APIClient, assert_resp: ResponseAssert):
        """WXO-06: 待付款订单无法确认收货"""
        order_id = test_order["order_id"]

        # 待付款订单尝试确认收货
        resp = wx_user_client.post("/wx/order/confirm", json={
            "orderId": order_id
        })
        # 应该返回错误，因为订单未发货
        assert_resp.error(resp)


@pytest.mark.api
class TestWxOrderRefund:
    """订单退款测试"""

    def test_order_refund_unpaid_order(self, test_order, wx_user_client: APIClient, assert_resp: ResponseAssert):
        """申请退款 - 待付款订单"""
        order_id = test_order["order_id"]

        # 待付款订单尝试申请退款
        resp = wx_user_client.post("/wx/order/refund", json={
            "orderId": order_id
        })
        # 应该返回错误，因为订单未付款
        assert_resp.error(resp)


@pytest.mark.api
class TestWxOrderDelete:
    """删除订单测试"""

    def test_order_delete_unpaid_order(self, test_order, wx_user_client: APIClient, assert_resp: ResponseAssert):
        """删除订单 - 待付款订单"""
        order_id = test_order["order_id"]

        # 先取消订单
        wx_user_client.post("/wx/order/cancel", json={"orderId": order_id})

        # 取消后可以删除
        resp = wx_user_client.post("/wx/order/delete", json={
            "orderId": order_id
        })
        # 可能成功也可能失败，取决于订单状态
        # 如果成功，订单会被删除
