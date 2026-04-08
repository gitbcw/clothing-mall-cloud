# 手机端拍照创建商品 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 手机端拍照后创建商品草稿（而非独立 SKU），商品可附带 SKU 列表

**Architecture:** 在 `WxManagerGoodsController` 新增 `create` 接口，接收商品基本信息 + 可选 SKU 列表。前端 `confirmUpload` 页面改为调用该接口，支持快速添加 SKU。同时修复 `WxManagerGoodsController.unpublishAll` 下架状态错误的 bug。

**Tech Stack:** Spring Boot (后端)、微信小程序原生 (前端)、MyBatis (ORM)

**Spec:** `docs/superpowers/specs/2026-03-27-phone-camera-create-goods-design.md`

---

### File Structure

| 文件 | 职责 | 操作 |
|------|------|------|
| `clothing-mall-wx-api/.../WxManagerGoodsController.java` | 小程序管理端商品 API | 修改：新增 create 接口，修复 unpublishAll |
| `clothing-mall-wx/config/api.js` | 前端 API 地址定义 | 修改：新增 ManagerGoodsCreate |
| `clothing-mall-wx/pages/manager/confirmUpload/confirmUpload.js` | 确认上传页面逻辑 | 修改：提交逻辑改为创建商品 |
| `clothing-mall-wx/pages/manager/confirmUpload/confirmUpload.wxml` | 确认上传页面模板 | 修改：新增 SKU 快速添加区域 |
| `clothing-mall-wx/pages/manager/confirmUpload/confirmUpload.wxss` | 确认上传页面样式 | 修改：SKU 区域样式 |

---

### Task 1: 修复 WxManagerGoodsController.unpublishAll 下架状态错误

**Files:**
- Modify: `clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/web/WxManagerGoodsController.java:61`

- [ ] **Step 1: 修复 unpublishAll 状态**

将 `WxManagerGoodsController.java` 第 61 行：
```java
goodsService.updateAllStatus(LitemallGoods.STATUS_DRAFT);
```
改为：
```java
goodsService.updateAllStatus(LitemallGoods.STATUS_PENDING);
```

- [ ] **Step 2: 构建验证**

Run: `cd /Users/combo/MyFile/projects/clothing-mall && mvn compile -pl clothing-mall-wx-api -am -q`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/web/WxManagerGoodsController.java
git commit -m "fix(wx-api): 一键下架状态从 draft 改为 pending"
```

---

### Task 2: 后端新增 /wx/manager/goods/create 接口

**Files:**
- Modify: `clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/web/WxManagerGoodsController.java`

- [ ] **Step 1: 在 WxManagerGoodsController 中新增 create 方法**

在类中新增以下依赖注入和方法。新增 import：
```java
import org.linlinjava.litemall.db.domain.ClothingGoodsSku;
import org.linlinjava.litemall.db.service.ClothingGoodsSkuService;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
```

新增依赖注入：
```java
@Autowired
private ClothingGoodsSkuService clothingGoodsSkuService;
```

新增 create 方法：
```java
/**
 * 快速创建商品草稿（手机端拍照录入）
 */
@Transactional
@PostMapping("/create")
public Object create(@LoginUser Integer userId, @RequestBody Map<String, Object> body) {
    Object error = checkManager(userId);
    if (error != null) {
        return error;
    }

    String name = (String) body.get("name");
    if (name == null || name.trim().isEmpty()) {
        return ResponseUtil.badArgument();
    }

    // 创建商品
    LitemallGoods goods = new LitemallGoods();
    goods.setName(name.trim());

    Object categoryIdObj = body.get("categoryId");
    if (categoryIdObj != null) {
        goods.setCategoryId((Integer) categoryIdObj);
    }

    goods.setBrief((String) body.get("brief"));

    // 图片：优先用 picUrl，没有则用 gallery 第一张
    String picUrl = (String) body.get("picUrl");
    String sourceImage = (String) body.get("sourceImage");
    if (picUrl != null && !picUrl.isEmpty()) {
        goods.setPicUrl(picUrl);
    } else if (sourceImage != null && !sourceImage.isEmpty()) {
        goods.setPicUrl(sourceImage);
    }

    goods.setGallery((String[]) body.get("gallery"));
    goods.setStatus(LitemallGoods.STATUS_DRAFT);
    goods.setIsOnSale(false);
    goods.setDeleted(false);
    goodsService.add(goods);

    // 创建附属 SKU（可选）
    List<Map<String, Object>> skus = (List<Map<String, Object>>) body.get("skus");
    if (skus != null && !skus.isEmpty()) {
        BigDecimal minPrice = null;
        for (Map<String, Object> skuMap : skus) {
            ClothingGoodsSku sku = new ClothingGoodsSku();
            sku.setGoodsId(goods.getId());
            sku.setColor((String) skuMap.get("color"));
            sku.setSize((String) skuMap.get("size"));

            Object priceObj = skuMap.get("price");
            if (priceObj != null) {
                BigDecimal price = new BigDecimal(priceObj.toString());
                sku.setPrice(price);
                if (minPrice == null || minPrice.compareTo(price) > 0) {
                    minPrice = price;
                }
            }

            Object stockObj = skuMap.get("stock");
            if (stockObj != null) {
                sku.setStock(((Number) stockObj).intValue());
            }

            sku.setStatus(ClothingGoodsSku.STATUS_ACTIVE);
            sku.setDeleted(false);
            clothingGoodsSkuService.add(sku);
        }

        // 更新商品最低零售价
        if (minPrice != null) {
            goods.setRetailPrice(minPrice);
            goodsService.updateById(goods);
        }
    }

    return ResponseUtil.ok(goods.getId());
}
```

- [ ] **Step 2: 构建验证**

Run: `cd /Users/combo/MyFile/projects/clothing-mall && mvn compile -pl clothing-mall-wx-api -am -q`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/web/WxManagerGoodsController.java
git commit -m "feat(wx-api): 新增小程序管理端快速创建商品接口"
```

---

### Task 3: 前端 API 地址定义

**Files:**
- Modify: `clothing-mall-wx/config/api.js:137`

- [ ] **Step 1: 新增 ManagerGoodsCreate API 地址**

在 `api.js` 的 `ManagerGoodsUnpublishAll` 行后面新增：
```javascript
ManagerGoodsCreate: WxApiRoot + 'manager/goods/create', // 快速创建商品草稿
```

- [ ] **Step 2: Commit**

```bash
git add clothing-mall-wx/config/api.js
git commit -m "feat(wx): 新增 ManagerGoodsCreate API 地址"
```

---

### Task 4: 前端 confirmUpload.js 改为创建商品

**Files:**
- Modify: `clothing-mall-wx/pages/manager/confirmUpload/confirmUpload.js`

- [ ] **Step 1: 替换提交逻辑**

将 `submitSku()` 方法（第 126-164 行）替换为：
```javascript
  // 提交创建商品
  submitGoods() {
    const data = this.data;
    if (!data.recognizeResult.name) {
      wx.showToast({ title: '请输入商品名称', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    const requestData = {
      name: data.recognizeResult.name,
      brief: data.recognizeResult.brief,
      sourceImage: data.imageUrl
    };

    // 如果有 SKU 列表，附带提交
    if (data.skuList && data.skuList.length > 0) {
      requestData.skus = data.skuList.filter(s => s.color || s.size).map(s => ({
        color: s.color || '',
        size: s.size || '',
        price: s.price || 0,
        stock: s.stock || 0
      }));
    }

    util.request(api.ManagerGoodsCreate, requestData, 'POST').then(res => {
      if (res.errno === 0) {
        wx.showToast({ title: '商品创建成功', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({ title: res.errmsg || '创建失败', icon: 'none' });
      }
      this.setData({ submitting: false });
    }).catch(() => {
      wx.showToast({ title: '创建失败', icon: 'none' });
      this.setData({ submitting: false });
    });
  },
```

- [ ] **Step 2: 新增 SKU 管理方法**

在 `saveDraft()` 方法之前，新增以下方法：
```javascript
  // 添加 SKU 行
  addSku() {
    const skuList = this.data.skuList;
    skuList.push({ color: '', size: '', price: '', stock: '' });
    this.setData({ skuList });
  },

  // 删除 SKU 行
  removeSku(e) {
    const index = e.currentTarget.dataset.index;
    const skuList = this.data.skuList;
    skuList.splice(index, 1);
    this.setData({ skuList });
  },

  // SKU 字段输入
  onSkuInput(e) {
    const { index, field } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({
      ['skuList[' + index + '].' + field]: value
    });
  },
```

- [ ] **Step 3: 在 data 中新增 skuList**

在 `data` 对象中，`submitting` 字段之后新增：
```javascript
skuList: []
```

- [ ] **Step 4: Commit**

```bash
git add clothing-mall-wx/pages/manager/confirmUpload/confirmUpload.js
git commit -m "feat(wx): confirmUpload 改为创建商品并支持 SKU 快速添加"
```

---

### Task 5: 前端 confirmUpload.wxml 新增 SKU 区域

**Files:**
- Modify: `clothing-mall-wx/pages/manager/confirmUpload/confirmUpload.wxml`

- [ ] **Step 1: 在表单和底部按钮之间插入 SKU 区域**

将原来的底部按钮区域（第 79-84 行）替换为以下内容：
```xml
  <!-- SKU 快速添加（可选） -->
  <view class="form-section" style="margin-top: 20rpx;">
    <view class="section-header">
      <text class="section-title">规格（可选，可跳过）</text>
      <text class="add-btn" bindtap="addSku">+ 添加</text>
    </view>
    <view class="sku-list" wx:if="{{skuList.length > 0}}">
      <view class="sku-item" wx:for="{{skuList}}" wx:key="index">
        <view class="sku-row">
          <input class="sku-input" placeholder="颜色" value="{{item.color}}" data-index="{{index}}" data-field="color" bindinput="onSkuInput" />
          <input class="sku-input" placeholder="尺码" value="{{item.size}}" data-index="{{index}}" data-field="size" bindinput="onSkuInput" />
          <input class="sku-input sku-small" type="digit" placeholder="价格" value="{{item.price}}" data-index="{{index}}" data-field="price" bindinput="onSkuInput" />
          <input class="sku-input sku-small" type="number" placeholder="库存" value="{{item.stock}}" data-index="{{index}}" data-field="stock" bindinput="onSkuInput" />
          <text class="sku-delete" data-index="{{index}}" bindtap="removeSku">×</text>
        </view>
      </view>
    </view>
    <view class="sku-empty" wx:else>
      <text class="sku-empty-text">不添加规格，后续在管理后台补全</text>
    </view>
  </view>

  <!-- 底部按钮 -->
  <view class="bottom-actions">
    <button class="btn-draft" bindtap="saveDraft">暂存草稿</button>
    <button class="btn-submit" type="primary" bindtap="submitGoods" loading="{{submitting}}" disabled="{{submitting}}">创建商品</button>
  </view>
```

- [ ] **Step 2: Commit**

```bash
git add clothing-mall-wx/pages/manager/confirmUpload/confirmUpload.wxml
git commit -m "feat(wx): confirmUpload 新增 SKU 快速添加区域"
```

---

### Task 6: 前端 confirmUpload.wxss 新增 SKU 样式

**Files:**
- Modify: `clothing-mall-wx/pages/manager/confirmUpload/confirmUpload.wxss`

- [ ] **Step 1: 在文件末尾追加 SKU 相关样式**

```css
/* SKU 区域 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx 0;
  border-bottom: 1rpx solid #eee;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.add-btn {
  color: #667eea;
  font-size: 28rpx;
  padding: 10rpx 20rpx;
}

.sku-list {
  padding: 20rpx 0;
}

.sku-item {
  margin-bottom: 20rpx;
}

.sku-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.sku-input {
  flex: 1;
  height: 64rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  padding: 0 16rpx;
  font-size: 26rpx;
  color: #333;
}

.sku-small {
  flex: 0.8;
}

.sku-delete {
  width: 48rpx;
  height: 48rpx;
  line-height: 48rpx;
  text-align: center;
  color: #999;
  font-size: 36rpx;
  flex-shrink: 0;
}

.sku-empty {
  padding: 20rpx 0;
}

.sku-empty-text {
  font-size: 26rpx;
  color: #999;
}
```

- [ ] **Step 2: Commit**

```bash
git add clothing-mall-wx/pages/manager/confirmUpload/confirmUpload.wxss
git commit -m "style(wx): confirmUpload SKU 区域样式"
```

---

### Task 7: 数据库迁移 — clothing_goods_sku.goods_id 改为必填

**Files:**
- Create: `docker/db/migration/V1.0.17__sku_goods_id_required.sql`

- [ ] **Step 1: 编写迁移脚本**

创建 `docker/db/migration/V1.0.17__sku_goods_id_required.sql`：
```sql
-- clothing_goods_sku.goods_id 改为必填
-- SKU 不再独立存在，必须关联商品

-- 1. 查看无关联的 SKU 数量（记录日志，方便排查）
-- SELECT COUNT(*) AS orphan_sku_count FROM clothing_goods_sku WHERE goods_id IS NULL OR goods_id = 0;

-- 2. 将无关联的 SKU 标记为停用（如果有）
UPDATE clothing_goods_sku
SET status = 'inactive', update_time = NOW()
WHERE (goods_id IS NULL OR goods_id = 0) AND status = 'active';

-- 3. 将 goods_id = 0 的记录置为 NULL，后续 NOT NULL 约束会拦截
-- 注意：执行前应确认无 goods_id = 0 或 NULL 的记录
-- 如果有，需要先在管理后台为它们关联商品

-- 4. 修改字段约束
ALTER TABLE clothing_goods_sku
  MODIFY COLUMN goods_id INT NOT NULL COMMENT '商品ID';
```

- [ ] **Step 2: Commit**

```bash
git add docker/db/migration/V1.0.17__sku_goods_id_required.sql
git commit -m "db: clothing_goods_sku.goods_id 改为 NOT NULL"
```

---

### Task 8: 更新实体类注释

**Files:**
- Modify: `clothing-mall-db/src/main/java/org/linlinjava/litemall/db/domain/ClothingGoodsSku.java:22`

- [ ] **Step 1: 更新 goodsId 字段注释**

将第 22 行：
```java
    private Integer goodsId;          // 商品ID（未关联时为空）
```
改为：
```java
    private Integer goodsId;          // 商品ID（必填，SKU 必须关联商品）
```

- [ ] **Step 2: Commit**

```bash
git add clothing-mall-db/src/main/java/org/linlinjava/litemall/db/domain/ClothingGoodsSku.java
git commit -m "docs(db): 更新 ClothingGoodsSku.goodsId 注释"
```
