"""
端到端场景测试配置

测试场景:
1. 用户浏览商品流程
2. 用户下单流程
3. 模拟管理后台发货流程
4. 管理后台发货流程
"""
import pytest
import requests
import os
import time
from typing import Dict, Any

# API 配置
WX_API_BASE = os.getenv("WX_API_BASE", "http://47.107.151.70:8088/wx")
ADMIN_API_BASE = os.getenv("ADMIN_API_BASE", "http://47.107.151.70:8088/admin")

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

# 重试配置
MAX_RETRIES = 3
RETRY_DELAY = 1  # 秒


def retry_request(func, max_retries=MAX_RETRIES, delay=RETRY_DELAY):
    """重试装饰器，用于网络请求"""
    last_exception = None
    for i in range(max_retries):
        try:
            result = func()
            # 检查是否是 502 错误
            if hasattr(result, 'status_code') and result.status_code in [502, 503]:
                raise Exception("服务暂时不可用: {}".format(result.status_code))
            return result
        except Exception as e:
            last_exception = e
            if i < max_retries - 1:
                print("请求失败，{}秒后重试 ({}/{}): {}".format(delay, i + 1, max_retries, str(e)[:50]))
                time.sleep(delay)
    raise last_exception


class EndToEndTest:
    """端到端测试基类"""

    def _try_login_wx(self, client):
        """尝试登录小程序用户"""
        try:
            login_resp = client.post("{}/auth/login".format(WX_API_BASE), json={
                "username": TEST_USER["username"],
                "password": TEST_USER["password"]
            }, timeout=10)

            if login_resp.status_code == 200:
                data = login_resp.json()
                if data.get("errno") == 0:
                    token = data["data"]["token"]
                    client.headers["X-Litemall-Token"] = token
                    # userInfo 可能没有 id 字段，从 token 解析或使用默认值
                    user_info = data["data"].get("userInfo", {})
                    user_id = user_info.get("id", user_info.get("userId", 0))
                    return {
                        "client": client,
                        "token": token,
                        "user_id": user_id
                    }
        except Exception as e:
            print("登录失败: {}".format(e))
        return None

    def _try_login_admin(self, client):
        """尝试登录管理后台"""
        try:
            login_resp = client.post("{}/auth/login".format(ADMIN_API_BASE), json={
                "username": ADMIN_USER["username"],
                "password": ADMIN_USER["password"]
            }, timeout=10)

            if login_resp.status_code == 200:
                data = login_resp.json()
                if data.get("errno") == 0:
                    token = data["data"]["token"]
                    client.headers["X-Litemall-Admin-Token"] = token
                    return True
        except Exception as e:
            print("管理后台登录失败: {}".format(e))
        return False


@pytest.fixture(scope="module")
def wx_api_client():
    """小程序 API 客户端"""
    session = requests.Session()
    return session


@pytest.fixture(scope="module")
def admin_api_client():
    """管理后台 API 客户端"""
    session = requests.Session()
    return session


@pytest.fixture(scope="module")
def wx_user(wx_api_client):
    """登录小程序用户（可选）"""
    test = EndToEndTest()
    result = test._try_login_wx(wx_api_client)
    if result is None:
        pytest.skip("小程序用户 {} 不存在或登录失败".format(TEST_USER['username']))
    yield result


@pytest.fixture(scope="module")
def admin_user(admin_api_client):
    """登录管理后台（可选）"""
    test = EndToEndTest()
    if not test._try_login_admin(admin_api_client):
        pytest.skip("管理员 {} 不存在或登录失败".format(ADMIN_USER['username']))
    yield True


@pytest.fixture
def clean_cart(wx_user):
    """清空购物车"""
    client = wx_user["client"]
    # 清理
    try:
        resp = client.get("{}/cart/index".format(WX_API_BASE))
        data = resp.json()
        cart_list = data.get("data", {}).get("cartList", [])
        if cart_list:
            product_ids = [item.get("productId") for item in cart_list]
            if product_ids:
                client.post("{}/cart/delete".format(WX_API_BASE), json={"productIds": product_ids})
    except:
        pass
    yield None


@pytest.fixture
def test_goods(wx_user):
    """获取测试商品（有库存的商品）"""
    client = wx_user["client"]

    def find_goods():
        resp = client.get("{}/goods/list".format(WX_API_BASE), params={"page": 1, "limit": 20})
        assert resp.status_code == 200
        goods_list = resp.json()["data"]["list"]

        for goods in goods_list:
            resp = client.get("{}/goods/detail".format(WX_API_BASE), params={"id": goods["id"]})
            if resp.status_code != 200:
                continue
            detail = resp.json().get("data", {})
            products = detail.get("productList", [])

            for p in products:
                if p.get("number", 0) > 0:
                    return {
                        "goods_id": goods["id"],
                        "goods_name": goods.get("name"),
                        "product_id": p["id"],
                        "price": float(p.get("price", 0)),
                        "stock": p.get("number", 0)
                    }
        return None

    goods = find_goods()
    if goods is None:
        pytest.skip("没有找到有库存的商品")

    yield goods
