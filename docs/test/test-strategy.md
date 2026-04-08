# Clothing Mall 测试策略

> **版本**: v1.0
> **日期**: 2026-03-15
> **状态**: 已确认

---

## 一、测试数据库

- **位置**: 阿里云独立测试库
- **连接**: `47.107.151.70:3306/clothing_mall_test`
- **策略**: 每次测试前清理，测试后回滚/清理

---

## 二、覆盖率目标

| 阶段 | 后端覆盖率 | 说明 |
|------|-----------|------|
| 初期 | 70%+ | 核心业务逻辑 |
| 中期 | 80%+ | 扩展到所有 Service |
| 长期 | 90%+ | 包含边界情况 |

---

## 三、范围界定

- ✅ 后端单元测试
- ✅ 后端集成测试
- ✅ API 接口测试
- ✅ 管理后台 E2E 测试
- ✅ 前端单元测试（基础）
- ✅ 小程序 UI 测试
- ⏸️ CI 集成（暂不配置）

---

## 四、测试架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        测试金字塔                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                     ▲  E2E 测试 (Playwright)                    │
│                    ╱ ╲   - 管理后台关键流程                      │
│                   ╱   ╲                                        │
│                  ╱─────╲                                       │
│                 ╱  API  ╲   - pytest + requests                │
│                ╱ 集成测试 ╲  - 连接阿里云测试库                   │
│               ╱───────────╲                                    │
│              ╱  单元测试    ╲   - JUnit 5 + Mockito             │
│             ╱               ╲  - Jest (前端)                    │
│            ╱─────────────────╲                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 五、目录结构

```
clothing-mall/
├── tests/                        # Python 测试根目录
│   ├── api/                      # API 接口测试
│   │   ├── conftest.py
│   │   ├── test_admin_auth.py
│   │   ├── test_goods_api.py
│   │   ├── test_order_api.py
│   │   ├── test_coupon_api.py
│   │   ├── test_aftersale_api.py
│   │   ├── test_promotion_api.py
│   │   ├── test_wx_auth.py
│   │   ├── test_wx_goods.py
│   │   ├── test_wx_cart.py
│   │   ├── test_wx_order.py
│   │   └── test_wx_user.py
│   ├── e2e/                      # E2E 测试
│   │   ├── admin/                # 管理后台 E2E
│   │   │   ├── test_login.py
│   │   │   ├── test_goods.py
│   │   │   ├── test_order.py
│   │   │   └── test_promotion.py
│   │   ├── scenarios/            # 核心场景 E2E
│   │   │   ├── test_collect_flow.py
│   │   │   ├── test_coupon_flow.py
│   │   │   ├── test_flash_sale_flow.py
│   │   │   ├── test_full_reduction_flow.py
│   │   │   ├── test_ship_flow.py
│   │   │   └── test_aftersale_flow.py
│   │   └── pages/                # Page Object Model
│   │       ├── login_page.py
│   │       ├── goods_page.py
│   │       └── order_page.py
│   ├── miniprogram/              # 小程序 UI 测试
│   │   ├── test_home.spec.js
│   │   ├── test_catalog.spec.js
│   │   ├── test_goods.spec.js
│   │   ├── test_cart.spec.js
│   │   └── test_user.spec.js
│   ├── fixtures/                 # 测试数据
│   │   ├── users.json
│   │   ├── goods.json
│   │   └── orders.json
│   └── conftest.py               # 全局配置
│
├── clothing-mall-db/
│   └── src/test/java/org/linlinjava/litemall/db/
│       ├── service/              # Service 层测试
│       │   ├── OrderServiceTest.java
│       │   ├── GoodsServiceTest.java
│       │   └── ...
│       └── util/                 # 工具类测试
│
├── clothing-mall-admin/
│   └── tests/unit/               # 前端单元测试
│       ├── utils/
│       │   ├── index.spec.js
│       │   └── validate.spec.js
│       ├── components/
│       │   ├── Breadcrumb.spec.js
│       │   └── Pagination.spec.js
│       └── store/
│           └── user.spec.js
│
├── pytest.ini                    # pytest 配置
├── requirements-test.txt         # Python 测试依赖
└── docs/test/                    # 测试文档
    ├── README.md
    ├── test-strategy.md
    ├── test-plan.md
    └── test-report-*.md
```

---

## 六、测试依赖

### 6.1 Python (API + E2E)

```txt
# requirements-test.txt
pytest>=7.0.0
pytest-html>=3.1.0
pytest-asyncio>=0.20.0
requests>=2.28.0
playwright>=1.30.0
python-dotenv>=1.0.0
faker>=18.0.0
```

### 6.2 Java (后端单元/集成测试)

```xml
<dependency>
    <groupId>org.junit.jupiter</groupId>
    <artifactId>junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.mockito</groupId>
    <artifactId>mockito-core</artifactId>
    <scope>test</scope>
</dependency>
```

### 6.3 JavaScript (前端 + 小程序)

```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "@vue/test-utils": "1.3.6",
    "miniprogram-automator": "0.12.1"
  }
}
```

---

## 七、执行命令

```bash
# 后端单元测试
mvn test

# 后端指定测试类
mvn test -Dtest=OrderServiceTest

# API 测试
pytest tests/api/ -v

# API 测试 + 报告
pytest tests/api/ -v --html=docs/test/html/api_report.html

# E2E 测试
pytest tests/e2e/ -v

# E2E 测试（带界面）
pytest tests/e2e/ -v --headed

# 前端单元测试
cd clothing-mall-admin
NODE_OPTIONS="--experimental-vm-modules" npm run test:unit

# 小程序 UI 测试
cd tests/miniprogram
npm test
```

---

## 八、实施计划

| 阶段 | 内容 | 状态 |
|------|------|------|
| **Phase 1** | 搭建测试框架基础设施 | ✅ 已完成 |
| **Phase 2** | 核心业务单元测试 | ✅ 已完成 |
| **Phase 3** | API 接口测试 | ✅ 已完成 |
| **Phase 4** | E2E 关键流程测试 | ✅ 已完成 |
| **Phase 5** | 前端单元测试 | ✅ 已完成 |
| **Phase 6** | 企业管理员 E2E 测试扩展 | ✅ 已完成 |
| **Phase 7** | 小程序 UI 测试 | ✅ 已完成 |
| **Phase 8** | 核心场景端到端测试 | ✅ 已完成 |

---

## 九、核心测试场景

### 9.1 订单流程

```
创建购物车 → 选择商品 → 应用优惠券 → 计算满减 → 计算运费
    → 生成订单 → 支付 → 发货 → 完成
                                        ↓
                                   换货申请 → 审核 → 换货
```

### 9.2 促销计算

```
订单金额
    ├── 满减规则 (满200减20)
    ├── 优惠券 (新人券/生日券)
    └── 限时特卖价格
```

### 9.3 管理后台关键流程

- 登录/登出
- 商品 CRUD
- 订单管理（查询、发货）
- 售后处理（换货审核）
- 促销配置（满减、限时特卖）

---

*文档版本: v1.0*
*最后更新: 2026-03-15*
