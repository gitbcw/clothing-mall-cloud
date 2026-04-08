# 测试框架使用指南

## 快速开始

### 1. 环境准备

```bash
# 安装 Python 测试依赖
pip install -r requirements-test.txt

# 安装 Playwright 浏览器（首次使用）
playwright install chromium

# 复制测试环境配置
cp .env.test.example .env.test
# 编辑 .env.test 填入实际配置
```

### 2. 运行测试

```bash
# 运行所有 API 测试
pytest tests/api/ -v

# 运行所有 E2E 测试
pytest tests/e2e/ -v

# 运行指定测试文件
pytest tests/api/test_admin_auth.py -v

# 运行指定测试用例
pytest tests/api/test_admin_auth.py::TestAdminAuth::test_login_success -v

# 生成 HTML 报告
pytest tests/api/ -v --html=test_report/api_report.html

# 运行 E2E 测试（带界面）
pytest tests/e2e/ -v --headed
```

### 3. 后端测试

```bash
# 运行所有测试
mvn test

# 运行指定测试类
mvn test -Dtest=CouponServiceTest

# 运行指定测试方法
mvn test -Dtest=CouponServiceTest#testCreateCoupon
```

### 4. 前端测试

```bash
cd clothing-mall-admin
npm run test:unit
```

## 测试标记

```bash
# 只运行 API 测试
pytest -m api

# 只运行 E2E 测试
pytest -m e2e

# 排除慢速测试
pytest -m "not slow"
```

## 目录结构

```
tests/
├── api/                    # API 接口测试
│   ├── conftest.py         # API 测试配置
│   └── test_*.py           # 测试文件
├── e2e/                    # E2E 测试
│   ├── conftest.py         # E2E 测试配置
│   └── admin/              # 管理后台测试
├── fixtures/               # 测试数据工厂
│   └── factory.py
└── conftest.py             # 全局配置
```

## 测试数据库

测试使用阿里云独立测试库：

- Host: 47.107.151.70
- Port: 3306 (通过 SSH 隧道映射到本地 13306)
- Database: clothing_mall_test

### 建立 SSH 隧道

```bash
ssh -f -N -L 13306:clothing-mall-mysql:3306 admin@47.107.151.70
```

## 编写新测试

### API 测试示例

```python
import pytest
from tests.api.conftest import APIClient

class TestGoodsAPI:
    @pytest.mark.api
    def test_list_goods(self, admin_client, assert_resp):
        resp = admin_client.get("/admin/goods/list")
        data = assert_resp.success(resp, "获取商品列表")
        assert "list" in data
```

### E2E 测试示例

```python
import pytest
from tests.e2e.conftest import AdminPage

class TestDashboard:
    @pytest.mark.e2e
    def test_dashboard_loads(self, admin_page, config):
        admin_page.goto(f"{config.ADMIN_FRONTEND_URL}/#/dashboard")
        # 断言...
```

## 常见问题

### Q: 测试连接数据库失败？

确保已建立 SSH 隧道：
```bash
ssh -f -N -L 13306:clothing-mall-mysql:3306 admin@47.107.151.70
```

### Q: Playwright 浏览器未安装？

```bash
playwright install chromium
```

### Q: 后端测试跳过？

检查 `pom.xml` 中的 `maven.test.skip` 设置，确保运行测试时使用：
```bash
mvn test -Dmaven.test.skip=false
```
