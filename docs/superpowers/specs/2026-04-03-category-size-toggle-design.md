# 商品分类尺码开关设计

## 动机

不同商品分类对尺码的需求不同：服装类需要尺码选择（S/M/L/XL），饰品类（项链、手链等）无需尺码。目前小程序购买弹窗中尺码选择器对所有商品都显示，需要按分类控制是否启用。

## 需求

1. 在 L1 一级分类上配置"是否启用尺码选择"开关
2. L2 二级分类继承其所属 L1 分类的设置
3. 管理后台分类编辑页展示该开关
4. 小程序购买弹窗根据开关隐藏/显示尺码选择区域
5. 尺码列表保持硬编码 `['S', 'M', 'L', 'XL']`，不做配置化

## 数据模型

### litemall_category 表新增字段

```sql
ALTER TABLE litemall_category ADD COLUMN enable_size TINYINT(1) DEFAULT 1 COMMENT '是否启用尺码选择(0=否,1=是)';
```

- 默认值 `1`（启用），向后兼容，现有分类行为不变
- 仅 L1 分类需要设置该值，L2 分类通过 pid 查找父级 L1 分类获取

### Java 实体

`LitemallCategory.java` 新增 `enableSize` 字段（Boolean 类型），MyBatis 自动映射。

## 改动清单

### 后端

| 文件 | 改动 |
|------|------|
| `LitemallCategory.java` | 新增 `enableSize` 字段 |
| `LitemallCategoryMapper.xml` | 结果映射和查询条件中加入 `enable_size` |
| 迁移 SQL | `docker/db/migration/` 新增迁移脚本 |
| 完整建表 SQL | `docker/db/init-sql/00_clothing_mall.sql` 同步更新 |
| 小程序商品详情 API | 商品详情响应中包含分类的 `enableSize` 字段 |

### 管理后台前端

| 文件 | 改动 |
|------|------|
| `clothing-mall-admin/src/views/mall/category.vue` | 编辑表单中 L1 分类显示 "启用尺码选择" switch |

### 小程序前端

| 文件 | 改动 |
|------|------|
| `clothing-mall-wx/components/sku-picker/` | 新增 `enableSize` 属性，为 false 时隐藏尺码选择区域 |
| `clothing-mall-wx/pages/goods_detail/goods_detail.js` | 从商品分类获取 `enableSize`，传入 sku-picker |

## 不改动的部分

- 尺码列表 `['S', 'M', 'L', 'XL']` 保持硬编码
- 购买/加购接口不变，无尺码时不传 size 参数
- `clothing_size` 表不动

## 影响面

- `litemall_category` 表（加字段）
- 管理后台分类管理页
- 小程序 sku-picker 组件和商品详情页

## 回滚方式

```sql
ALTER TABLE litemall_category DROP COLUMN enable_size;
```

前端代码回退即可，无数据迁移风险。
