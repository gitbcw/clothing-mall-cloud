# 微信支付集成调研与实施方案

> **调研时间**: 2026-04-11
> **状态**: 实施中
> **前置条件**: 微信支付商户号（需营业执照）+ 绑定小程序 AppID + 云环境绑定商户号

---

## 一、调研结论

### 推荐方案：云调用支付

微信小程序云开发原生支持 `cloud.cloudPay.unifiedOrder()`，优势：

- **免鉴权**：无需自行实现微信支付签名算法
- **免证书**：无需管理商户 API 证书
- **免密钥**：无需在代码中存储商户密钥
- **私有协议**：基于微信私有通信协议，安全性更高

### 模拟支付现状

- **微信官方沙箱**：V2 老沙箱已于 2022 年 9 月下线，V3 无沙箱能力
- **云调用沙箱**：无官方沙箱模式
- **结论**：需在业务层实现 Mock 支付，通过环境变量 `MOCK_PAY` 控制

---

## 二、支付流程

### 真实支付流程

```
小程序前端                wx-order 云函数              微信支付服务器           wx-pay-callback
    │                         │                           │                       │
    │  1. prepay(orderId)     │                           │                       │
    │ ──────────────────────► │                           │                       │
    │                         │  2. cloud.cloudPay        │                       │
    │                         │     .unifiedOrder()       │                       │
    │                         │ ─────────────────────────►│                       │
    │                         │                           │                       │
    │                         │  3. 返回支付参数           │                       │
    │                         │ ◄─────────────────────────│                       │
    │  4. 返回支付参数         │                           │                       │
    │ ◄────────────────────── │                           │                       │
    │                         │                           │                       │
    │  5. wx.requestPayment() │                           │                       │
    │ ─────────────────────────────────────────────────►  │                       │
    │                         │                           │                       │
    │  6. 用户完成支付         │                           │                       │
    │ ◄──────────────────────────────────────────────────  │                       │
    │                         │                           │  7. 异步回调通知       │
    │                         │                           │ ──────────────────────►│
    │                         │                           │                       │ 8. 更新订单状态
    │  9. 跳转支付结果页       │                           │                       │
    │ ──────►                 │                           │                       │
```

### 模拟支付流程

```
小程序前端                wx-order 云函数
    │                         │
    │  1. prepay(orderId)     │
    │ ──────────────────────► │
    │                         │  2. MOCK_PAY=true
    │                         │     直接更新订单状态
    │                         │     pay_id = 'MOCK_{order_sn}'
    │                         │     pay_time = NOW()
    │  3. { mockPay: true }   │
    │ ◄────────────────────── │
    │                         │
    │  4. 跳过 wx.requestPayment
    │     直接跳转支付成功页   │
    │ ──────►                 │
```

---

## 三、技术方案详情

### 3.1 后端 prepay() 实现

**文件**: `cloudfunctions/wx-order/service/order.js`

```javascript
async function prepay(data, context) {
  // ... 参数校验（已有）...

  const mockPay = (process.env.MOCK_PAY || 'true') === 'true'

  if (mockPay) {
    // 模拟支付：直接标记已付
    const nextStatus = order.delivery_type === 'pickup'
      ? STATUS.VERIFY_PENDING    // 501
      : STATUS.PAY               // 201
    await db.query(
      `UPDATE litemall_order
       SET order_status = ?, pay_id = ?, pay_time = NOW(), update_time = NOW()
       WHERE id = ?`,
      [nextStatus, 'MOCK_' + order.order_sn, orderId]
    )
    return response.ok({ mockPay: true })
  }

  // 真实微信支付
  const totalFee = Math.round(parseFloat(order.actual_price) * 100) // 元 → 分
  const payResult = await cloud.cloudPay.unifiedOrder({
    body: `订单:${order.order_sn}`,
    outTradeNo: order.order_sn,
    spbillCreateIp: '127.0.0.1',
    totalFee: totalFee,
    envId: process.env.TCB_ENV_ID,
    functionName: 'wx-pay-callback',
    tradeType: 'JSAPI',
  })
  return response.ok({
    timeStamp: payResult.timeStamp,
    nonceStr: payResult.nonceStr,
    packageValue: payResult.package,
    signType: 'MD5',
    paySign: payResult.paySign,
  })
}
```

### 3.2 支付回调云函数

**文件**: `cloudfunctions/wx-pay-callback/index.js`（新建）

- 接收微信异步通知（event.event_type === 'TRANSACTION.SUCCESS'）
- 按 order_sn 查找订单 → 更新状态为 PAY/VERIFY_PENDING
- 幂等处理：仅处理 order_status = 101 的订单
- 始终返回 `{ errcode: 0 }` 防止微信重试

### 3.3 前端 Mock 分支

在所有调用 `prepay` 的页面，检查 `res.data.mockPay`：

```javascript
if (res.data && res.data.mockPay) {
  // 模拟支付：后端已标记已付，直接跳转成功页
  wx.redirectTo({ url: '/pages/payResult/payResult?status=1&orderId=' + orderId })
  return
}
// 真实支付：调用 wx.requestPayment
wx.requestPayment({ ... })
```

---

## 四、环境变量

| 变量 | 值 | 说明 |
|------|-----|------|
| `MOCK_PAY` | `true` / `false` | 模拟支付开关，默认 true |
| `TCB_ENV_ID` | 已有 | 云环境 ID，真实支付需要 |

真实支付还需额外配置（当前不需要）：
- 微信支付商户号 → 在 CloudBase 控制台绑定
- `MCH_ID` 环境变量（可选，取决于绑定方式）

---

## 五、工作清单

### 后端

- [x] 实现 `prepay()` Mock 支付路径
- [x] 实现 `prepay()` 真实支付骨架
- [x] 删除 `payNotify()`（移到独立云函数）
- [x] 清理 `wx-order/index.js` 路由
- [x] 新建 `wx-pay-callback` 云函数
- [ ] 退款接口接入（后续任务，需商户号）

### 前端

- [x] `confirm_order.js` 加 mock 分支
- [x] `orderDetail.js` 加 mock 分支
- [x] `payResult.js` 加 mock 分支

### 部署 & 测试

- [x] 设置 `MOCK_PAY=true` 环境变量
- [x] 部署 `wx-order` 云函数
- [x] 创建并部署 `wx-pay-callback` 云函数
- [x] 测试模拟支付：下单 → 付款 → 验证状态（订单124，101→201，pay_id=MOCK_{sn}）
- [x] 测试重复支付防护（errno:700，"订单不能支付"）
- [x] 测试快递模式（101→201）；自提模式逻辑已覆盖（101→501），无待支付自提订单可测试

### 后续（需商户号）

- [ ] CloudBase 控制台绑定微信支付商户号
- [ ] 设置 `MOCK_PAY=false`
- [ ] 端到端真实支付测试
- [ ] 退款接口实现

---

## 六、参考

- [云调用支付文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/reference-sdk-api/CloudPay.html)
- [微信支付云开发集成](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/guides/openapi/openapi.html)
