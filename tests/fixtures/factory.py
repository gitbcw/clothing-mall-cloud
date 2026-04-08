"""
测试数据工厂
"""
import time
import random
import string
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from faker import Faker

fake = Faker('zh_CN')


class UserFactory:
    """用户数据工厂"""

    @staticmethod
    def create(override: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        defaults = {
            "username": fake.user_name() + str(int(time.time())),
            "password": "password123",
            "mobile": fake.phone_number(),
            "nickname": fake.name(),
            "gender": random.choice([0, 1, 2]),
            "birthday": fake.date_of_birth(minimum_age=18, maximum_age=60).isoformat(),
            "avatar": fake.image_url(),
        }
        return {**defaults, **(override or {})}


class GoodsFactory:
    """商品数据工厂"""

    _counter = 0

    @classmethod
    def create(cls, override: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        cls._counter += 1
        defaults = {
            "goodsSn": f"GN{int(time.time())}{cls._counter:04d}",
            "name": f"测试商品-{fake.word()}-{cls._counter}",
            "categoryId": 1008009,  # 默认分类
            "brandId": 0,
            "gallery": [],
            "keywords": "",
            "brief": fake.sentence(),
            "isOnSale": True,
            "sortOrder": 100,
            "picUrl": fake.image_url(),
            "shareUrl": "",
            "isNew": True,
            "isHot": False,
            "unit": "件",
            "counterPrice": round(random.uniform(100, 500), 2),
            "retailPrice": round(random.uniform(50, 300), 2),
            "detail": fake.text(),
        }
        return {**defaults, **(override or {})}

    @classmethod
    def create_with_specs(cls, override: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """创建带规格的商品"""
        goods = cls.create(override)
        goods["specifications"] = [
            {
                "specification": "规格",
                "value": "标准",
                "picUrl": ""
            }
        ]
        goods["products"] = [
            {
                "id": 0,
                "specifications": [{"specification": "规格", "value": "标准"}],
                "price": goods["retailPrice"],
                "number": random.randint(10, 100),
                "url": goods["picUrl"]
            }
        ]
        goods["attributes"] = []
        return goods


class OrderFactory:
    """订单数据工厂"""

    _counter = 0

    @classmethod
    def create(cls, override: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        cls._counter += 1
        defaults = {
            "orderSn": f"{int(time.time())}{cls._counter:06d}",
            "userId": 1,
            "orderStatus": 101,  # 待付款
            "consignee": fake.name(),
            "mobile": fake.phone_number(),
            "address": fake.address(),
            "message": "",
            "goodsPrice": round(random.uniform(100, 500), 2),
            "freightPrice": 10.00,
            "couponPrice": 0.00,
            "integralPrice": 0.00,
            "actualPrice": round(random.uniform(100, 500), 2),
            "payId": "",
            "payTime": None,
            "shipSn": "",
            "shipChannel": "",
            "shipTime": None,
            "refundAmount": 0.00,
            "refundContent": "",
            "refundTime": None,
            "confirmTime": None,
            "comments": 0,
            "addTime": datetime.now().isoformat(),
        }
        return {**defaults, **(override or {})}


class CartFactory:
    """购物车数据工厂"""

    @staticmethod
    def create(goods_id: int, product_id: int, number: int = 1,
               override: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        defaults = {
            "goodsId": goods_id,
            "productId": product_id,
            "number": number,
        }
        return {**defaults, **(override or {})}


class CouponFactory:
    """优惠券数据工厂"""

    _counter = 0

    @classmethod
    def create(cls, override: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        cls._counter += 1
        defaults = {
            "name": f"测试优惠券-{cls._counter}",
            "desc": fake.sentence(),
            "tag": "测试",
            "total": 100,
            "discount": round(random.uniform(10, 50), 2),
            "min": round(random.uniform(100, 200), 2),
            "limit": 1,
            "type": 0,  # 通用券
            "status": 0,  # 正常
            "goodsType": 0,  # 全场通用
            "goodsValue": [],
            "code": "".join(random.choices(string.ascii_uppercase + string.digits, k=8)),
            "startTime": datetime.now().isoformat(),
            "endTime": (datetime.now() + timedelta(days=30)).isoformat(),
        }
        return {**defaults, **(override or {})}


class FlashSaleFactory:
    """限时特卖数据工厂"""

    _counter = 0

    @classmethod
    def create(cls, goods_id: int, override: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        cls._counter += 1
        now = datetime.now()
        defaults = {
            "goodsId": goods_id,
            "flashPrice": round(random.uniform(50, 200), 2),
            "flashStock": random.randint(10, 100),
            "flashBuyLimit": 1,
            "startTime": now.isoformat(),
            "endTime": (now + timedelta(hours=2)).isoformat(),
            "status": 1,  # 启用
        }
        return {**defaults, **(override or {})}


class FullReductionFactory:
    """满减规则数据工厂"""

    _counter = 0

    @classmethod
    def create(cls, override: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        cls._counter += 1
        defaults = {
            "name": f"满减活动-{cls._counter}",
            "desc": "满减优惠",
            "thresholdAmount": 200.00,
            "reductionAmount": 20.00,
            "status": 1,  # 启用
            "startTime": datetime.now().isoformat(),
            "endTime": (datetime.now() + timedelta(days=30)).isoformat(),
            "goodsType": 0,  # 全场通用
            "goodsValue": [],
        }
        return {**defaults, **(override or {})}
