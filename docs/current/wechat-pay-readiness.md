# 微信支付接入准备清单

> 适用范围：当前云开发小程序 `cloudbase-d3g1zmq7r388144eb`，商城端通过 `wx-order.prepay` 创建支付参数，小程序端通过 `wx.requestPayment` 拉起支付。

## 当前结论

当前代码已保留 Mock 支付与真实微信支付两套路径：

- 默认 `MOCK_PAY=true`，用于上线前业务测试，不调用微信支付。
- 切换 `MOCK_PAY=false` 后，`wx-order.prepay` 会调用 CloudBase 云支付 `cloud.cloudPay.unifiedOrder`。
- 支付成功后由 `wx-pay-callback` 更新订单状态。

商户号不是唯一配置项。真实支付可用前，必须完成商户权限、小程序绑定、云支付配置、回调验证和 1 分钱闭环测试。

## 客户需要确认/提供

1. 当前小程序 AppID：`wx07e5af39e1096d3d`。
2. 微信支付商户号 `mchid`。
3. 商户号已开通 JSAPI/小程序支付能力。
4. 商户号已绑定当前小程序 AppID。
5. 商户平台支付安全配置可用：API v3 密钥、商户 API 证书/私钥、证书序列号等，按云开发/CloudBase 支付配置页面要求填写。
6. 商户主体、结算账户、产品权限审核均已完成。

## 我们需要配置/验证

1. 在 CloudBase/云开发支付配置中填入客户商户信息。
2. 确认 `wx-order` 云函数环境变量：
   - `TCB_ENV_ID=cloudbase-d3g1zmq7r388144eb`
   - `MOCK_PAY=false`
3. 确认 `wx-order` 依赖包含 `wx-server-sdk`。
4. 确认 `wx-pay-callback` 云函数存在且可访问数据库。
5. 调用 `wx-order.payStatus` 检查真实支付准备状态。
6. 创建 1 分钱测试订单，完成真实支付闭环。

## 验收步骤

1. 保持 `MOCK_PAY=true`，确认下单、订单列表、管理端订单流仍可用。
2. 配置客户商户信息和云支付能力。
3. 将 `wx-order` 的 `MOCK_PAY` 改为 `false` 并重新部署/更新配置。
4. 调用 `wx-order.payStatus`，确认：
   - `mockPay=false`
   - `sdkLoaded=true`
   - `cloudPayAvailable=true`
   - `readyForRealPay=true`
5. 用 1 分钱商品或临时测试订单支付。
6. 支付成功后确认：
   - 小程序支付页回到成功页。
   - `wx-pay-callback` 日志出现成功回调。
   - 快递订单状态从 `101` 变为 `201`。
   - 自提订单状态从 `101` 变为 `501`。
   - `pay_id` 写入微信支付 `transaction_id`。
7. 重复回调不会重复改状态。
8. 金额不一致回调不会把订单改为已支付。

## 当前风险

- 退款链路尚未完整接入微信退款，当前仍应按人工退款或后续专项处理。
- 支付回调由微信/云支付异步触发，前端支付成功不应作为订单已支付的唯一依据。
- 切换真实支付前，必须跑 1 分钱测试；不要只改商户号直接上线。
