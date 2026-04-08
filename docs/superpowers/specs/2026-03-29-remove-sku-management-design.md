# 移除 SKU 管理模块设计文档

**日期**: 2026-03-29
**状态**: 待审核

## 背景

当前系统有两套并行的规格体系：

1. **原生 litemall 规格体系**：`goods_product` + `goods_specification` + `goods_attribute` — 订单流程真正在用，负责规格选择、库存扣减、计价
2. **clothing_goods_sku**：后加的独立 SKU 表，有自己的管理页面，但与订单流程未真正集成（SKU 库存从未被订单扣减）

SKU 模块存在多个已知 bug（状态值不一致、unbind 与 NOT NULL 约束冲突），属于半成品。业务方向调整为「用户下单、店主处理」，不需要独立的 SKU 管理。

## 目标

外科手术式移除 `clothing_goods_sku` 相关的全部代码和 UI，不影响商品规格体系和订单流程。

## 约束

- **不动** `goods_product` 规格体系（保留颜色/尺码选择）
- **不动** 库存扣减逻辑（以后单独改）
- **不动** 订单流程、购物车、小程序端
- **不删** 数据库表（只停用代码，避免迁移风险）
- **不删** `litemall_order_goods.sku_id`、`litemall_cart.sku_id` 字段（兼容旧数据）

---

## 移除范围

### 1. 前端（clothing-mall-admin）

#### 删除文件

| 文件 | 说明 |
|------|------|
| `src/views/mall/sku.vue` | SKU 管理列表页 |
| `src/views/goods/ocr.vue` | OCR 识别 SKU 页面 |

#### 修改文件

| 文件 | 改动 |
|------|------|
| `src/router/index.js` | 移除 `/goods/sku` 和 `/goods/ocr` 路由定义 |
| `src/api/sku.js` | 移除 SKU 相关 API 函数（该文件混合了 sku + store + guide + memberLevel，只删 SKU 部分） |
| `src/views/goods/create.vue` | 移除 SKU 关联选择器 UI 及 skuIds 数据绑定 |
| `src/views/goods/edit.vue` | 同上 |

#### 菜单配置

- `src/locales/zh-Hans.js` 中如果存在 SKU 相关菜单翻译，移除对应条目

### 2. 后端（Java）

#### 删除文件

| 文件路径 | 说明 |
|----------|------|
| `clothing-mall-admin-api/.../web/AdminClothingSkuController.java` | 管理后台 SKU 控制器 |
| `clothing-mall-admin-api/.../web/AdminOcrController.java` | 管理后台 OCR 控制器 |

**保留的 db 层文件**（wx-api 小程序端依赖）：
- `ClothingGoodsSkuService.java` — WxCartController、WxClothingSkuController、WxManagerGoodsController、WxOcrController 均依赖
- `ClothingGoodsSkuMapper.java` + `.xml` — Service 层依赖
- `ClothingGoodsSku.java` — 实体类

#### 修改文件

| 文件 | 改动 |
|------|------|
| `AdminGoodsService.java` | 移除 `ClothingGoodsSkuService` 依赖注入；移除 create/update 中 bind/unbind 调用 |
| `GoodsAllinone.java` | 移除 `List<Integer> skuIds` 字段 |

#### AdminGoodsService.java 详细改动

```java
// 移除：
@Autowired
private ClothingGoodsSkuService clothingGoodsSkuService;

// create() 中移除：
if (skuIds != null && !skuIds.isEmpty()) {
    clothingGoodsSkuService.bindGoodsBatch(skuIds, goodsId);
}

// update() 中移除：
clothingGoodsSkuService.unbindByGoodsId(goodsId);
if (skuIds != null && !skuIds.isEmpty()) {
    clothingGoodsSkuService.bindGoodsBatch(skuIds, goodsId);
}
```

### 3. 数据库

- `clothing_goods_sku` 表：**保留不删**
- 历史迁移脚本（V1.0.1、V1.0.11、V1.0.12、V1.0.17）：**不动**

### 4. 权限配置

- 系统中如果存在 `admin:clothing:sku:*` 权限配置，标记为废弃但不主动删除（避免权限体系报错）

---

## 不动的部分

| 模块 | 说明 |
|------|------|
| `litemall_goods_product` | 规格组合（颜色×尺码+价格+库存），订单流程在用 |
| `litemall_goods_specification` | 规格名/值定义 |
| `litemall_goods_attribute` | 商品参数 |
| 订单流程 | 下单、支付、发货、退款逻辑不变 |
| 购物车 | `sku_id` 字段保留兼容旧数据 |
| 小程序端 | 商品详情、下单页面不变 |
| `litemall_order_goods.sku_id` | 保留兼容旧数据 |

---

## 风险评估

| 风险 | 影响 | 应对 |
|------|------|------|
| 编译错误 | 移除后可能有其他代码引用 SKU | 编译验证，逐个修复 |
| 前端菜单残留 | 左侧菜单可能出现空路由 | 清理路由和菜单配置 |
| 旧数据兼容 | 已有订单的 sku_id 指向不存在的记录 | 保留字段和表，不影响历史查询 |
| 权限报错 | 删掉权限可能导致管理后台报错 | 保留权限记录，只删代码 |

## 验证方式

1. 后端 `mvn clean compile` 编译通过
2. 管理后台前端 `npm run dev` 启动无报错
3. 商品创建/编辑流程正常（不报 SKU 相关错误）
4. 订单列表、详情正常展示（含历史订单）
5. 左侧菜单无残留 SKU/OCR 入口
