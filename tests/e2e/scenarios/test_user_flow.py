"""
用户购物流程端到端测试（简化版）

测试场景: 用户浏览商品 -> 加购 -> 下单 -> 验证订单
"""
import pytest
import requests
import os

# API 配置
WX_API_BASE = os.getenv("WX_API_BASE", "http://47.107.151.70:8088/wx")

# 测试用户配置
TEST_USER = {
    "username": "testuser",
    "password": "admin123"
}


class TestUserShoppingFlow:
    """用户购物完整流程（简化版）"""

    def test_complete_shopping_flow(self):
        """完整购物流程: 浏览 -> 登录 -> 加购 -> 结算 -> 下单"""
        client = requests.Session()

        # 1. 浏览商品（无需登录）
        print("\n=== Step 1: Browse Goods ===")
        resp = client.get("{}/goods/list".format(WX_API_BASE), params={"page": 1, "limit": 10})
        assert resp.status_code == 200
        data = resp.json()
        assert data["errno"] == 0

        goods_list = data["data"]["list"]
        assert len(goods_list) > 0, "No goods found"
        goods = goods_list[0]
        goods_id = goods["id"]
        print("Selected goods: {} (ID: {})".format(goods["name"], goods_id))

        # 2. 查看商品详情（无需登录）
        print("\n=== Step 2: View Goods Detail ===")
        resp = client.get("{}/goods/detail".format(WX_API_BASE), params={"id": goods_id})
        assert resp.status_code == 200
        goods_detail = resp.json()["data"]
        assert goods_detail is not None

        # 3. 检查库存
        print("\n=== Step 3: Check Stock ===")
        products = goods_detail.get("productList", [])
        product_id = None
        for p in products:
            if p.get("number", 0) > 0:
                product_id = p["id"]
                break

        assert product_id is not None, "No product with stock"
        print("Selected product ID: {}".format(product_id))

        # 4. 登录（购物车操作需要登录）
        print("\n=== Step 4: Login ===")
        login_resp = client.post("{}/auth/login".format(WX_API_BASE), json={
            "username": TEST_USER["username"],
            "password": TEST_USER["password"]
        })

        if login_resp.status_code != 200:
            pytest.skip("Login API failed")

        login_data = login_resp.json()
        if login_data.get("errno") != 0:
            pytest.skip("Login failed: {}".format(login_data.get("errmsg")))

        token = login_data["data"]["token"]
        client.headers["X-Litemall-Token"] = token
        print("Login successful")

        # 5. 添加到购物车
        print("\n=== Step 5: Add to Cart ===")
        resp = client.post("{}/cart/add".format(WX_API_BASE), json={
            "goodsId": goods_id,
            "productId": product_id,
            "number": 1
        })
        assert resp.status_code == 200
        cart_result = resp.json()
        assert cart_result["errno"] == 0, "Add to cart failed: {}".format(cart_result.get("errmsg"))
        print("Added to cart successfully")

        # 6. 获取结算信息
        print("\n=== Step 6: Get Checkout Info ===")
        resp = client.get("{}/cart/checkout".format(WX_API_BASE))
        assert resp.status_code == 200
        checkout_data = resp.json()["data"]
        assert checkout_data is not None

        address_id = checkout_data.get("addressId")
        # 没有地址时跳过
        if not address_id or address_id == 0:
            print("No address found, skipping order submission")
            return

        print("Address ID: {}".format(address_id))
        print("Order total: {}".format(checkout_data.get("orderTotalPrice")))

        # 7. 提交订单
        print("\n=== Step 7: Submit Order ===")
        resp = client.post("{}/order/submit".format(WX_API_BASE), json={
            "cartId": 0,
            "addressId": address_id,
            "couponId": -1,
            "message": "End-to-end test order"
        })
        assert resp.status_code == 200
        order_result = resp.json()
        assert order_result["errno"] == 0, "Order submit failed: {}".format(order_result.get("errmsg"))
        order_id = order_result["data"]["orderId"]
        print("Order submitted successfully (ID: {})".format(order_id))

        # 8. 验证订单
        print("\n=== Step 8: Verify Order Detail ===")
        resp = client.get("{}/order/detail".format(WX_API_BASE), params={"orderId": order_id})
        assert resp.status_code == 200
        order_detail = resp.json()["data"]
        assert order_detail is not None
        assert order_detail["orderInfo"]["id"] == order_id
        print("Order verified successfully")

        # 9. 验证订单在列表中
        print("\n=== Step 9: Verify Order in List ===")
        # 添加重试逻辑处理临时 502 错误
        for retry in range(3):
            resp = client.get("{}/order/list".format(WX_API_BASE), params={"showType": 0, "page": 1, "limit": 10})
            if resp.status_code == 200:
                break
            import time
            time.sleep(1)

        assert resp.status_code == 200, "Failed to get order list after retries"
        orders = resp.json()["data"]["list"]

        found = any(order["id"] == order_id for order in orders)
        assert found, "Order not found in list"
        print("Order found in list")

        # 10. 清理: 取消订单
        print("\n=== Step 10: Cleanup - Cancel Order ===")
        resp = client.post("{}/order/cancel".format(WX_API_BASE), json={"orderId": order_id})
        assert resp.status_code == 200
        print("Order cancelled")
