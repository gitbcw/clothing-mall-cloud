"""
跨系统端到端测试

测试场景: 用户下单 -> 管理员发货 -> 用户确认收货

需要: 本地 Docker 环境运行
"""
import pytest
import requests
import os

# API 配置
LOCAL_WX_API = "http://localhost:8082/wx"
LOCAL_ADMIN_API = "http://localhost:8082/admin"


@pytest.fixture(scope="module")
def wx_client():
    """小程序 API 客户端"""
    return requests.Session()


@pytest.fixture(scope="module")
def admin_client():
    """管理后台 API 客户端"""
    return requests.Session()


@pytest.fixture(scope="module")
def wx_user_token(wx_client):
    """登录小程序用户"""
    resp = wx_client.post("{}/auth/login".format(LOCAL_WX_API), json={
        "username": "user123",
        "password": "user123"
    })

    if resp.status_code != 200:
        pytest.skip("API 请求失败: {}".format(resp.status_code))

    data = resp.json()
    if data.get("errno") != 0:
        errmsg = data.get("errmsg", "Unknown error")
        pytest.skip("登录失败: {}".format(errmsg))

    token = data["data"]["token"]
    wx_client.headers["X-Litemall-Token"] = token
    return token


@pytest.fixture(scope="module")
def admin_token(admin_client):
    """登录管理后台"""
    resp = admin_client.post("{}/auth/login".format(LOCAL_ADMIN_API), json={
        "username": "admin123",
        "password": "admin123"
    })

    if resp.status_code != 200:
        pytest.skip("API 请求失败: {}".format(resp.status_code))

    data = resp.json()
    if data.get("errno") != 0:
        errmsg = data.get("errmsg", "Unknown error")
        pytest.skip("登录失败: {}".format(errmsg))

    token = data["data"]["token"]
    admin_client.headers["X-Litemall-Admin-Token"] = token
    return token


class TestCrossSystemOrderFlow:
    """跨系统订单流程"""

    def test_user_order_to_admin_verify(self, wx_client, wx_user_token, admin_client, admin_token):
        """用户下单 -> 管理员验证"""
        # 1. 浏览商品
        print("\n=== Step 1: User browses goods ===")
        resp = wx_client.get("{}/goods/list".format(LOCAL_WX_API), params={"page": 1, "limit": 5})
        assert resp.status_code == 200
        data = resp.json()
        assert data["errno"] == 0

        goods_list = data["data"]["list"]
        assert len(goods_list) > 0

        goods = goods_list[0]
        goods_id = goods["id"]
        print("Selected goods: {} (ID: {})".format(goods["name"], goods_id))

        # 2. 添加到购物车
        print("\n=== Step 2: Add to cart ===")
        resp = wx_client.get("{}/goods/detail".format(LOCAL_WX_API), params={"id": goods_id})
        goods_detail = resp.json()["data"]

        products = goods_detail.get("productList", [])
        product_id = None
        for p in products:
            if p.get("number", 0) > 0:
                product_id = p["id"]
                break

        assert product_id is not None, "No product with stock"

        resp = wx_client.post("{}/cart/add".format(LOCAL_WX_API), json={
            "goodsId": goods_id,
            "productId": product_id,
            "number": 1
        })
        assert resp.status_code == 200
        print("Added to cart")

        # 3. 结算
        print("\n=== Step 3: Checkout ===")
        resp = wx_client.get("{}/cart/checkout".format(LOCAL_WX_API))
        assert resp.status_code == 200
        checkout_data = resp.json()["data"]

        address_id = checkout_data.get("addressId")
        assert address_id is not None and address_id != 0
        print("Address ID: {}".format(address_id))

        # 4. 提交订单
        print("\n=== Step 4: Submit order ===")
        resp = wx_client.post("{}/order/submit".format(LOCAL_WX_API), json={
            "cartId": 0,
            "addressId": address_id,
            "couponId": -1,
            "message": "Cross-system test order"
        })
        assert resp.status_code == 200
        order_result = resp.json()
        assert order_result["errno"] == 0

        order_id = order_result["data"]["orderId"]
        order_sn = order_result["data"]["orderSn"]
        print("Order submitted: {}, ID: {}".format(order_sn, order_id))

        # 5. 管理员验证订单
        print("\n=== Step 5: Admin verifies order ===")
        resp = admin_client.get("{}/order/detail".format(LOCAL_ADMIN_API), params={"id": order_id})
        assert resp.status_code == 200
        admin_order = resp.json()["data"]

        assert admin_order is not None
        assert admin_order["orderInfo"]["id"] == order_id
        print("Admin verified order: {}".format(admin_order["orderInfo"]["orderSn"]))

        # 6. 验证订单状态
        print("\n=== Step 6: Verify order status ===")
        order_status = admin_order["orderInfo"]["orderStatus"]
        print("Order status: {} (101=pending payment)".format(order_status))
        assert order_status == 101

        # 7. 清理: 取消订单
        print("\n=== Step 7: Cleanup - Cancel order ===")
        resp = wx_client.post("{}/order/cancel".format(LOCAL_WX_API), json={"orderId": order_id})
        assert resp.status_code == 200
        print("Order cancelled")

        return {
            "order_id": order_id,
            "order_sn": order_sn,
            "goods_id": goods_id
        }
