"""
小程序埋点 API 测试

测试用例覆盖：
- TRK-01: 匿名用户埋点上报
- TRK-02: 登录用户埋点上报
- TRK-03: 批量埋点上报
- TRK-04: 空事件列表处理
- TRK-05: 各种事件类型上报
"""
import pytest
import time
import random
from tests.api.conftest import APIClient, ResponseAssert


@pytest.mark.api
class TestWxTracker:
    """小程序埋点上报测试"""

    def test_tracker_report_anonymous(self, api_client: APIClient, assert_resp: ResponseAssert):
        """TRK-01: 匿名用户埋点上报"""
        events = [
            {
                "type": "page_view",
                "data": {"page": "首页"},
                "page": "pages/index/index",
                "device": {"model": "iPhone 15", "platform": "ios"},
                "timestamp": int(time.time() * 1000)
            }
        ]

        resp = api_client.post("/wx/tracker/report", json={"events": events})
        data = assert_resp.success(resp, "匿名用户埋点上报成功")
        assert data is not None or data == {} or resp.json().get("errno") == 0

    def test_tracker_report_with_user(self, wx_user_client: APIClient, assert_resp: ResponseAssert):
        """TRK-02: 登录用户埋点上报"""
        events = [
            {
                "type": "goods_view",
                "data": {"goodsId": 1181004, "goodsName": "测试商品", "price": 99.0},
                "page": "pages/goods/goods",
                "device": {"model": "iPhone 15", "platform": "ios"},
                "timestamp": int(time.time() * 1000)
            }
        ]

        resp = wx_user_client.post("/wx/tracker/report", json={"events": events})
        data = assert_resp.success(resp, "登录用户埋点上报成功")

    def test_tracker_report_batch(self, api_client: APIClient, assert_resp: ResponseAssert):
        """TRK-03: 批量埋点上报（10条）"""
        events = []
        event_types = ["page_view", "goods_view", "search", "add_cart", "click"]

        for i in range(10):
            events.append({
                "type": random.choice(event_types),
                "data": {"index": i, "test": True},
                "page": "pages/test/test",
                "device": {"model": "Test Device", "platform": "devtools"},
                "timestamp": int(time.time() * 1000) + i
            })

        resp = api_client.post("/wx/tracker/report", json={"events": events})
        data = assert_resp.success(resp, "批量埋点上报成功")

    def test_tracker_report_empty(self, api_client: APIClient, assert_resp: ResponseAssert):
        """TRK-04: 空事件列表处理"""
        resp = api_client.post("/wx/tracker/report", json={"events": []})
        data = assert_resp.success(resp, "空事件列表处理成功")

    def test_tracker_report_all_event_types(self, api_client: APIClient, assert_resp: ResponseAssert):
        """TRK-05: 各种事件类型上报"""
        event_types = [
            ("page_view", {"page": "首页"}),
            ("goods_view", {"goodsId": 1181004, "goodsName": "T恤", "price": 99.0, "categoryId": 1}),
            ("search", {"keyword": "测试关键词", "resultCount": 10}),
            ("add_cart", {"goodsId": 1181004, "goodsName": "T恤", "price": 99.0, "number": 1}),
            ("collect", {"goodsId": 1181004, "goodsName": "T恤", "action": "collect"}),
            ("order_create", {"orderId": 999, "amount": 199.0, "goodsCount": 2}),
            ("order_pay", {"orderId": 999, "amount": 199.0, "payMethod": "wechat"}),
            ("share", {"type": "friend", "contentId": 1181004, "contentType": "goods"}),
            ("click", {"element": "buy_button", "page": "goods"})
        ]

        events = []
        for event_type, event_data in event_types:
            events.append({
                "type": event_type,
                "data": event_data,
                "page": f"pages/{event_type}/{event_type}",
                "device": {"model": "Test", "platform": "test"},
                "timestamp": int(time.time() * 1000)
            })

        resp = api_client.post("/wx/tracker/report", json={"events": events})
        data = assert_resp.success(resp, "各种事件类型上报成功")

    def test_tracker_report_with_user_info(self, api_client: APIClient, assert_resp: ResponseAssert):
        """TRK-06: 带用户信息的事件上报"""
        events = [
            {
                "type": "page_view",
                "data": {"page": "个人中心"},
                "page": "pages/ucenter/index",
                "device": {
                    "model": "iPhone 15 Pro",
                    "platform": "ios",
                    "system": "iOS 17.0",
                    "SDKVersion": "3.3.0",
                    "version": "8.0.0"
                },
                "user": {
                    "userId": 1,
                    "hasLogin": True
                },
                "timestamp": int(time.time() * 1000)
            }
        ]

        resp = api_client.post("/wx/tracker/report", json={"events": events})
        data = assert_resp.success(resp, "带用户信息的事件上报成功")
