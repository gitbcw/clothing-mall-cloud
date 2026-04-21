# 导购提成计算统计功能设计

## 动机

当前系统有门店和导购的完整 CRUD 管理，但缺少导购业绩和提成的计算展示。需要让管理员直观看到每位导购当月的核销订单销售额及应得提成。

## 范围

- 仅计算**核销订单**（`delivery_type = 'pickup'`）
- 仅计算**已完成**状态的订单（`order_status = 401`）
- 通过 `pickup_store_id` 关联门店，每个门店对应唯一导购
- 提成比例使用 `clothing_guide.commission_rate` 字段
- 统计维度：当月（从本月 1 日至今）

## 方案

扩展现有 `admin-clothing` 云函数的 `listGuide` 接口，查完导购列表后追加一条聚合 SQL 回填提成数据。前端在现有导购页面加列展示。

### 后端改动

**文件**：`cloudfunctions/admin-clothing/service/store.js` 的 `listGuide` 方法

1. 查完导购列表后，提取所有 `store_id`
2. 执行聚合 SQL：

```sql
SELECT pickup_store_id AS store_id, SUM(actual_price) AS month_sales
FROM litemall_order
WHERE pickup_store_id IN (?)
  AND order_status = 401
  AND delivery_type = 'pickup'
  AND update_time >= DATE_FORMAT(NOW(), '%Y-%m-01')
  AND deleted = 0
GROUP BY pickup_store_id
```

3. 将 `month_sales` 按门店回填到导购对象上
4. 提成 = `month_sales × commission_rate`

**返回格式**：每个导购对象新增两个字段：
- `monthSales`：当月核销订单销售额（元），无核销订单时为 0
- `monthCommission`：当月应得提成（元），无核销订单时为 0

### 前端改动

**文件**：`clothing-mall-admin/src/views/mall/guide.vue`

在导购列表表格中新增两列，位于「提成比例」列之后、「状态」列之前：

| 新列 | 字段 | 格式 |
|------|------|------|
| 当月销售额 | `monthSales` | ¥12,580.00 |
| 当月提成 | `monthCommission` | ¥251.60 |

- 空值显示 ¥0.00
- 暂不支持排序

## 不做的事

- 快递订单不纳入提成（无法关联导购）
- 不做历史月份查询（仅当月）
- 不做提成结算/审批流程（仅展示计算结果）
- 不新建独立统计页面
