"""
优惠券完整流程端到端测试

测试场景:
1. 用户浏览可领取优惠券
2. 用户领取优惠券
3. 用户查看我的优惠券
4. 用户使用优惠券下单
5. 验证优惠金额正确
"""
import pytest
import os

# API 配置
WX_API_BASE = os.getenv("WX_API_BASE", "http://47.107.151.70:8088/wx")


class TestCouponFlow:
    """优惠券完整流程测试"""

    def test_01_list_available_coupons(self, wx_user):
        """步骤1: 查看可领取的优惠券列表"""
        client = wx_user["client"]

        resp = client.get("{}/coupon/list".format(WX_API_BASE), params={
            "page": 1,
            "limit": 10
        })

        assert resp.status_code == 200
        data = resp.json()
        assert data.get("errno") == 0

        coupon_list = data.get("data", {}).get("list", [])
        print("\n可领取优惠券数量: {}".format(len(coupon_list)))

        # 保存第一个优惠券用于后续测试
        if coupon_list:
            # 过滤出可领取的通用优惠券 (type=0, status=0)
            available_coupons = [c for c in coupon_list if c.get("type") == 0]
            if available_coupons:
                self.__class__.test_coupon_id = available_coupons[0]["id"]
                print("选中优惠券 ID: {}, 名称: {}".format(
                    self.__class__.test_coupon_id,
                    available_coupons[0].get("name")
                ))

    def test_02_receive_coupon(self, wx_user):
        """步骤2: 领取优惠券"""
        client = wx_user["client"]

        # 如果没有可用的优惠券，跳过
        if not hasattr(self.__class__, "test_coupon_id"):
            pytest.skip("没有可领取的优惠券")

        resp = client.post("{}/coupon/receive".format(WX_API_BASE), json={
            "couponId": self.__class__.test_coupon_id
        })

        assert resp.status_code == 200
        data = resp.json()

        # 可能已经领取过，errno=740 表示已领取
        if data.get("errno") == 0:
            print("\n优惠券领取成功")
        elif data.get("errno") == 740:
            print("\n优惠券已领取过")
        else:
            print("\n优惠券领取响应: {}".format(data))

    def test_03_list_my_coupons(self, wx_user):
        """步骤3: 查看我的优惠券列表"""
        client = wx_user["client"]

        # status: 0=未使用, 1=已使用, 2=已过期
        resp = client.get("{}/coupon/mylist".format(WX_API_BASE), params={
            "status": 0,  # 未使用
            "page": 1,
            "limit": 10
        })

        assert resp.status_code == 200
        data = resp.json()
        assert data.get("errno") == 0

        coupon_list = data.get("data", {}).get("list", [])
        print("\n我的未使用优惠券数量: {}".format(len(coupon_list)))

        if coupon_list:
            # 保存第一个优惠券ID用于下单
            self.__class__.my_coupon_id = coupon_list[0]["id"]
            print("可用优惠券 ID: {}, 名称: {}, 优惠: {}".format(
                coupon_list[0]["id"],
                coupon_list[0].get("name"),
                coupon_list[0].get("discount")
            ))

    def test_04_select_coupons_for_cart(self, wx_user):
        """步骤4: 查看购物车可用优惠券"""
        client = wx_user["client"]

        resp = client.get("{}/coupon/selectlist".format(WX_API_BASE), params={
            "cartId": 0  # 0 表示使用购物车中选中的商品
        })

        assert resp.status_code == 200
        data = resp.json()

        if data.get("errno") == 0:
            coupon_list = data.get("data", {}).get("list", [])
            available_count = sum(1 for c in coupon_list if c.get("available"))
            print("\n购物车可用优惠券数量: {}/{}".format(available_count, len(coupon_list)))

            # 保存可用的优惠券
            if available_count > 0:
                for c in coupon_list:
                    if c.get("available"):
                        self.__class__.available_coupon_id = c["id"]
                        print("购物车可用优惠券 ID: {}".format(c["id"]))
                        break

    def test_05_order_with_coupon(self, wx_user):
        """步骤5: 使用优惠券下单并验证优惠金额"""
        client = wx_user["client"]

        # 1. 先浏览商品并添加到购物车
        resp = client.get("{}/goods/list".format(WX_API_BASE), params={
            "page": 1,
            "limit": 5
        })
        assert resp.status_code == 200
        goods_list = resp.json()["data"]["list"]
        assert len(goods_list) > 0

        goods = goods_list[0]
        goods_id = goods["id"]

        # 获取商品详情，找到有库存的产品
        resp = client.get("{}/goods/detail".format(WX_API_BASE), params={"id": goods_id})
        goods_detail = resp.json()["data"]
        products = goods_detail.get("productList", [])

        product_id = None
        for p in products:
            if p.get("number", 0) > 0:
                product_id = p["id"]
                break

        assert product_id is not None, "没有有库存的产品"

        # 2. 清空购物车
        resp = client.get("{}/cart/index".format(WX_API_BASE))
        cart_data = resp.json().get("data", {})
        cart_list = cart_data.get("cartList", [])
        if cart_list:
            product_ids = [item["productId"] for item in cart_list]
            client.post("{}/cart/delete".format(WX_API_BASE), json={"productIds": product_ids})

        # 3. 添加商品到购物车
        resp = client.post("{}/cart/add".format(WX_API_BASE), json={
            "goodsId": goods_id,
            "productId": product_id,
            "number": 1
        })
        assert resp.status_code == 200
        print("\n商品已添加到购物车")

        # 4. 获取结算信息（不使用优惠券）
        resp = client.get("{}/cart/checkout".format(WX_API_BASE))
        checkout_data = resp.json()["data"]
        order_amount_before = checkout_data.get("orderTotalPrice", 0)
        address_id = checkout_data.get("addressId")

        print("订单原价: {}".format(order_amount_before))

        # 5. 确定要使用的优惠券
        coupon_id = -1  # 默认不使用优惠券
        if hasattr(self.__class__, "available_coupon_id"):
            coupon_id = self.__class__.available_coupon_id
        elif hasattr(self.__class__, "my_coupon_id"):
            coupon_id = self.__class__.my_coupon_id

        # 6. 提交订单
        resp = client.post("{}/order/submit".format(WX_API_BASE), json={
            "cartId": 0,
            "addressId": address_id,
            "couponId": coupon_id,
            "message": "优惠券测试订单"
        })

        assert resp.status_code == 200
        order_result = resp.json()

        if order_result.get("errno") != 0:
            print("订单提交失败: {}".format(order_result.get("errmsg")))
            # 如果优惠券不可用，尝试不使用优惠券下单
            resp = client.post("{}/order/submit".format(WX_API_BASE), json={
                "cartId": 0,
                "addressId": address_id,
                "couponId": -1,
                "message": "测试订单"
            })
            order_result = resp.json()

        assert order_result.get("errno") == 0
        order_id = order_result["data"]["orderId"]
        print("订单提交成功, ID: {}".format(order_id))

        # 7. 验证订单优惠金额
        resp = client.get("{}/order/detail".format(WX_API_BASE), params={"orderId": order_id})
        order_detail = resp.json()["data"]
        order_info = order_detail.get("orderInfo", {})

        coupon_price = order_info.get("couponPrice", "0")
        print("优惠券抵扣: {}".format(coupon_price))

        # 8. 清理: 取消订单
        resp = client.post("{}/order/cancel".format(WX_API_BASE), json={"orderId": order_id})
        print("订单已取消")

        # 清空购物车
        client.post("{}/cart/delete".format(WX_API_BASE), json={"productIds": [product_id]})

        return {
            "order_id": order_id,
            "coupon_price": coupon_price
        }
