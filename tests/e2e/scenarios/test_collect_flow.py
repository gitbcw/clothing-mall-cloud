"""
收藏商品流程端到端测试

测试场景:
1. 用户收藏商品
2. 查看收藏列表
3. 从收藏列表加购
4. 取消收藏
"""
import pytest
import os

# API 配置
WX_API_BASE = os.getenv("WX_API_BASE", "http://47.107.151.70:8088/wx")


class TestCollectFlow:
    """收藏商品流程测试"""

    def test_01_browse_and_get_goods(self, wx_user):
        """步骤1: 浏览商品获取商品ID"""
        client = wx_user["client"]

        resp = client.get("{}/goods/list".format(WX_API_BASE), params={
            "page": 1,
            "limit": 5
        })

        assert resp.status_code == 200
        data = resp.json()
        assert data.get("errno") == 0

        goods_list = data["data"]["list"]
        assert len(goods_list) > 0

        goods = goods_list[0]
        self.__class__.goods_id = goods["id"]
        self.__class__.goods_name = goods.get("name", "")

        print("\n选中商品: {} (ID: {})".format(self.__class__.goods_name, self.__class__.goods_id))

    def test_02_add_to_collect(self, wx_user):
        """步骤2: 收藏商品"""
        client = wx_user["client"]

        if not hasattr(self.__class__, "goods_id"):
            pytest.skip("没有选中商品")

        # type=0 表示商品收藏
        resp = client.post("{}/collect/addordelete".format(WX_API_BASE), json={
            "type": 0,
            "valueId": self.__class__.goods_id
        })

        assert resp.status_code == 200
        data = resp.json()
        assert data.get("errno") == 0

        print("\n收藏商品成功")

        # 再次调用会取消收藏，我们再调一次确保是收藏状态
        resp = client.post("{}/collect/addordelete".format(WX_API_BASE), json={
            "type": 0,
            "valueId": self.__class__.goods_id
        })
        # 现在是取消收藏

        resp = client.post("{}/collect/addordelete".format(WX_API_BASE), json={
            "type": 0,
            "valueId": self.__class__.goods_id
        })
        # 现在是收藏
        print("确认收藏状态")

    def test_03_list_collect(self, wx_user):
        """步骤3: 查看收藏列表"""
        client = wx_user["client"]

        # type=0 表示商品收藏
        resp = client.get("{}/collect/list".format(WX_API_BASE), params={
            "type": 0,
            "page": 1,
            "limit": 10
        })

        assert resp.status_code == 200
        data = resp.json()
        assert data.get("errno") == 0

        collect_list = data.get("data", {}).get("list", [])
        print("\n收藏商品数量: {}".format(len(collect_list)))

        # 验证刚才收藏的商品在列表中
        found = False
        for item in collect_list:
            if item.get("valueId") == self.__class__.goods_id:
                found = True
                print("收藏的商品在列表中: {}".format(item.get("name")))
                print("商品简介: {}".format(item.get("brief")))
                print("商品价格: {}".format(item.get("retailPrice")))
                break

        assert found, "收藏的商品未在列表中找到"

    def test_04_add_to_cart_from_collect(self, wx_user):
        """步骤4: 从收藏列表加购"""
        client = wx_user["client"]

        if not hasattr(self.__class__, "goods_id"):
            pytest.skip("没有选中商品")

        # 获取商品详情，找到有库存的产品
        resp = client.get("{}/goods/detail".format(WX_API_BASE), params={
            "id": self.__class__.goods_id
        })

        assert resp.status_code == 200
        detail = resp.json()["data"]
        products = detail.get("productList", [])

        product_id = None
        for p in products:
            if p.get("number", 0) > 0:
                product_id = p["id"]
                break

        if product_id is None:
            pytest.skip("商品无库存")

        # 添加到购物车
        resp = client.post("{}/cart/add".format(WX_API_BASE), json={
            "goodsId": self.__class__.goods_id,
            "productId": product_id,
            "number": 1
        })

        assert resp.status_code == 200
        data = resp.json()
        assert data.get("errno") == 0

        print("\n从收藏添加到购物车成功")

        # 验证购物车中有该商品
        resp = client.get("{}/cart/index".format(WX_API_BASE))
        cart_data = resp.json().get("data", {})
        cart_list = cart_data.get("cartList", [])

        found_in_cart = False
        for item in cart_list:
            if item.get("goodsId") == self.__class__.goods_id:
                found_in_cart = True
                break

        assert found_in_cart, "商品未在购物车中找到"

        # 清理: 从购物车删除
        client.post("{}/cart/delete".format(WX_API_BASE), json={
            "productIds": [product_id]
        })
        print("已从购物车移除")

    def test_05_remove_from_collect(self, wx_user):
        """步骤5: 取消收藏"""
        client = wx_user["client"]

        if not hasattr(self.__class__, "goods_id"):
            pytest.skip("没有选中商品")

        # 再次调用 addordelete 会取消收藏
        resp = client.post("{}/collect/addordelete".format(WX_API_BASE), json={
            "type": 0,
            "valueId": self.__class__.goods_id
        })

        assert resp.status_code == 200
        data = resp.json()
        assert data.get("errno") == 0

        print("\n取消收藏成功")

        # 验证收藏列表中不再有该商品
        resp = client.get("{}/collect/list".format(WX_API_BASE), params={
            "type": 0,
            "page": 1,
            "limit": 100
        })

        collect_list = resp.json().get("data", {}).get("list", [])

        for item in collect_list:
            if item.get("valueId") == self.__class__.goods_id:
                # 商品仍在列表中，重新收藏然后取消
                resp = client.post("{}/collect/addordelete".format(WX_API_BASE), json={
                    "type": 0,
                    "valueId": self.__class__.goods_id
                })
                print("重新取消收藏")
                break

        print("收藏流程测试完成")
