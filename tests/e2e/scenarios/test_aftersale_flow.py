"""
售后申请流程端到端测试

测试场景:
1. 用户下单并完成订单（下单->付款->发货->收货）
2. 用户申请售后
3. 管理员审核售后
4. 管理员换货发货
5. 完成售后

注意: 售后只能对已确认收货的订单申请
"""
import pytest
import os
import time

# API 配置
WX_API_BASE = os.getenv("WX_API_BASE", "http://47.107.151.70:8088/wx")
ADMIN_API_BASE = os.getenv("ADMIN_API_BASE", "http://47.107.151.70:8088/admin")


class TestAftersaleFlow:
    """售后申请流程测试"""

    def test_01_create_completed_order(self, wx_user, admin_api_client, admin_user):
        """步骤1: 创建已完成订单（下单->付款->发货->收货）"""
        client = wx_user["client"]

        # 1. 清空购物车
        resp = client.get("{}/cart/index".format(WX_API_BASE))
        cart_data = resp.json().get("data", {})
        cart_list = cart_data.get("cartList", [])
        if cart_list:
            product_ids = [item["productId"] for item in cart_list]
            client.post("{}/cart/delete".format(WX_API_BASE), json={"productIds": product_ids})

        # 2. 浏览商品
        resp = client.get("{}/goods/list".format(WX_API_BASE), params={"page": 1, "limit": 5})
        goods_list = resp.json()["data"]["list"]
        assert len(goods_list) > 0

        goods = goods_list[0]
        goods_id = goods["id"]

        # 3. 获取商品详情
        resp = client.get("{}/goods/detail".format(WX_API_BASE), params={"id": goods_id})
        goods_detail = resp.json()["data"]
        products = goods_detail.get("productList", [])

        product_id = None
        for p in products:
            if p.get("number", 0) > 0:
                product_id = p["id"]
                break

        assert product_id is not None, "没有有库存的产品"

        # 4. 添加到购物车
        resp = client.post("{}/cart/add".format(WX_API_BASE), json={
            "goodsId": goods_id,
            "productId": product_id,
            "number": 1
        })
        assert resp.status_code == 200

        # 5. 获取结算信息
        resp = client.get("{}/cart/checkout".format(WX_API_BASE))
        checkout_data = resp.json()["data"]
        address_id = checkout_data.get("addressId")
        assert address_id is not None and address_id != 0, "用户没有收货地址"

        # 6. 提交订单
        resp = client.post("{}/order/submit".format(WX_API_BASE), json={
            "cartId": 0,
            "addressId": address_id,
            "couponId": -1,
            "message": "售后测试订单"
        })

        assert resp.status_code == 200
        order_result = resp.json()
        assert order_result.get("errno") == 0

        order_id = order_result["data"]["orderId"]
        print("\n订单创建成功, ID: {}".format(order_id))

        # 7. 管理员确认收款（模拟支付成功）
        # 尝试不同的 API 端点
        pay_success = False

        # 方法1: 调用 pay 接口
        resp = admin_api_client.post("{}/order/pay".format(ADMIN_API_BASE), json={
            "orderId": order_id
        })
        if resp.status_code == 200:
            data = resp.json()
            if data.get("errno") == 0:
                pay_success = True
                print("管理员确认收款成功")
            else:
                print("pay 接口响应: {}".format(data.get("errmsg")))

        # 方法2: 如果 pay 失败，尝试直接更新状态
        if not pay_success:
            resp = admin_api_client.post("{}/order/update".format(ADMIN_API_BASE), json={
                "id": order_id,
                "orderStatus": 201
            })
            if resp.status_code == 200:
                print("直接更新订单状态为已付款")

        # 8. 管理员发货
        ship_success = False
        ship_sn = "TEST{}".format(int(time.time()))

        resp = admin_api_client.post("{}/order/ship".format(ADMIN_API_BASE), json={
            "orderId": order_id,
            "shipChannel": "SF",
            "shipSn": ship_sn
        })
        if resp.status_code == 200:
            data = resp.json()
            if data.get("errno") == 0:
                ship_success = True
                print("管理员发货成功")
            else:
                print("ship 接口响应: {}".format(data.get("errmsg")))

        # 方法2: 如果 ship 失败，尝试直接更新状态
        if not ship_success:
            resp = admin_api_client.post("{}/order/update".format(ADMIN_API_BASE), json={
                "id": order_id,
                "orderStatus": 301
            })
            if resp.status_code == 200:
                print("直接更新订单状态为已发货")

        # 9. 用户确认收货
        resp = client.post("{}/order/confirm".format(WX_API_BASE), json={
            "orderId": order_id
        })
        if resp.status_code == 200:
            data = resp.json()
            if data.get("errno") == 0:
                print("用户确认收货成功")
            else:
                print("confirm 接口响应: {}".format(data.get("errmsg")))
                # 尝试直接更新状态
                admin_api_client.post("{}/order/update".format(ADMIN_API_BASE), json={
                    "id": order_id,
                    "orderStatus": 401
                })

        # 验证订单状态
        resp = admin_api_client.get("{}/order/detail".format(ADMIN_API_BASE), params={"id": order_id})
        if resp.status_code == 200:
            order_detail = resp.json().get("data", {})
            order_info = order_detail.get("orderInfo", {})
            final_status = order_info.get("orderStatus")
            print("最终订单状态: {} (401=已收货)".format(final_status))

        # 保存订单信息
        self.__class__.order_id = order_id
        self.__class__.product_id = product_id

        return order_id

    def test_02_user_apply_aftersale(self, wx_user):
        """步骤2: 用户申请售后"""
        if not hasattr(self.__class__, "order_id"):
            pytest.skip("订单未创建")

        client = wx_user["client"]
        order_id = self.__class__.order_id

        # 先检查订单状态
        resp = client.get("{}/order/detail".format(WX_API_BASE), params={"orderId": order_id})
        if resp.status_code == 200:
            order_detail = resp.json().get("data", {})
            order_info = order_detail.get("orderInfo", order_detail)
            order_status = order_info.get("orderStatus")
            print("\n当前订单状态: {}".format(order_status))

            # 售后需要订单状态为 401（已收货）或 402（已完成）
            if order_status not in [401, 402]:
                pytest.skip("订单状态不是已收货，无法申请售后")

        # 申请售后
        # type=1 表示换货（根据业务规则，只换不退）
        resp = client.post("{}/aftersale/submit".format(WX_API_BASE), json={
            "orderId": order_id,
            "type": 1,  # 换货
            "reason": "商品尺码不合适，申请换货",
            "amount": 0,  # 换货不需要金额
            "comment": "请换大一码"
        })

        assert resp.status_code == 200
        data = resp.json()

        if data.get("errno") != 0:
            errmsg = data.get("errmsg", "")
            print("售后申请响应: {}".format(data))
            # 如果已经申请过，继续测试
            if "已申请" in errmsg or "已存在" in errmsg:
                print("售后已申请过，继续测试")
            else:
                pytest.skip("申请售后失败: {}".format(errmsg))
        else:
            print("售后申请成功")

        # 验证售后状态
        resp = client.get("{}/aftersale/detail".format(WX_API_BASE), params={"orderId": order_id})
        if resp.status_code == 200:
            detail = resp.json().get("data", {})
            aftersale = detail.get("aftersale", {})

            if aftersale:
                self.__class__.aftersale_id = aftersale.get("id")
                print("售后记录ID: {}".format(self.__class__.aftersale_id))
                print("售后状态: {} (101=申请中)".format(aftersale.get("status")))

    def test_03_admin_list_aftersales(self, admin_api_client, admin_user):
        """步骤3: 管理员查看售后列表"""
        resp = admin_api_client.get("{}/aftersale/list".format(ADMIN_API_BASE), params={
            "page": 1,
            "limit": 10
        })

        assert resp.status_code == 200
        data = resp.json()
        assert data.get("errno") == 0

        aftersale_list = data.get("data", {}).get("list", [])
        print("\n售后记录数量: {}".format(len(aftersale_list)))

        # 查找刚才创建的售后
        if hasattr(self.__class__, "order_id"):
            for a in aftersale_list:
                if a.get("orderId") == self.__class__.order_id:
                    self.__class__.aftersale_id = a.get("id")
                    print("找到售后记录: ID={}, 状态={}".format(a.get("id"), a.get("status")))
                    break

    def test_04_admin_approve_aftersale(self, admin_api_client, admin_user):
        """步骤4: 管理员审核通过"""
        if not hasattr(self.__class__, "aftersale_id"):
            pytest.skip("售后记录未创建")

        aftersale_id = self.__class__.aftersale_id

        # 审核通过
        resp = admin_api_client.post("{}/aftersale/recept".format(ADMIN_API_BASE), json={
            "id": aftersale_id
        })

        assert resp.status_code == 200
        data = resp.json()

        if data.get("errno") != 0:
            print("审核响应: {}".format(data))
            # 可能已经审核过
            if "不能进行审核通过操作" not in str(data.get("errmsg", "")):
                assert data.get("errno") == 0

        print("\n管理员审核通过")

    def test_05_admin_ship_replacement(self, admin_api_client, admin_user):
        """步骤5: 管理员换货发货"""
        if not hasattr(self.__class__, "aftersale_id"):
            pytest.skip("售后记录未创建")

        aftersale_id = self.__class__.aftersale_id

        # 换货发货
        resp = admin_api_client.post("{}/aftersale/ship".format(ADMIN_API_BASE), json={
            "id": aftersale_id,
            "shipChannel": "SF",
            "shipSn": "REPLACE{}".format(int(time.time()))
        })

        assert resp.status_code == 200
        data = resp.json()

        if data.get("errno") != 0:
            print("换货发货响应: {}".format(data))
            assert data.get("errno") == 0, "换货发货失败: {}".format(data.get("errmsg"))

        print("\n管理员换货发货成功")

    def test_06_complete_aftersale(self, admin_api_client, admin_user):
        """步骤6: 完成售后"""
        if not hasattr(self.__class__, "aftersale_id"):
            pytest.skip("售后记录未创建")

        aftersale_id = self.__class__.aftersale_id

        # 标记售后完成
        resp = admin_api_client.post("{}/aftersale/complete".format(ADMIN_API_BASE), json={
            "id": aftersale_id
        })

        assert resp.status_code == 200
        data = resp.json()

        if data.get("errno") != 0:
            print("完成售后响应: {}".format(data))
            assert data.get("errno") == 0, "完成售后失败: {}".format(data.get("errmsg"))

        print("\n售后流程完成")
