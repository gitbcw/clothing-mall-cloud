"""
Clothing Mall 测试框架全局配置
"""
import os
import pytest
from pathlib import Path
from dotenv import load_dotenv

# 加载测试环境变量
env_file = Path(__file__).parent.parent / ".env.test"
if env_file.exists():
    load_dotenv(env_file)


# ==================== 配置常量 ====================

class Config:
    """测试配置"""
    # API 地址
    API_BASE_URL = os.getenv("API_BASE_URL", "http://47.107.151.70:8088")

    # 管理后台地址
    ADMIN_FRONTEND_URL = os.getenv("ADMIN_FRONTEND_URL", "http://localhost:9527")

    # 数据库配置
    DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT = int(os.getenv("DB_PORT", "13306"))
    DB_NAME = os.getenv("DB_NAME", "clothing_mall_test")
    DB_USER = os.getenv("DB_USER", "clothing_mall")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "clothing123456")

    # 测试账号
    ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin123")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

    # 超时配置
    DEFAULT_TIMEOUT = int(os.getenv("DEFAULT_TIMEOUT", "30"))
    E2E_TIMEOUT = int(os.getenv("E2E_TIMEOUT", "60"))


@pytest.fixture(scope="session")
def config():
    """配置 fixture"""
    return Config


# ==================== pytest 钩子 ====================

def pytest_configure(config):
    """pytest 配置钩子"""
    # 注册自定义标记
    config.addinivalue_line("markers", "api: API 接口测试")
    config.addinivalue_line("markers", "e2e: E2E 端到端测试")
    config.addinivalue_line("markers", "slow: 慢速测试")
    config.addinivalue_line("markers", "integration: 集成测试")


@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """测试环境初始化"""
    print("\n" + "=" * 60)
    print("测试环境配置:")
    print(f"  API: {Config.API_BASE_URL}")
    print(f"  Admin: {Config.ADMIN_FRONTEND_URL}")
    print(f"  DB: {Config.DB_HOST}:{Config.DB_PORT}/{Config.DB_NAME}")
    print("=" * 60)

    yield

    print("\n测试完成")
