# 小程序 API 全面排查与修复 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复小程序前端与后端 API 对接中的所有已知问题，确保全部接口可正常调用。

**Architecture:** 双向适配 — 后端补充缺失功能接口（region、express），前端修正错误路径、统一请求方式、消除重复代码。分 3 批实施，每批独立可验证。

**Tech Stack:** Java 8 + Spring Boot（后端）、微信小程序 JS（前端）、Maven

---

## 文件结构

### 后端新增文件
| 文件 | 职责 |
|------|------|
| `clothing-mall-wx-api/.../wx/web/WxRegionController.java` | 区域查询公开接口 |
| `clothing-mall-wx-api/.../wx/web/WxExpressController.java` | 物流查询接口（需登录） |

### 后端修改文件
无 — 所有后端改动均为纯增量新增。

### 前端修改文件
| 文件 | 职责 |
|------|------|
| `clothing-mall-wx/config/api.js` | API 端点定义、环境配置 |
| `clothing-mall-wx/services/index.js` | 服务层统一导出 |
| `clothing-mall-wx/utils/util.js` | 请求封装 + 新增 uploadFile |
| `clothing-mall-wx/pages/auth/accountLogin/accountLogin.js` | 账号登录页 |
| `clothing-mall-wx/pages/auth/register/register.js` | 注册页 |
| `clothing-mall-wx/pages/auth/reset/reset.js` | 密码重置页 |
| `clothing-mall-wx/pages/manager/tabShelf/tabShelf.js` | 管理端商品上架 |
| `clothing-mall-wx/pages/manager/goodsEdit/goodsEdit.js` | 商品编辑 |
| `clothing-mall-wx/pages/ucenter/feedback/feedback.js` | 意见反馈 |
| `clothing-mall-wx/pages/ucenter/aftersale/aftersale.js` | 申请售后 |

---

## 第 1 批：阻塞性修复

### Task 1: 修复 services/index.js 引用错误

**Files:**
- Modify: `clothing-mall-wx/services/index.js:11`

- [ ] **Step 1: 删除不存在的 activity.js 引用**

将 `clothing-mall-wx/services/index.js` 第 11 行 `activity: require('./activity.js')` 删除。最终文件内容：

```javascript
/**
 * API 服务统一导出
 */
module.exports = {
  user: require('./user.js'),
  goods: require('./goods.js'),
  cart: require('./cart.js'),
  order: require('./order.js'),
  coupon: require('./coupon.js'),
  address: require('./address.js')
}
```

- [ ] **Step 2: 验证修复**

在微信开发者工具中编译小程序，确认控制台不再报 `Cannot find module './activity.js'` 错误。

- [ ] **Step 3: 提交**

```bash
git add clothing-mall-wx/services/index.js
git commit -m "fix(wx): 修复 services/index.js 引用不存在的 activity.js"
```

---

### Task 2: 认证页统一使用 util.request

当前 `accountLogin.js`、`register.js`、`reset.js` 直接使用 `wx.request`，缺少 token 注入和 errno=501 自动跳转登录页的处理。

**Files:**
- Modify: `clothing-mall-wx/pages/auth/accountLogin/accountLogin.js:1-3,36-83`
- Modify: `clothing-mall-wx/pages/auth/register/register.js:1-2,41-78,79-116`
- Modify: `clothing-mall-wx/pages/auth/reset/reset.js:1-2,41-67,99-122`

- [ ] **Step 1: 改造 accountLogin.js**

文件顶部已有 `var util = require("../../../utils/util.js");`，只需将第 48-82 行的 `wx.request` 替换为 `util.request`。`util.request` 返回 Promise 且自动处理 errno=501，所以逻辑更简洁：

将 `accountLogin` 方法中的 `wx.request({...})` 回调改为：

```javascript
accountLogin: function () {
    var that = this;

    if (this.data.password.length < 1 || this.data.username.length < 1) {
      wx.showModal({
        title: "错误信息",
        content: "请输入用户名和密码",
        showCancel: false,
      });
      return false;
    }

    util.request(api.AuthLoginByAccount, {
      username: that.data.username,
      password: that.data.password,
    }, "POST").then(function (res) {
      if (res.errno == 0) {
        that.setData({
          loginErrorCount: 0,
        });
        app.globalData.hasLogin = true;
        wx.setStorageSync("userInfo", res.data.userInfo);
        wx.setStorageSync("token", res.data.token);
        wx.switchTab({
          url: "/pages/mine/mine",
        });
      } else {
        that.setData({
          loginErrorCount: that.data.loginErrorCount + 1,
        });
        app.globalData.hasLogin = false;
        util.showErrorToast("账户登录失败");
      }
    }).catch(function (err) {
      that.setData({
        loginErrorCount: that.data.loginErrorCount + 1,
      });
      util.showErrorToast("账户登录失败");
    });
  },
```

- [ ] **Step 2: 改造 register.js**

文件顶部需新增 `var util = require('../../../utils/util.js');`（当前只引入了 `api` 和 `check`）。

将 `sendCode` 方法（第 53-77 行）改为：

```javascript
sendCode: function() {
    let that = this;

    if (this.data.mobile.length == 0) {
      wx.showModal({
        title: '错误信息',
        content: '手机号不能为空',
        showCancel: false
      });
      return false;
    }

    util.request(api.AuthRegisterCaptcha, {
      mobile: that.data.mobile
    }, 'POST').then(function(res) {
      if (res.errno == 0) {
        wx.showModal({
          title: '发送成功',
          content: '验证码已发送',
          showCancel: false
        });
      } else {
        wx.showModal({
          title: '错误信息',
          content: res.errmsg,
          showCancel: false
        });
      }
    });
  },
```

将 `requestRegister` 方法（第 79-116 行）改为：

```javascript
requestRegister: function(wxCode) {
    let that = this;
    util.request(api.AuthRegister, {
      username: that.data.username,
      password: that.data.password,
      mobile: that.data.mobile,
      code: that.data.code,
      wxCode: wxCode
    }, 'POST').then(function(res) {
      if (res.errno == 0) {
        app.globalData.hasLogin = true;
        wx.setStorageSync('userInfo', res.data.userInfo);
        wx.setStorageSync('token', res.data.token);
        wx.switchTab({
          url: '/pages/mine/mine'
        });
      } else {
        wx.showModal({
          title: '错误信息',
          content: res.errmsg,
          showCancel: false
        });
      }
    });
  },
```

- [ ] **Step 3: 改造 reset.js**

文件顶部需新增 `var util = require('../../../utils/util.js');`（当前只引入了 `api` 和 `check`）。

将 `sendCode` 方法（第 43-67 行）改为：

```javascript
sendCode: function() {
    let that = this;
    wx.request({
      url: api.AuthRegisterCaptcha,
      data: {
        mobile: that.data.mobile
      },
      method: 'POST',
      header: {
        'content-type': 'application/json'
      },
      success: function(res) {
        if (res.data.errno == 0) {
          wx.showModal({
            title: '发送成功',
            content: '验证码已发送',
            showCancel: false
          });
        } else {
          wx.showModal({
            title: '错误信息',
            content: res.data.errmsg,
            showCancel: false
          });
        }
      }
    });
  },
```

> **注意**：`sendCode` 在 reset.js 中保持 `wx.request` 不变，因为获取验证码时用户尚未登录，不需要 token。改用 `util.request` 虽然也能工作（只是 token 为空），但语义更清晰。

将 `startReset` 方法（第 99-122 行）改为：

```javascript
startReset: function() {
    var that = this;

    if (this.data.mobile.length == 0 || this.data.code.length == 0) {
      wx.showModal({
        title: '错误信息',
        content: '手机号和验证码不能为空',
        showCancel: false
      });
      return false;
    }

    if (this.data.password.length < 3) {
      wx.showModal({
        title: '错误信息',
        content: '用户名和密码不得少于3位',
        showCancel: false
      });
      return false;
    }

    if (this.data.password != this.data.confirmPassword) {
      wx.showModal({
        title: '错误信息',
        content: '确认密码不一致',
        showCancel: false
      });
      return false;
    }

    util.request(api.AuthReset, {
      mobile: that.data.mobile,
      code: that.data.code,
      password: that.data.password
    }, 'POST').then(function(res) {
      if (res.errno == 0) {
        wx.navigateBack();
      } else {
        wx.showModal({
          title: '密码重置失败',
          content: res.errmsg,
          showCancel: false
        });
      }
    });
  },
```

- [ ] **Step 4: 验证**

在微信开发者工具中测试：
1. 账号密码登录流程
2. 注册流程（发送验证码 + 提交注册）
3. 密码重置流程（发送验证码 + 重置密码）

- [ ] **Step 5: 提交**

```bash
git add clothing-mall-wx/pages/auth/accountLogin/accountLogin.js \
        clothing-mall-wx/pages/auth/register/register.js \
        clothing-mall-wx/pages/auth/reset/reset.js
git commit -m "fix(wx): 认证页统一使用 util.request，补齐 token 注入和错误处理"
```

---

### Task 3: 后端新增区域查询接口

**Files:**
- Create: `clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/web/WxRegionController.java`

- [ ] **Step 1: 创建 WxRegionController.java**

```java
package org.linlinjava.litemall.wx.web;

import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.domain.LitemallRegion;
import org.linlinjava.litemall.db.service.LitemallRegionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 区域查询接口
 */
@RestController
@RequestMapping("/wx/region")
public class WxRegionController {

    @Autowired
    private LitemallRegionService regionService;

    /**
     * 区域列表
     * pid=0 查所有省，pid=110000 查北京市下的市
     */
    @GetMapping("list")
    public Object list(@RequestParam(defaultValue = "0") Integer pid) {
        List<LitemallRegion> regionList = regionService.queryByPid(pid);
        return ResponseUtil.ok(regionList);
    }
}
```

- [ ] **Step 2: 验证**

启动本地后端（`./scripts/docker-start.sh start`），测试接口：

```bash
curl http://127.0.0.1:8088/wx/region/list?pid=0 | head -c 200
```

预期返回：`{"errno":0,"errmsg":"成功","data":[...省列表...]}`

```bash
curl http://127.0.0.1:8088/wx/region/list?pid=110000 | head -c 200
```

预期返回：`{"errno":0,"errmsg":"成功","data":[...北京市下的区...]}`

- [ ] **Step 3: 提交**

```bash
git add clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/web/WxRegionController.java
git commit -m "feat(api): 新增 GET /wx/region/list 区域查询接口"
```

---

### Task 4: api.js 配置清理与补充

**Files:**
- Modify: `clothing-mall-wx/config/api.js:1-5,53,74-75,96,104-105`

- [ ] **Step 1: develop 环境改为 localhost**

将第 2 行：

```javascript
  develop: 'http://47.107.151.70:8088/wx/',
```

改为：

```javascript
  develop: 'http://127.0.0.1:8088/wx/',
```

- [ ] **Step 2: 删除无效端点**

删除以下 4 行（后端不存在，前端也未实际调用）：

```javascript
  SearchResult: WxApiRoot + 'search/result', //搜索结果
  UserUpdate: WxApiRoot + 'user/update', //更新用户信息
  ClothingSkuCreate: WxApiRoot + 'clothing/sku/create', // 创建 SKU
  ClothingSkuUpdate: WxApiRoot + 'clothing/sku/update', // 更新 SKU
```

> `SearchResult` 在 search.js 中未使用（已用 `GoodsList`），`UserUpdate` 未被任何页面引用，`ClothingSkuCreate/Update` 未被引用。

- [ ] **Step 3: 补充缺失端点定义**

在 `AftersaleDetail` 行之后添加取消售后接口：

```javascript
  AftersaleCancel: WxApiRoot + 'aftersale/cancel', // 取消售后
```

- [ ] **Step 4: 提交**

```bash
git add clothing-mall-wx/config/api.js
git commit -m "fix(wx): api.js develop 改为 localhost，清理无效端点，补充 aftersale/cancel"
```

---

## 第 2 批：功能补全

### Task 5: 后端新增物流查询接口

**Files:**
- Create: `clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/web/WxExpressController.java`

- [ ] **Step 1: 创建 WxExpressController.java**

后端已有 `ExpressService`（快递鸟集成）和 `WxInternalController.snapshotBySn`。新建一个公开给小程序用户端的物流查询接口，使用订单中的物流信息查询轨迹。

```java
package org.linlinjava.litemall.wx.web;

import org.linlinjava.litemall.core.express.ExpressService;
import org.linlinjava.litemall.core.express.dao.ExpressInfo;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.domain.LitemallOrder;
import org.linlinjava.litemall.db.service.LitemallOrderService;
import org.linlinjava.litemall.wx.annotation.LoginUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.validation.constraints.NotNull;

@RestController
@RequestMapping("/wx/express")
public class WxExpressController {

    @Autowired
    private LitemallOrderService orderService;
    @Autowired
    private ExpressService expressService;

    /**
     * 物流查询
     * 通过订单ID查询物流轨迹
     */
    @GetMapping("query")
    public Object query(@LoginUser Integer userId, @NotNull Integer orderId) {
        if (userId == null) {
            return ResponseUtil.unlogin();
        }

        LitemallOrder order = orderService.findById(orderId);
        if (order == null || !order.getUserId().equals(userId)) {
            return ResponseUtil.badArgumentValue();
        }

        // 未发货的订单没有物流信息
        if (order.getShipChannel() == null || order.getShipSn() == null) {
            return ResponseUtil.fail(700, "订单尚未发货");
        }

        ExpressInfo expressInfo = expressService.getExpressInfo(order.getShipChannel(), order.getShipSn());
        if (expressInfo == null) {
            return ResponseUtil.fail(701, "物流信息查询失败，请稍后重试");
        }

        return ResponseUtil.ok(expressInfo);
    }
}
```

- [ ] **Step 2: 验证**

```bash
# 用一个已登录用户的 token 测试（替换 TOKEN 和 ORDER_ID）
curl -H "X-Litemall-Token: TOKEN" \
  "http://127.0.0.1:8088/wx/express/query?orderId=ORDER_ID"
```

如果 ExpressService 未配置（`properties.isEnable() == false`），将返回 `{"errno":701,"errmsg":"物流信息查询失败"}`。需在 `application.properties` 中配置快递鸟的 AppId 和 AppKey。

- [ ] **Step 3: 提交**

```bash
git add clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/web/WxExpressController.java
git commit -m "feat(api): 新增 GET /wx/express/query 物流查询接口"
```

---

### Task 6: 提取 util.uploadFile 统一图片上传

**Files:**
- Modify: `clothing-mall-wx/utils/util.js:89-94`

- [ ] **Step 1: 在 util.js 中新增 uploadFile 函数**

在 `util.js` 的 `module.exports` 之前添加 `uploadFile` 函数，并在 exports 中导出：

```javascript
/**
 * 封装微信图片上传
 * 返回 Promise，resolve(data.data.url) 成功时返回文件 URL
 */
function uploadFile(filePath) {
  return new Promise(function(resolve, reject) {
    wx.uploadFile({
      url: api.StorageUpload,
      filePath: filePath,
      name: 'file',
      header: {
        'X-Litemall-Token': wx.getStorageSync('token')
      },
      success: function(res) {
        try {
          var data = JSON.parse(res.data);
          if (data.errno === 0) {
            resolve(data.data.url);
          } else {
            wx.showToast({ title: '上传失败', icon: 'none' });
            reject(data);
          }
        } catch (e) {
          wx.showToast({ title: '上传失败', icon: 'none' });
          reject(e);
        }
      },
      fail: function(err) {
        wx.showToast({ title: '上传失败', icon: 'none' });
        reject(err);
      }
    });
  });
}
```

修改 `module.exports`：

```javascript
module.exports = {
  formatTime,
  request,
  uploadFile,
  redirect,
  showErrorToast
}
```

- [ ] **Step 2: 验证**

确认微信开发者工具编译通过，无语法错误。

- [ ] **Step 3: 提交**

```bash
git add clothing-mall-wx/utils/util.js
git commit -m "refactor(wx): 提取 util.uploadFile 统一图片上传封装"
```

---

### Task 7: 4 个页面上传方法改用 util.uploadFile

**Files:**
- Modify: `clothing-mall-wx/pages/manager/tabShelf/tabShelf.js:381-406`
- Modify: `clothing-mall-wx/pages/manager/goodsEdit/goodsEdit.js:101-121`
- Modify: `clothing-mall-wx/pages/ucenter/feedback/feedback.js:38-66`
- Modify: `clothing-mall-wx/pages/ucenter/aftersale/aftersale.js:56-82`

- [ ] **Step 1: 改造 tabShelf.js**

删除 `uploadImage` 方法（第 381-406 行），替换为：

```javascript
uploadImage(filePath, callback) {
    util.uploadFile(filePath).then(function(url) {
      callback(url);
    }).catch(function() {
      callback(null);
    });
  },
```

- [ ] **Step 2: 改造 goodsEdit.js**

删除 `uploadImage` 方法（第 101-121 行），替换为：

```javascript
uploadImage(filePath, callback) {
    util.uploadFile(filePath).then(function(url) {
      callback(url);
    }).catch(function() {
      callback(null);
    });
  },
```

- [ ] **Step 3: 改造 feedback.js**

将 `upload` 方法（第 38-66 行）替换为：

```javascript
upload: function(res) {
    var that = this;
    util.uploadFile(res.tempFilePaths[0]).then(function(url) {
      that.data.picUrls.push(url);
      that.setData({
        hasPicture: true,
        picUrls: that.data.picUrls
      });
    });
  },
```

- [ ] **Step 4: 改造 aftersale.js**

将 `afterRead` 方法中（第 56-82 行）的 `wx.uploadFile` 替换为：

```javascript
afterRead(event) {
    const { file } = event.detail;
    let that = this;
    util.uploadFile(file.path).then(function(url) {
      that.data.aftersale.pictures.push(url);
      const { fileList = [] } = that.data;
      fileList.push({ ...file, url: url });
      that.setData({
        fileList: fileList
      });
    });
  },
```

- [ ] **Step 5: 验证**

在微信开发者工具中测试以下场景：
1. 管理端商品上架 — 上传主图和相册图
2. 商品编辑 — 上传图片
3. 意见反馈 — 上传图片
4. 申请售后 — 上传图片

- [ ] **Step 6: 提交**

```bash
git add clothing-mall-wx/pages/manager/tabShelf/tabShelf.js \
        clothing-mall-wx/pages/manager/goodsEdit/goodsEdit.js \
        clothing-mall-wx/pages/ucenter/feedback/feedback.js \
        clothing-mall-wx/pages/ucenter/aftersale/aftersale.js
git commit -m "refactor(wx): 4 个页面改用 util.uploadFile，消除重复上传代码"
```

---

### Task 8: api.js 补充后端已有但前端未定义的 API

**Files:**
- Modify: `clothing-mall-wx/config/api.js`

- [ ] **Step 1: 在 api.js 中补充以下端点**

在 `FlashSaleGoods` 行之后添加限时特卖列表和详情：

```javascript
  FlashSaleList: WxApiRoot + 'flashSale/list', // 限时特卖列表
  FlashSaleDetail: WxApiRoot + 'flashSale/detail', // 限时特卖详情
```

在 `SceneGoods` 行之后添加满减活动：

```javascript
  FullReductionList: WxApiRoot + 'fullReduction/list', // 满减活动列表
```

在 `ClothingStoreDetail` 行之后添加最近门店和会员等级：

```javascript
  ClothingStoreNearest: WxApiRoot + 'clothing/store/nearest', // 最近门店
  ClothingUserLevels: WxApiRoot + 'clothing/user/levels', // 会员等级列表
```

在 `ClothingSkuCheckStock` 行之后添加 SKU 扩展查询：

```javascript
  ClothingSkuSizes: WxApiRoot + 'clothing/sku/sizes', // 指定颜色下的尺码列表
  ClothingSkuQuery: WxApiRoot + 'clothing/sku/query', // 按商品+颜色+尺码查 SKU
```

- [ ] **Step 2: 提交**

```bash
git add clothing-mall-wx/config/api.js
git commit -m "fix(wx): api.js 补充 flashSale/fullReduction/storeNearest/userLevels/sku 扩展端点"
```

---

## 第 3 批：增量功能（后续迭代，本次不实施）

以下任务留待后续迭代，本次计划不包含具体实施步骤：

- **Task 9: 订单评价系统** — 需新建 `litemall_comment` 表 + 后端评价接口 + 前端评价页面
- **Task 10: addressAdd 页面切换到服务端区域数据** — 当前使用本地静态 `area.js`，可改为调用 `/wx/region/list`

---

## 自审清单

### Spec 覆盖度
| Spec 要求 | 对应 Task |
|-----------|-----------|
| services/index.js 修复 | Task 1 |
| 认证页请求统一 | Task 2 |
| 后端 region/list | Task 3 |
| api.js 本地开发配置 | Task 4 Step 1 |
| api.js 清理无效端点 | Task 4 Step 2 |
| api.js 补充缺失端点 | Task 4 Step 3, Task 8 |
| 后端 express/query | Task 5 |
| util.uploadFile 封装 | Task 6 |
| 4 个页面上传统一 | Task 7 |
| 订单评价（P2） | Task 9（后续迭代） |

### 占位符扫描
无 TBD、TODO、未完成的代码块。所有代码均为完整实现。

### 类型一致性
- `ExpressService.getExpressInfo(shipChannel, shipSn)` — 与 `WxInternalController` 中的调用签名一致
- `LitemallRegionService.queryByPid(pid)` — 后端已有方法，参数类型 `Integer`，与 Controller 的 `@RequestParam Integer pid` 一致
- `ResponseUtil.ok(data)` / `ResponseUtil.fail(errno, errmsg)` — 与项目统一响应格式一致
