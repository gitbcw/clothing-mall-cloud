# 小程序上线 & HTTPS 配置 & 企业微信消息通知 — 设计文档

## 目标

将小程序以体验版上线，配置服务器 HTTPS，为后续关联企业微信测试消息通知做准备。

## 背景

- 域名 `www.transmute.cn` 已解析到服务器 `47.107.151.70`
- 阿里云免费 SSL 证书（Nginx 格式，.pem + .key）待下载
- ICP 备案已提交，等待管局审核（约 1-2 周）
- 最终目的是关联企业微信测试消息通知，但企微关联要求小程序正式版上线
- 正式版上线要求域名已备案 + HTTPS

## 阻塞链

```
ICP 备案 (已提交，等审核)
    ↓
HTTPS 配置 (本次要做)
    ↓
小程序提交审核 → 正式版上线
    ↓
企业微信关联小程序
    ↓
测试消息通知
```

## 技术方案：Nginx SSL 终结

```
小程序/客户端 ──HTTPS(443)──► Nginx ──HTTP(8080)──► Java App
```

- Nginx 处理 SSL，反向代理到 Java App
- Java App 零改动
- 80 端口自动 301 跳转到 443
- 管理后台暂不走 HTTPS（通过 IP + 端口访问）

## 实施步骤

### 第一阶段：服务器 HTTPS 配置

| # | 任务 | 具体操作 |
|---|------|----------|
| 1 | 下载 SSL 证书 | 阿里云控制台 → SSL 证书 → 下载 Nginx 格式 (.pem + .key) |
| 2 | 上传证书到服务器 | 放到 `/home/admin/clothing-mall/docker/nginx/ssl/` |
| 3 | 修改 Nginx 配置 | `default.conf` 添加 443 SSL 配置，server_name 改为 `www.transmute.cn` |
| 4 | 修改 docker-compose.yml | 取消 HTTPS 注释段，添加 443 端口映射和证书挂载 |
| 5 | 开放服务器 443 端口 | 阿里云安全组放行 443/tcp |
| 6 | 重建部署 | `docker compose build nginx && docker compose up -d nginx` |
| 7 | 验证 HTTPS | 浏览器访问 `https://www.transmute.cn/wx/` 确认正常 |

### 第二阶段：代码配置更新

| # | 任务 | 文件 |
|---|------|------|
| 8 | 小程序 release API 地址 | `clothing-mall-wx/config/api.js` → `https://www.transmute.cn/wx/` |
| 9 | 后端存储地址 | `docker/litemall/application.yml` → `https://www.transmute.cn/wx/storage/fetch/` |

### 第三阶段：小程序发布

| # | 任务 | 说明 |
|---|------|------|
| 10 | 微信后台配置服务器域名 | 开发管理 → 服务器域名 → 添加 `https://www.transmute.cn` |
| 11 | 上传体验版 | 微信开发者工具上传代码 |
| 12 | 添加体验成员 | 小程序后台添加测试人员微信号 |
| 13 | 端到端测试 | 体验版验证 HTTPS 接口调用正常 |

### 第四阶段：等待备案后

| # | 任务 | 前置条件 |
|---|------|----------|
| 14 | 小程序提交审核 | ICP 备案通过 |
| 15 | 正式版上线 | 审核通过 |
| 16 | 企业微信关联小程序 | 小程序正式版已上线 |
| 17 | 填入企微配置参数 | corpId、secret、senderId 等 |
| 18 | 测试消息通知 | 管理后台发送测试消息 |

## 涉及文件

| 文件 | 改动类型 |
|------|----------|
| `docker/nginx/conf.d/default.conf` | 新增 443 SSL server 块 |
| `docker/docker-compose.yml` | 取消 HTTPS 注释，调整端口映射 |
| `clothing-mall-wx/config/api.js` | 修改 release API 地址 |
| `docker/litemall/application.yml` | 修改存储地址 |

## 风险点

- **ICP 备案不通过**：需根据管局反馈补充材料，重新提交
- **证书过期**：阿里云免费证书有效期 1 年，到期前需手动续期
- **微信审核不通过**：确保小程序内容合规、功能完整
- **企微关联限制**：小程序正式版上线后才能关联企微，这是硬性要求

## 暂不处理

- 管理后台 HTTPS（通过 IP 访问即可）
- H5 前端生产 API 地址（占位符，暂不用）
- 微信支付（无商户号，正式商用前处理）
- 发货通知企微推送（代码已写但被注释，等企微关联后启用）
