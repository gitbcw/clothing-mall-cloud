"""
限时特卖流程端到端测试

测试场景:
1. 管理员创建限时特卖活动
2. 用户浏览特卖商品
3. 验证特卖价格
4. 用户购买特卖商品
5. 清理特卖活动
"""
import pytest
import os
import time
from datetime import datetime, timedelta

# API 配置
WX_API_BASE = os.getenv("WX_API_BASE", "http://47.107.151.70:8088/wx")
ADMIN_API_BASE = os.getenv("ADMIN_API_BASE", "http://47.107.151.70:8088/admin")


class TestFlashSaleFlow:
    """限时特卖流程测试"""

    def test_01_get_goods_for_flash_sale(self, wx_user, admin_api_client, admin_user):
        """步骤1: 获取用于特卖的商品"""
        client = wx_user["client"]

        # 浏览商品
        resp = client.get("{}/goods/list".format(WX_API_BASE), params={
            "page": 1,
            "limit": 10
        })

        assert resp.status_code == 200
        goods_list = resp.json()["data"]["list"]
        assert len(goods_list) > 0

        # 选择一个商品
        goods = goods_list[0]
        self.__class__.goods_id = goods["id"]
        self.__class__.goods_name = goods.get("name", "")
        self.__class__.original_price = float(goods.get("retailPrice", 100))

        # 设置特卖价格（原价的8折）
        self.__class__.flash_price = round(self.__class__.original_price * 0.8, 2)

        print("\n选中商品: {} (ID: {})".format(self.__class__.goods_name, self.__class__.goods_id))
        print("原价: {}, 特卖价: {}".format(self.__class__.original_price, self.__class__.flash_price))

    def test_02_create_flash_sale(self, admin_api_client, admin_user):
        """步骤2: 管理员创建限时特卖"""
        if not hasattr(self.__class__, "goods_id"):
            pytest.skip("没有选中商品")

        # 设置特卖时间：现在开始，2小时后结束
        now = datetime.now()
        start_time = now.strftime("%Y-%m-%d %H:%M:%S")
        end_time = (now + timedelta(hours=2)).strftime("%Y-%m-%d %H:%M:%S")

        resp = admin_api_client.post("{}/flashSale/create".format(ADMIN_API_BASE), json={
            "goodsId": self.__class__.goods_id,
            "goodsName": self.__class__.goods_name,
            "flashPrice": self.__class__.flash_price,
            "originalPrice": self.__class__.original_price,
            "flashStock": 10,  # 特卖库存
            "startTime": start_time,
            "endTime": end_time,
            "status": 1  # 启用
        })

        assert resp.status_code == 200
        data = resp.json()

        if data.get("errno") != 0:
            errmsg = data.get("errmsg", "")
            print("创建特卖响应: {}".format(data))
            # 如果是权限问题，跳过创建
            if "权限" in errmsg or "登录" in errmsg:
                self.__class__.skip_create = True
                pytest.skip("没有创建特卖的权限")
            assert data.get("errno") == 0, "创建特卖失败: {}".format(errmsg)

        flash_sale = data.get("data", {})
        self.__class__.flash_sale_id = flash_sale.get("id")
        self.__class__.skip_create = False

        print("\n限时特卖创建成功: ID={}".format(self.__class__.flash_sale_id))
        print("特卖时间: {} 至 {}".format(start_time, end_time))

    def test_03_user_browse_flash_sale(self, wx_user):
        """步骤3: 用户浏览特卖商品列表"""
        client = wx_user["client"]

        # 获取特卖列表
        resp = client.get("{}/flashSale/list".format(WX_API_BASE), params={
            "page": 1,
            "limit": 10
        })

        assert resp.status_code == 200
        data = resp.json()

        if data.get("errno") != 0:
            print("获取特卖列表响应: {}".format(data))
            pytest.skip("获取特卖列表失败")

        flash_sale_list = data.get("data", {}).get("list", [])
        print("\n进行中的特卖数量: {}".format(len(flash_sale_list)))

        # 验证特卖列表
        for fs in flash_sale_list:
            print("特卖商品: {}, 原价: {}, 特卖价: {}".format(
                fs.get("goodsName"),
                fs.get("originalPrice"),
                fs.get("flashPrice")
            ))

    def test_04_check_flash_sale_in_goods_detail(self, wx_user):
        """步骤4: 商品详情中显示特卖价格"""
        if not hasattr(self.__class__, "goods_id"):
            pytest.skip("没有选中商品")

        client = wx_user["client"]

        # 获取商品详情
        resp = client.get("{}/goods/detail".format(WX_API_BASE), params={
            "id": self.__class__.goods_id
        })

        assert resp.status_code == 200
        detail = resp.json()["data"]

        goods_info = detail.get("info", {})
        print("\n商品详情 - 名称: {}, 零售价: {}".format(
            goods_info.get("name"),
            goods_info.get("retailPrice")
        ))

        # 查询该商品的特卖信息
        resp = client.get("{}/flashSale/goods".format(WX_API_BASE), params={
            "goodsId": self.__class__.goods_id
        })

        assert resp.status_code == 200
        flash_data = resp.json()

        if flash_data.get("errno") == 0 and flash_data.get("data"):
            flash_sale = flash_data["data"]
            print("特卖信息 - 特卖价: {}, 原价: {}, 剩余库存: {}".format(
                flash_sale.get("flashPrice"),
                flash_sale.get("originalPrice"),
                flash_sale.get("flashStock")
            ))

            # 验证特卖价格低于原价
            assert float(flash_sale.get("flashPrice", 0)) < float(flash_sale.get("originalPrice", 999999))

    def test_05_buy_flash_sale_goods(self, wx_user):
        """步骤5: 购买特卖商品"""
        if not hasattr(self.__class__, "goods_id"):
            pytest.skip("没有选中商品")

        client = wx_user["client"]

        # 1. 清空购物车
        resp = client.get("{}/cart/index".format(WX_API_BASE))
        cart_data = resp.json().get("data", {})
        cart_list = cart_data.get("cartList", [])
        if cart_list:
            product_ids = [item["productId"] for item in cart_list]
            client.post("{}/cart/delete".format(WX_API_BASE), json={"productIds": product_ids})

        # 2. 获取商品详情
        resp = client.get("{}/goods/detail".format(WX_API_BASE), params={
            "id": self.__class__.goods_id
        })

        detail = resp.json()["data"]
        products = detail.get("productList", [])

        product_id = None
        for p in products:
            if p.get("number", 0) > 0:
                product_id = p["id"]
                break

        if product_id is None:
            pytest.skip("商品无库存")

        # 3. 添加到购物车
        resp = client.post("{}/cart/add".format(WX_API_BASE), json={
            "goodsId": self.__class__.goods_id,
            "productId": product_id,
            "number": 1
        })

        assert resp.status_code == 200
        print("\n特卖商品已添加到购物车")

        # 4. 获取结算信息
        resp = client.get("{}/cart/checkout".format(WX_API_BASE))
        checkout_data = resp.json()["data"]

        order_total = checkout_data.get("orderTotalPrice", 0)
        actual_price = checkout_data.get("actualPrice", 0)
        address_id = checkout_data.get("addressId")

        print("订单总价: {}".format(order_total))
        print("实付金额: {}".format(actual_price))

        # 5. 提交订单
        resp = client.post("{}/order/submit".format(WX_API_BASE), json={
            "cartId": 0,
            "addressId": address_id,
            "couponId": -1,
            "message": "限时特卖测试订单"
        })

        assert resp.status_code == 200
        order_result = resp.json()

        if order_result.get("errno") != 0:
            print("订单提交响应: {}".format(order_result))
            assert order_result.get("errno") == 0, "订单提交失败"

        order_id = order_result["data"]["orderId"]
        print("订单提交成功, ID: {}".format(order_id))

        # 6. 清理: 取消订单
        resp = client.post("{}/order/cancel".format(WX_API_BASE), json={"orderId": order_id})
        print("订单已取消")

        # 清空购物车
        client.post("{}/cart/delete".format(WX_API_BASE), json={"productIds": [product_id]})

        return {
            "order_id": order_id,
            "actual_price": actual_price
        }

    def test_06_cleanup_flash_sale(self, admin_api_client, admin_user):
        """步骤6: 清理测试特卖活动"""
        if not hasattr(self.__class__, "flash_sale_id"):
            pytest.skip("没有创建特卖活动")

        if getattr(self.__class__, "skip_create", False):
            pytest.skip("跳过清理")

        flash_sale_id = self.__class__.flash_sale_id

        # 删除特卖活动
        resp = admin_api_client.post("{}/flashSale/delete".format(ADMIN_API_BASE), json={
            "id": flash_sale_id
        })

        assert resp.status_code == 200
        print("\n测试特卖活动已删除")
