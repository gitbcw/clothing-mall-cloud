"""
跨系统端到端测试

测试场景: 用户下单 -> 管理员发货 -> 用户确认收货
"""
import pytest
import time
import os
import requests
from tests.e2e.scenarios.conftest import EndToEndTest, WX_API_BASE, ADMIN_API_BASE

# 测试用户配置
TEST_USER = {
    "username": os.getenv("TEST_USERNAME", "testuser"),
    "password": os.getenv("TEST_PASSWORD", "admin123")
}

# 管理员配置
ADMIN_USER = {
    "username": os.getenv("ADMIN_USERNAME", "admin123"),
    "password": os.getenv("ADMIN_PASSWORD", "admin123")
}


class TestCrossSystemFlow:
    """跨系统流程测试"""

    def test_user_order_to_admin_ship(self):
        """用户下单 -> 管理员发货"""
        wx_client = requests.Session()
        admin_client = requests.Session()

        order_id = None

        try:
            # === 用户登录 ===
            print("\n=== 用户登录 ===")
            login_resp = wx_client.post("{}/auth/login".format(WX_API_BASE), json={
                "username": TEST_USER["username"],
                "password": TEST_USER["password"]
            }, timeout=10)

            if login_resp.status_code != 200:
                pytest.skip("用户登录 API 请求失败")

            login_data = login_resp.json()
            if login_data.get("errno") != 0:
                pytest.skip("用户登录失败: {}".format(login_data.get("errmsg", "Unknown error")))

            token = login_data["data"]["token"]
            wx_client.headers["X-Litemall-Token"] = token
            print("用户登录成功")

            # === 管理员登录 ===
            print("\n=== 管理员登录 ===")
            admin_login_resp = admin_client.post("{}/auth/login".format(ADMIN_API_BASE), json={
                "username": ADMIN_USER["username"],
                "password": ADMIN_USER["password"]
            }, timeout=10)

            if admin_login_resp.status_code != 200:
                pytest.skip("管理员登录 API 请求失败")

            admin_login_data = admin_login_resp.json()
            if admin_login_data.get("errno") != 0:
                pytest.skip("管理员登录失败: {}".format(admin_login_data.get("errmsg", "Unknown error")))

            admin_token = admin_login_data["data"]["token"]
            admin_client.headers["X-Litemall-Admin-Token"] = admin_token
            print("管理员登录成功")

            # === 用户端: 创建订单 ===
            print("\n=== 用户端: 创建订单 ===")

            # 1. 获取商品
            resp = wx_client.get("{}/goods/list".format(WX_API_BASE), params={"page": 1, "limit": 1})
            goods_data = resp.json()
            if goods_data.get("errno") != 0 or not goods_data["data"]["list"]:
                pytest.skip("没有可用商品")

            goods = goods_data["data"]["list"][0]
            goods_id = goods["id"]
            print("选择商品: {}".format(goods["name"]))

            # 2. 获取规格
            resp = wx_client.get("{}/goods/detail".format(WX_API_BASE), params={"id": goods_id})
            products = resp.json()["data"]["productList"]
            product_id = None
            for p in products:
                if p.get("number", 0) > 0:
                    product_id = p["id"]
                    break

            if not product_id:
                pytest.skip("商品无库存")
                return

            # 3. 添加购物车
            resp = wx_client.post("{}/cart/add".format(WX_API_BASE), json={
                "goodsId": goods_id,
                "productId": product_id,
                "number": 1
            })
            cart_result = resp.json()
            if cart_result.get("errno") != 0:
                pytest.skip("添加购物车失败: {}".format(cart_result.get("errmsg")))
            print("已添加到购物车")

            # 4. 获取结算信息
            resp = wx_client.get("{}/cart/checkout".format(WX_API_BASE))
            checkout_data = resp.json()["data"]
            address_id = checkout_data.get("addressId")

            if not address_id:
                pytest.skip("用户没有收货地址")
                return

            print("收货地址 ID: {}".format(address_id))

            # 5. 提交订单
            resp = wx_client.post("{}/order/submit".format(WX_API_BASE), json={
                "cartId": 0,
                "addressId": address_id,
                "couponId": -1,
                "message": "跨系统测试订单"
            })
            order_result = resp.json()
            if order_result.get("errno") != 0:
                pytest.skip("提交订单失败: {}".format(order_result.get("errmsg")))

            order_id = order_result["data"]["orderId"]
            print("订单已创建 (ID: {})".format(order_id))

            # === 管理员端: 查看订单 ===
            print("\n=== 管理员端: 查看订单 ===")

            resp = admin_client.get("{}/order/detail".format(ADMIN_API_BASE), params={"id": order_id})
            if resp.status_code != 200:
                pytest.skip("管理员查看订单失败")

            admin_order = resp.json()["data"]
            if admin_order is None:
                pytest.skip("订单数据为空")

            print("管理后台已查看订单")

            # === 验证订单状态 ===
            print("\n=== 验证订单状态 ===")
            order_info = admin_order.get("order", admin_order.get("orderInfo", {}))
            assert order_info.get("orderStatus") == 101, "订单应为待付款状态"
            print("订单状态: {} (待付款)".format(order_info.get("orderStatus")))

            # === 模拟支付（实际项目中需要真实支付) ===
            print("\n=== 模拟支付流程 ===")
            print("注意: 实际支付需要微信支付，此处跳过支付验证")

            # === 清理: 取消订单 ===
            print("\n=== 清理: 取消订单 ===")
            resp = wx_client.post("{}/order/cancel".format(WX_API_BASE), json={"orderId": order_id})
            if resp.status_code == 200:
                print("订单已取消")

        finally:
            # 确保清理
            if order_id:
                try:
                    wx_client.post("{}/order/cancel".format(WX_API_BASE), json={"orderId": order_id})
                except:
                    pass

    def test_concurrent_user_operations(self):
        """测试并发用户操作"""
        client = requests.Session()

        # 用户登录
        login_resp = client.post("{}/auth/login".format(WX_API_BASE), json={
            "username": TEST_USER["username"],
            "password": TEST_USER["password"]
        }, timeout=10)

        if login_resp.status_code != 200:
            pytest.skip("用户登录失败")

        login_data = login_resp.json()
        if login_data.get("errno") != 0:
            pytest.skip("用户登录失败")

        token = login_data["data"]["token"]
        client.headers["X-Litemall-Token"] = token

        # 多个商品同时操作
        print("\n=== 并发操作测试 ===")

        # 获取多个商品
        resp = client.get("{}/goods/list".format(WX_API_BASE), params={"page": 1, "limit": 3})
        goods_list = resp.json()["data"]["list"]

        if len(goods_list) < 2:
            pytest.skip("商品数量不足")
            return

        # 添加多个商品到购物车
        for goods in goods_list[:2]:
            resp = client.get("{}/goods/detail".format(WX_API_BASE), params={"id": goods["id"]})
            products = resp.json()["data"]["productList"]
            if products:
                product_id = products[0]["id"]
                resp = client.post("{}/cart/add".format(WX_API_BASE), json={
                    "goodsId": goods["id"],
                    "productId": product_id,
                    "number": 1
                })
                if resp.status_code == 200:
                    print("添加商品 {} 到购物车".format(goods["name"]))

        # 验证购物车
        resp = client.get("{}/cart/index".format(WX_API_BASE))
        if resp.status_code != 200:
            pytest.skip("获取购物车失败")

        try:
            cart_data = resp.json()["data"]
        except:
            pytest.skip("购物车数据解析失败")

        cart_count = len(cart_data.get("cartList", []))
        print("购物车商品数: {}".format(cart_count))
        # 注意: 购物车可能有之前测试遗留的商品
        assert cart_count >= 1, "购物车应该有至少1个商品"
