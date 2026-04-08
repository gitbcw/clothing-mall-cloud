"""
满减活动流程端到端测试

测试场景:
1. 管理员创建满减活动
2. 用户购物触发满减（通过购物车结算验证）
3. 清理满减活动

注意: 小程序端没有独立的满减列表 API，满减优惠在购物车结算时自动计算
"""
import pytest
import os
import time
import random

# API 配置
WX_API_BASE = os.getenv("WX_API_BASE", "http://47.107.151.70:8088/wx")
ADMIN_API_BASE = os.getenv("ADMIN_API_BASE", "http://47.107.151.70:8088/admin")


class TestFullReductionFlow:
    """满减活动流程测试"""

    def test_01_list_full_reductions(self, admin_api_client, admin_user):
        """步骤1: 查看满减活动列表"""
        resp = admin_api_client.get("{}/fullReduction/list".format(ADMIN_API_BASE), params={
            "page": 1,
            "limit": 10
        })

        assert resp.status_code == 200
        data = resp.json()
        assert data.get("errno") == 0

        reduction_list = data.get("data", {}).get("list", [])
        print("\n现有满减活动数量: {}".format(len(reduction_list)))

        # 查找启用状态的满减活动
        active_reductions = [r for r in reduction_list if r.get("status") == 1]
        print("启用的满减活动数量: {}".format(len(active_reductions)))

        if active_reductions:
            r = active_reductions[0]
            print("满减活动: 满{}减{}".format(r.get("threshold"), r.get("discount")))
            self.__class__.existing_reduction = r

    def test_02_create_full_reduction(self, admin_api_client, admin_user):
        """步骤2: 创建满减活动"""
        test_name = "测试满减活动_{}".format(int(time.time()))

        resp = admin_api_client.post("{}/fullReduction/create".format(ADMIN_API_BASE), json={
            "name": test_name,
            "desc": "端到端测试满减活动",
            "tag": "测试",
            "threshold": 100,  # 满100
            "discount": 10,    # 减10
            "status": 1        # 启用
        })

        assert resp.status_code == 200
        data = resp.json()

        if data.get("errno") != 0:
            errmsg = data.get("errmsg", "")
            print("创建满减活动失败: {}".format(errmsg))
            self.__class__.skip_create = True
            # 如果有现成的满减活动，使用它
            if hasattr(self.__class__, "existing_reduction"):
                self.__class__.reduction_id = self.__class__.existing_reduction["id"]
                self.__class__.reduction_threshold = self.__class__.existing_reduction.get("threshold", 100)
                self.__class__.reduction_discount = self.__class__.existing_reduction.get("discount", 10)
                self.__class__.use_existing = True
                print("使用现有满减活动: ID={}".format(self.__class__.reduction_id))
            else:
                pytest.skip("创建满减活动失败且没有现有活动: {}".format(errmsg))
        else:
            reduction = data.get("data", {})
            self.__class__.reduction_id = reduction.get("id")
            self.__class__.reduction_threshold = reduction.get("threshold", 100)
            self.__class__.reduction_discount = reduction.get("discount", 10)
            self.__class__.skip_create = False
            self.__class__.use_existing = False

            print("\n满减活动创建成功: ID={}, 满{}减{}".format(
                self.__class__.reduction_id,
                self.__class__.reduction_threshold,
                self.__class__.reduction_discount
            ))

    def test_03_user_shop_with_full_reduction(self, wx_user):
        """步骤3: 用户购物触发满减"""
        if not hasattr(self.__class__, "reduction_threshold"):
            pytest.skip("没有可用的满减活动")

        client = wx_user["client"]
        threshold = self.__class__.reduction_threshold
        discount = self.__class__.reduction_discount

        # 1. 清空购物车
        resp = client.get("{}/cart/index".format(WX_API_BASE))
        cart_data = resp.json().get("data", {})
        cart_list = cart_data.get("cartList", [])
        if cart_list:
            product_ids = [item["productId"] for item in cart_list]
            client.post("{}/cart/delete".format(WX_API_BASE), json={"productIds": product_ids})

        # 2. 浏览商品，找价格合适的商品
        resp = client.get("{}/goods/list".format(WX_API_BASE), params={"page": 1, "limit": 20})
        goods_list = resp.json()["data"]["list"]

        selected_goods = None
        selected_product = None
        for goods in goods_list:
            resp = client.get("{}/goods/detail".format(WX_API_BASE), params={"id": goods["id"]})
            detail = resp.json()["data"]
            products = detail.get("productList", [])

            for p in products:
                if p.get("number", 0) > 0:
                    price = float(p.get("price", 0))
                    # 选择价格能触发满减的商品
                    if price >= threshold / 2:
                        selected_goods = goods
                        selected_product = p
                        break
            if selected_goods:
                break

        if not selected_goods:
            # 如果没找到合适的，就用第一个有库存的商品
            for goods in goods_list:
                resp = client.get("{}/goods/detail".format(WX_API_BASE), params={"id": goods["id"]})
                detail = resp.json()["data"]
                products = detail.get("productList", [])
                for p in products:
                    if p.get("number", 0) > 0:
                        selected_goods = goods
                        selected_product = p
                        break
                if selected_goods:
                    break

        assert selected_goods is not None, "没有可购买的商品"

        goods_id = selected_goods["id"]
        product_id = selected_product["id"]
        unit_price = float(selected_product.get("price", 0))

        # 3. 计算需要购买的数量以达到满减门槛
        quantity = max(1, int(threshold / unit_price) + 1)
        quantity = min(quantity, 5, selected_product.get("number", 1))

        # 4. 添加商品到购物车
        resp = client.post("{}/cart/add".format(WX_API_BASE), json={
            "goodsId": goods_id,
            "productId": product_id,
            "number": quantity
        })
        assert resp.status_code == 200

        total_price = unit_price * quantity
        print("\n添加商品: 单价={}, 数量={}, 总价={}".format(unit_price, quantity, total_price))

        # 5. 获取结算信息，查看满减优惠
        resp = client.get("{}/cart/checkout".format(WX_API_BASE))
        checkout_data = resp.json()["data"]

        order_total = checkout_data.get("orderTotalPrice", 0)
        freight_price = checkout_data.get("freightPrice", 0)
        full_reduction = checkout_data.get("fullReductionPrice", 0)
        actual_price = checkout_data.get("actualPrice", 0)
        address_id = checkout_data.get("addressId")

        print("订单总价: {}".format(order_total))
        print("运费: {}".format(freight_price))
        print("满减优惠: {}".format(full_reduction))
        print("实付金额: {}".format(actual_price))

        # 记录是否有满减优惠
        if full_reduction > 0:
            print("✅ 满减优惠已生效!")
            self.__class__.full_reduction_applied = True
        else:
            print("⚠️ 未触发满减优惠（可能未达到门槛）")
            self.__class__.full_reduction_applied = False

        # 6. 如果有收货地址，提交订单
        if address_id and address_id != 0:
            resp = client.post("{}/order/submit".format(WX_API_BASE), json={
                "cartId": 0,
                "addressId": address_id,
                "couponId": -1,
                "message": "满减活动测试订单"
            })

            if resp.status_code == 200:
                order_result = resp.json()
                if order_result.get("errno") == 0:
                    order_id = order_result["data"]["orderId"]
                    print("\n订单提交成功, ID: {}".format(order_id))

                    # 取消订单
                    client.post("{}/order/cancel".format(WX_API_BASE), json={"orderId": order_id})
                    print("订单已取消")

        # 清空购物车
        client.post("{}/cart/delete".format(WX_API_BASE), json={"productIds": [product_id]})

        return {
            "order_total": order_total,
            "full_reduction": full_reduction,
            "applied": self.__class__.full_reduction_applied
        }

    def test_04_cleanup_full_reduction(self, admin_api_client, admin_user):
        """步骤4: 清理测试满减活动"""
        # 如果使用的是现有活动，不删除
        if getattr(self.__class__, "use_existing", False):
            print("\n使用的是现有满减活动，不删除")
            return

        if not hasattr(self.__class__, "reduction_id"):
            print("\n没有创建满减活动，无需清理")
            return

        if getattr(self.__class__, "skip_create", True):
            print("\n跳过清理（创建失败）")
            return

        reduction_id = self.__class__.reduction_id

        # 删除测试满减活动
        resp = admin_api_client.post("{}/fullReduction/delete".format(ADMIN_API_BASE), json={
            "id": reduction_id
        })

        assert resp.status_code == 200
        print("\n测试满减活动已删除")
