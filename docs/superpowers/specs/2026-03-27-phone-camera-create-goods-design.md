# 手机端拍照创建商品（合并 SKU 表）设计文档

> 日期：2026-03-27
> 状态：待用户确认

## 背景

### 当前问题

1. **手机端拍照创建的是 SKU，不是商品**：`confirmUpload.js` 调用 `ClothingSkuCreate` API，创建 `clothing_goods_sku` 记录。但 SKU 应该是商品的附属，不应独立存在。
2. **两套 SKU 表并行**：`clothing_goods_sku`（服装扩展）和 `litemall_goods_product`（原系统）功能重叠，购物车/订单已实现双模式分流（`skuId` / `productId`），长期需要合并。

### 用户期望

- 拍照一次录入一个商品（draft），一个商品可关联多个 SKU
- 拍照时可以快速添加 SKU（颜色/尺码/价格/库存），也可以跳过后续在管理后台补全
- SKU 最终变成商品的附属，不再独立存在

## 分步策略

| 步骤 | 内容 | 影响面 |
|------|------|--------|
| **第一步** | 手机端拍照改为创建商品 | 手机端 + 后端 API |
| **第二步** | 合并 SKU 表，废弃 `litemall_goods_product` | 购物车/订单/管理后台（后续） |

本文档只覆盖第一步。

## 第一步设计：手机端拍照创建商品

### 流程变更

```
当前：拍照 → AI识别 → confirmUpload → ClothingSkuCreate → clothing_goods_sku（独立）
改为：拍照 → AI识别 → confirmUpload → 创建 litemall_goods(draft) + clothing_goods_sku(附属)
```

### 后端改动

#### 1. 新增接口：`POST /wx/manager/goods/create`

用于小程序管理端快速创建商品草稿。

**请求体**：
```json
{
  "name": "商品名称",
  "categoryId": 1,
  "brief": "简介",
  "listPicUrl": "主图URL",
  "gallery": ["图片1", "图片2"],
  "sourceImage": "拍照原图URL",
  "aiRecognized": true,
  "aiConfidence": 0.85,
  "skus": [
    {
      "color": "白色",
      "size": "M",
      "price": 99.00,
      "stock": 50
    },
    {
      "color": "白色",
      "size": "L",
      "price": 99.00,
      "stock": 30
    }
  ]
}
```

**响应**：
```json
{
  "errno": 0,
  "errmsg": "成功",
  "data": {
    "goodsId": 123
  }
}
```

**处理逻辑**：
1. 创建 `litemall_goods` 记录，`status = 'draft'`，`is_on_sale = false`
2. 如果有 `skus` 数组，批量创建 `clothing_goods_sku` 记录，`goods_id` 关联到新建商品
3. 如果没有 `skus`，只创建商品，后续在管理后台补全 SKU

#### 2. `clothing_goods_sku.goods_id` 改为必填

- 数据库：`ALTER TABLE clothing_goods_sku MODIFY goods_id INT NOT NULL COMMENT '商品ID'`
- 实体类：移除"未关联时为空"的注释
- 现有无 `goods_id` 的 SKU 需要处理（见迁移方案）

### 手机端改动

#### 1. `confirmUpload.js` — 提交逻辑

当前 `submitSku()` 调用 `ClothingSkuCreate`，改为调用新接口 `/wx/manager/goods/create`。

- 必填字段：`name`（商品名称）
- 可选字段：`categoryId`、`brief`、`gallery`、`skus[]`
- 提交成功后返回商品 ID，页面提示"商品创建成功"

#### 2. `confirmUpload.wxml` — 确认页面

- 增加可选的"快速添加 SKU"区域（颜色/尺码/价格/库存）
- 用户可以添加多个 SKU，也可以跳过
- "保存草稿"按钮改为"创建商品"（状态为 draft）
- 保留"暂存草稿"功能（本地存储，后续可继续编辑）

### 迁移方案

现有 `clothing_goods_sku` 中 `goods_id` 为空的记录处理：

```sql
-- 查看无关联的 SKU 数量
SELECT COUNT(*) FROM clothing_goods_sku WHERE goods_id IS NULL OR goods_id = 0;

-- 方案：为无关联的 SKU 自动创建商品草稿
-- 每个无关联 SKU → 创建一个 draft 商品 → 关联 goods_id
```

具体迁移脚本在实施时编写，需要先确认无关联 SKU 的数据量。

### 不动的部分

- `litemall_goods_product` 表和所有引用它的代码（购物车、订单、管理后台）
- `litemall_goods_specification` 表
- 管理后台前端（商品创建/编辑页面）
- SKU 管理页面（`skuList`、`skuDetail`）

## 后续第二步（本文档不实施）

合并 SKU 表的关键动作（供参考）：

1. `clothing_goods_sku` 补齐 `specifications` JSON 字段（前端规格匹配需要）
2. 购物车/订单的 `productId` 引用统一改为 `skuId`
3. 库存操作（`addStock`/`reduceStock`）改为操作 `clothing_goods_sku.stock`
4. 管理后台商品编辑页面的 `products` 改为 `skus`
5. 废弃 `litemall_goods_product` 和 `litemall_goods_specification`
