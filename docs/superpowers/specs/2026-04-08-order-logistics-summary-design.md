# 订单详情页物流状态摘要

## 背景
当前快递订单的物流信息仅展示在页面最底部，不够显眼。用户希望在最上方的配送卡片中也能看到物流状态。

## 变更内容

### 1. 顶部配送卡片增加物流摘要
- 当订单已发货（有 `expNo`）时，在收货地址下方显示最新一条物流轨迹摘要
- 显示内容：最新轨迹文本（截断）+ 时间
- 整个配送卡片可点击，跳转到独立物流详情页
- 视觉：粉色渐变背景条，带"查看物流详情"箭头

### 2. 新建物流详情页
- 路径：`pages/ucenter/logistics/logistics`
- 顶部：快递公司名 + 快递单号
- 主体：完整物流时间轴（复用现有 timeline 样式）
- 数据：通过 orderId 调用 ExpressQuery API 获取

### 3. 底部物流区保持不变
- 现有的快递单号折叠区域保留，不做修改

## 涉及文件
- `clothing-mall-wx/pages/ucenter/orderDetail/orderDetail.wxml` — 顶部卡片增加物流摘要
- `clothing-mall-wx/pages/ucenter/orderDetail/orderDetail.wxss` — 摘要样式
- `clothing-mall-wx/pages/ucenter/orderDetail/orderDetail.js` — 跳转方法
- `clothing-mall-wx/pages/ucenter/logistics/logistics.*` — 新页面（4 文件）
- `clothing-mall-wx/app.json` — 注册新页面

## 风险
- 纯前端 UI 变更，不涉及后端
- 未发货订单无影响（条件渲染）
