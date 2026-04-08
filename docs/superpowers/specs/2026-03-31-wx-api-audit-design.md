# 小程序 API 全面排查与修复设计

**日期**：2026-03-31
**范围**：clothing-mall-wx 前端 + clothing-mall-wx-api 后端
**方案**：方案 C — 双向适配（后端补缺失功能，前端修正错误路径）

---

## 背景

小程序 30 个页面已全部对接后端 API，但存在以下问题：
- 8 个前端定义的端点在后端不存在
- 部分认证页面绕过了统一请求封装
- services 层引用了不存在的模块
- 本地开发环境未配置 localhost
- 图片上传代码重复 4 处

---

## 问题分类

### A. 后端缺失（需新增接口）

| 端点 | 功能 | 优先级 | 说明 |
|------|------|--------|------|
| `GET /wx/region/list` | 行政区域列表 | P0 | 数据库已有 region 表，暴露查询接口即可 |
| `GET /wx/express/query` | 物流查询 | P1 | 需接入第三方服务或先 mock |
| `POST /wx/order/comment` | 订单评价 | P2 | 需新建评价表，属于新增功能 |
| `GET /wx/order/goods` | 待评价商品列表 | P2 | 依赖评价功能 |

### B. 前端路径错误（需修改调用）

| 前端常量 | 错误路径 | 正确路径 | 使用情况 |
|---------|---------|---------|---------|
| `SearchResult` | `search/result` | `goods/list`（已有） | search.js |
| `UserUpdate` | `user/update` | `auth/profile`（已有） | 暂未使用 |
| `ClothingSkuCreate` | `clothing/sku/create` | 删除 | 暂未使用 |
| `ClothingSkuUpdate` | `clothing/sku/update` | 删除 | 暂未使用 |

### C. 代码质量问题

| 问题 | 修复 | 文件 |
|------|------|------|
| `services/index.js` 引用不存在的 `activity.js` | 删除该引用 | `services/index.js` |
| 认证页用 `wx.request` 而非 `util.request` | 统一改用 `util.request` | `accountLogin.js`, `register.js`, `reset.js` |
| 图片上传 4 处重复代码 | 提取为 `util.uploadFile` | `util.js` + 4 个页面 |
| 本地开发无 localhost 选项 | api.js 增加 localhost 配置 | `config/api.js` |

### D. 前端未使用的后端 API（可补充）

| 后端端点 | 用途 |
|---------|------|
| `/wx/clothing/user/levels` | 会员等级展示 |
| `/wx/clothing/store/nearest` | 最近门店 |
| `/wx/flashSale/list` + `/wx/flashSale/detail` | 限时特卖 |
| `/wx/fullReduction/list` | 满减活动 |
| `/wx/aftersale/cancel` | 取消售后 |
| `/wx/catalog/getfirstcategory` + `/wx/catalog/getsecondcategory` | 分类（季节过滤） |
| `/wx/clothing/sku/sizes` + `/wx/clothing/sku/query` | SKU 查询 |

---

## 分批实施计划

### 第 1 批：阻塞性修复（影响核心流程）

| 序号 | 任务 | 类型 | 文件 |
|------|------|------|------|
| 1.1 | `services/index.js` 删除 `activity.js` 引用 | 前端 | `services/index.js` |
| 1.2 | 认证页统一使用 `util.request` | 前端 | `accountLogin.js`, `register.js`, `reset.js` |
| 1.3 | 后端新增 `GET /wx/region/list` 区域查询接口 | 后端 | 新增 `WxRegionController.java` |
| 1.4 | `api.js` develop 环境改为 localhost | 前端 | `config/api.js` |
| 1.5 | `api.js` 清理无效端点（SearchResult, UserUpdate, ClothingSkuCreate, ClothingSkuUpdate） | 前端 | `config/api.js` |
| 1.6 | `api.js` 补充缺失端点定义 | 前端 | `config/api.js` |

### 第 2 批：功能补全（提升体验）

| 序号 | 任务 | 类型 | 文件 |
|------|------|------|------|
| 2.1 | 后端新增 `GET /wx/express/query` 物流查询接口（先 mock） | 后端 | 新增 `WxExpressController.java` |
| 2.2 | 前端搜索页修正调用路径 | 前端 | `search.js` |
| 2.3 | 提取 `util.uploadFile` 统一图片上传 | 前端 | `util.js` |
| 2.4 | 4 个页面上传方法改用 `util.uploadFile` | 前端 | `tabShelf.js`, `goodsEdit.js`, `feedback.js`, `aftersale.js` |
| 2.5 | `api.js` 补充后端已有但前端未定义的 API | 前端 | `config/api.js` |

### 第 3 批：增量功能（后续迭代）

| 序号 | 任务 | 类型 | 文件 |
|------|------|------|------|
| 3.1 | 新建评价表 + 后端评价接口 | 后端 | 新增表 + Controller + Service |
| 3.2 | 小程序评价页面开发 | 前端 | 新增页面 |

---

## 技术细节

### api.js 本地开发配置

```javascript
var apiRootMap = {
  develop: 'http://127.0.0.1:8088/wx/',
  trial: 'http://47.107.151.70:8088/wx/',
  release: 'https://www.menethil.com.cn/wx/'
};
```

微信开发者工具需勾选「不校验合法域名」。本地后端通过 `./scripts/docker-start.sh deploy` 启动。

### region/list 后端实现

数据库已有 `litemall_region` 表（省/市/区三级），后端已有 `GetRegionService`。在 `WxAddressController` 中新增公开接口：

```
GET /wx/region/list?pid=0        → 所有省
GET /wx/region/list?pid=110000   → 北京市下的市
```

### express/query 后端实现

先返回 mock 数据（与现有 orderDetail 页面一致），后续接入快递100 等第三方服务。

### util.uploadFile 封装

```javascript
function uploadFile(filePath) {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: ApiRootUrl + 'storage/upload',
      filePath: filePath,
      name: 'file',
      header: { 'X-Litemall-Token': wx.getStorageSync('token') },
      success(res) {
        if (res.statusCode === 200) {
          const data = JSON.parse(res.data);
          resolve(data);
        } else { reject(res); }
      },
      fail: reject
    });
  });
}
```

---

## 影响面

- **后端**：新增 2 个 Controller（Region、Express），不修改现有文件
- **前端**：修改约 10 个文件，不新增文件
- **数据库**：第 3 批需新建评价表，前 2 批无数据库变更

## 回滚方式

全部改动通过 git 分支管理。后端新增接口是纯增量，不影响现有功能。
