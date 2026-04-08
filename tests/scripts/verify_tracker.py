#!/usr/bin/env python3
"""
埋点功能验证脚本

用于快速验证埋点上报功能是否正常工作：
1. 调用后端 API 上报埋点数据
2. 查询数据库验证数据是否正确写入

使用方法：
    python tests/scripts/verify_tracker.py

环境变量：
    API_BASE_URL: 后端 API 地址，默认 http://47.107.151.70:8088
    DB_HOST: 数据库地址，默认 47.107.151.70
    DB_USER: 数据库用户名，默认 clothing_mall
    DB_PASS: 数据库密码，默认 clothing123456
    DB_NAME: 数据库名称，默认 clothing_mall
"""
import os
import sys
import json
import time
import requests
from datetime import datetime

# 配置
API_BASE_URL = os.getenv("API_BASE_URL", "http://47.107.151.70:8088")
DB_HOST = os.getenv("DB_HOST", "47.107.151.70")
DB_USER = os.getenv("DB_USER", "clothing_mall")
DB_PASS = os.getenv("DB_PASS", "clothing123456")
DB_NAME = os.getenv("DB_NAME", "clothing_mall")


def print_step(step: str):
    """打印步骤标题"""
    print(f"\n{'='*50}")
    print(f"  {step}")
    print(f"{'='*50}")


def test_tracker_api():
    """测试埋点 API 上报"""
    print_step("1. 测试埋点 API 上报")

    url = f"{API_BASE_URL}/wx/tracker/report"

    # 构造测试数据
    test_timestamp = int(time.time() * 1000)
    events = [
        {
            "type": "page_view",
            "data": {
                "page": "验证测试页面",
                "testId": f"verify_{test_timestamp}"
            },
            "page": "pages/verify/verify",
            "device": {
                "model": "Verify Script",
                "platform": "test",
                "testMode": True
            },
            "timestamp": test_timestamp
        },
        {
            "type": "goods_view",
            "data": {
                "goodsId": 1181004,
                "goodsName": "验证测试商品",
                "price": 99.0,
                "categoryId": 1
            },
            "page": "pages/goods/goods",
            "device": {
                "model": "Verify Script",
                "platform": "test"
            },
            "timestamp": test_timestamp + 1
        },
        {
            "type": "search",
            "data": {
                "keyword": "验证测试关键词",
                "resultCount": 5
            },
            "page": "pages/search/search",
            "device": {
                "model": "Verify Script",
                "platform": "test"
            },
            "timestamp": test_timestamp + 2
        }
    ]

    payload = {"events": events}

    print(f"请求 URL: {url}")
    print(f"上报事件数: {len(events)}")
    print(f"测试时间戳: {test_timestamp}")

    try:
        resp = requests.post(url, json=payload, timeout=10)
        print(f"响应状态码: {resp.status_code}")

        if resp.status_code == 200:
            data = resp.json()
            print(f"响应数据: {json.dumps(data, ensure_ascii=False, indent=2)}")

            if data.get("errno") == 0:
                print("✅ API 上报成功")
                return test_timestamp
            else:
                print(f"❌ API 返回错误: {data.get('errmsg')}")
                return None
        else:
            print(f"❌ HTTP 请求失败: {resp.text}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"❌ 请求异常: {e}")
        return None


def verify_database(test_timestamp: int):
    """验证数据库写入"""
    print_step("2. 验证数据库写入")

    try:
        import pymysql

        print(f"连接数据库: {DB_HOST}")
        conn = pymysql.connect(
            host=DB_HOST,
            port=3306,
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME,
            charset='utf8mb4'
        )

        cursor = conn.cursor(pymysql.cursors.DictCursor)

        # 等待异步处理完成
        print("等待异步处理...")
        time.sleep(2)

        # 查询刚才插入的数据
        sql = """
            SELECT id, user_id, event_type, event_data, page_route, device_info, timestamp, server_time
            FROM litemall_tracker_event
            WHERE timestamp >= %s
            AND page_route LIKE 'pages/verify%'
            ORDER BY id DESC
            LIMIT 5
        """

        cursor.execute(sql, (test_timestamp,))
        results = cursor.fetchall()

        print(f"\n查询到 {len(results)} 条记录:")

        if len(results) > 0:
            for row in results:
                print(f"\n--- 记录 ID: {row['id']} ---")
                print(f"  事件类型: {row['event_type']}")
                print(f"  页面路由: {row['page_route']}")
                print(f"  事件数据: {row['event_data']}")
                print(f"  设备信息: {row['device_info']}")
                print(f"  客户端时间戳: {row['timestamp']}")
                print(f"  服务器时间: {row['server_time']}")

            print(f"\n✅ 数据库写入验证成功，共 {len(results)} 条记录")
            success = True
        else:
            print("❌ 未找到测试数据，可能异步处理尚未完成")
            success = False

        # 统计总记录数
        cursor.execute("SELECT COUNT(*) as cnt FROM litemall_tracker_event WHERE deleted = 0")
        total = cursor.fetchone()
        print(f"\n数据库总记录数: {total['cnt']}")

        # 按事件类型统计
        cursor.execute("""
            SELECT event_type, COUNT(*) as cnt
            FROM litemall_tracker_event
            WHERE deleted = 0
            GROUP BY event_type
            ORDER BY cnt DESC
        """)
        type_stats = cursor.fetchall()
        print("\n按事件类型统计:")
        for stat in type_stats:
            print(f"  {stat['event_type']}: {stat['cnt']} 条")

        cursor.close()
        conn.close()

        return success

    except ImportError:
        print("⚠️ pymysql 未安装，跳过数据库验证")
        print("   安装命令: pip install pymysql")
        return None
    except Exception as e:
        print(f"❌ 数据库验证失败: {e}")
        return False


def main():
    print("="*60)
    print("       埋点功能验证脚本")
    print("="*60)
    print(f"API 地址: {API_BASE_URL}")
    print(f"数据库: {DB_HOST}/{DB_NAME}")
    print(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # 1. 测试 API 上报
    test_timestamp = test_tracker_api()
    if test_timestamp is None:
        print("\n❌ 验证失败: API 上报不成功")
        return 1

    # 2. 验证数据库写入
    db_result = verify_database(test_timestamp)

    # 3. 总结
    print_step("3. 验证结果")
    if db_result is True:
        print("✅ 埋点功能验证通过")
        print("   - API 上报正常")
        print("   - 数据库写入正常")
        return 0
    elif db_result is False:
        print("⚠️ 埋点功能部分通过")
        print("   - API 上报正常")
        print("   - 数据库验证失败（请检查数据库连接或等待更长时间）")
        return 2
    else:
        print("⚠️ 埋点功能部分验证")
        print("   - API 上报正常")
        print("   - 数据库验证跳过")
        return 0


if __name__ == "__main__":
    sys.exit(main())
