# 快递公司配置化设计

## 背景

项目中快递公司列表存在三套不同来源（YAML 配置、管理后台 JS、小程序硬编码），且存储格式不统一（编码 vs 中文名称）。需要统一为数据库配置，管理后台可管理，小程序动态获取。

## 数据模型

新建 `litemall_shipper` 表：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int PK | 主键 |
| code | varchar(20) UNIQUE | 快递公司编码 |
| name | varchar(63) | 快递公司名称 |
| enabled | tinyint(1) DEFAULT 1 | 是否启用 |
| sort_order | int DEFAULT 0 | 排序 |
| add_time | datetime | 创建时间 |
| update_time | datetime | 更新时间 |
| deleted | tinyint(1) DEFAULT 0 | 逻辑删除 |

## 预设数据

SF-顺丰速运, ZTO-中通快递, YTO-圆通速递, YD-韵达速递, STO-申通快递, JTSD-极兔速递, EMS-EMS, JD-京东快递, DBL-德邦快递, YZPY-邮政快递包裹

## API

| 接口 | 说明 |
|------|------|
| GET /admin/shipper/list | 管理后台：全部快递公司 |
| POST /admin/shipper/create | 新增 |
| POST /admin/shipper/update | 修改 |
| POST /admin/shipper/delete | 删除 |
| POST /admin/shipper/toggle | 启用/禁用 |
| GET /wx/manager/order/shippers | 小程序：已启用的快递公司名称列表 |

## 前端改造

- 管理后台：新增"快递公司管理"页面（平台设置下）
- 小程序订单发货：从 API 获取列表，提交编码
- 小程序售后发货：同上

## 数据迁移

将历史订单/售后中 ship_channel 的中文名称统一转为编码，匹配不到的保留原值。
