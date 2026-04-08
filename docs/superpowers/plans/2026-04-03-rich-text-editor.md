# 小程序商品详情富文本编辑器 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 goodsEdit 页面的纯文本 textarea 替换为微信小程序原生 editor 富文本编辑器，支持排版和图片插入。

**Architecture:** 使用微信小程序内置 `editor` 组件 + 自定义内联工具栏按钮组，替换现有 textarea。editor 输出 HTML，与现有 rich-text 展示端和管理后台 TinyMCE 产出的 HTML 格式一致。

**Tech Stack:** 微信小程序原生 editor 组件、EditorContext API、现有 uploadImage 图片上传

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `clothing-mall-wx/pages/manager/goodsEdit/goodsEdit.wxml` | 修改 | textarea 替换为 editor + 工具栏 |
| `clothing-mall-wx/pages/manager/goodsEdit/goodsEdit.js` | 修改 | 新增 editor 初始化、工具栏操作、图片插入、内容获取 |
| `clothing-mall-wx/pages/manager/goodsEdit/goodsEdit.wxss` | 修改 | 工具栏和编辑区样式 |
| `clothing-mall-wx/pages/manager/goodsEdit/goodsEdit.json` | 无需修改 | editor 是原生组件，无需注册 |

---

### Task 1: 修改 WXML — 替换 textarea 为 editor + 工具栏

**Files:**
- Modify: `clothing-mall-wx/pages/manager/goodsEdit/goodsEdit.wxml:106-113`

- [ ] **Step 1: 替换商品详细介绍区域**

将第 106-113 行的 textarea 整段替换为：

```xml
    <!-- 商品详细介绍 -->
    <view class="section">
      <view class="section-title">商品详细介绍</view>
      <view class="editor-wrap">
        <view class="editor-toolbar">
          <view class="toolbar-btn {{formats.bold ? 'active' : ''}}" bindtap="formatBold">B</view>
          <view class="toolbar-btn italic {{formats.italic ? 'active' : ''}}" bindtap="formatItalic">I</view>
          <view class="toolbar-btn {{formats.header == 1 ? 'active' : ''}}" bindtap="formatHeader" data-level="1">H1</view>
          <view class="toolbar-btn {{formats.header == 2 ? 'active' : ''}}" bindtap="formatHeader" data-level="2">H2</view>
          <view class="toolbar-btn {{formats.list == 'ordered' ? 'active' : ''}}" bindtap="formatList" data-type="ordered">Ord</view>
          <view class="toolbar-btn {{formats.list == 'bullet' ? 'active' : ''}}" bindtap="formatList" data-type="bullet">List</view>
          <view class="toolbar-btn" bindtap="insertImage">Img</view>
          <view class="toolbar-btn" bindtap="undo">Undo</view>
          <view class="toolbar-btn" bindtap="redo">Redo</view>
        </view>
        <editor
          id="editor"
          class="editor-content"
          placeholder="请输入商品详细介绍"
          onStatusChange="onEditorStatusChange"
        />
      </view>
    </view>
```

- [ ] **Step 2: Commit**

```bash
git add clothing-mall-wx/pages/manager/goodsEdit/goodsEdit.wxml
git commit -m "feat: 替换 textarea 为 editor 富文本编辑器布局"
```

---

### Task 2: 修改 JS — 新增 editor 相关逻辑

**Files:**
- Modify: `clothing-mall-wx/pages/manager/goodsEdit/goodsEdit.js`

- [ ] **Step 1: 在 data 中新增 editor 相关字段**

在第 48 行 `hasDraft: false` 之后新增：

```javascript
    // 富文本编辑器
    editorCtx: null,
    formats: {},
```

- [ ] **Step 2: 新增 editor 初始化回调**

在 `onLoad` 方法（第 51 行）的末尾，`}` 之前（第 73 行之前），新增 editor ready 回调：

```javascript
    // editor 组件初始化完成后自动触发
    this._editorReady = new Promise(function(resolve) {
      that._resolveEditorReady = resolve;
    });
```

注意：`that` 需要在 `onLoad` 方法开头定义。将第 52 行改为：

```javascript
  onLoad(options) {
    const that = this;
    const { system } = wx.getDeviceInfo();
```

同时在 `onLoad` 的末尾 `this.setData({ loading: false });` 之后（第 71 行之后），添加：

```javascript
      // editor 就绪后设置已有内容
      this._editorReady.then(function() {
        if (that.data.goods.detail) {
          that.data.editorCtx.setContents({ html: that.data.goods.detail });
        }
      });
```

- [ ] **Step 3: 新增 onEditorReady 方法**

在 `onLoad` 方法之后、`loadScenes` 方法之前（第 74-75 行之间），新增：

```javascript
  onEditorReady() {
    const that = this;
    this.createSelectorQuery()
      .select('#editor')
      .context(function(res) {
        if (res && res.context) {
          that.setData({ editorCtx: res.context });
          if (that._resolveEditorReady) {
            that._resolveEditorReady();
          }
        }
      })
      .exec();
  },
```

- [ ] **Step 4: 新增 onEditorStatusChange 方法**

紧接着 `onEditorReady` 之后新增：

```javascript
  onEditorStatusChange(e) {
    this.setData({ formats: e.detail });
  },
```

- [ ] **Step 5: 新增工具栏操作方法**

紧接着 `onEditorStatusChange` 之后新增：

```javascript
  formatBold() {
    this.data.editorCtx.format('bold');
  },
  formatItalic() {
    this.data.editorCtx.format('italic');
  },
  formatHeader(e) {
    const level = e.currentTarget.dataset.level;
    this.data.editorCtx.format('header', level);
  },
  formatList(e) {
    const type = e.currentTarget.dataset.type;
    this.data.editorCtx.format('list', type);
  },
  undo() {
    this.data.editorCtx.undo();
  },
  redo() {
    this.data.editorCtx.redo();
  },
  insertImage() {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        const tempPath = res.tempFilePaths[0];
        wx.showLoading({ title: '上传中...' });
        that.uploadImage(tempPath, function(url) {
          wx.hideLoading();
          if (url) {
            that.data.editorCtx.insertImage({
              src: url,
              width: '100%'
            });
          } else {
            wx.showToast({ title: '图片上传失败', icon: 'none' });
          }
        });
      }
    });
  },
```

- [ ] **Step 6: 修改 getGoodsDetail — 编辑模式回显富文本**

在第 152 行 `loading: false` 所在的 `setData` 回调完成后，新增 editor 内容设置。在第 153 行 `});` 之后新增：

```javascript
        // 编辑模式：设置富文本内容
        if (goods.detail && that.data.editorCtx) {
          that.data.editorCtx.setContents({ html: goods.detail });
        }
```

- [ ] **Step 7: 修改 collectFormData — 从 editor 获取 HTML**

`collectFormData` 方法（第 491 行）当前直接读 `goods.detail`。需要改为从 editor 异步获取 HTML。

将 `collectFormData` 改为返回 Promise：

```javascript
  collectFormData() {
    const goods = this.data.goods;
    const that = this;
    const data = {
      name: goods.name,
      brief: goods.brief || '',
      detail: goods.detail || '',
      picUrl: goods.picUrl || '',
      gallery: this.data.galleryList,
      counterPrice: goods.counterPrice ? parseFloat(goods.counterPrice) : null,
      retailPrice: goods.retailPrice ? parseFloat(goods.retailPrice) : null,
      specialPrice: goods.specialPrice ? parseFloat(goods.specialPrice) : null,
      categoryId: goods.categoryId || null,
      keywords: goods.keywords || '',
      scenes: this.data.scenes,
      params: this.data.params.filter(function(p) {
        return p.key && p.key.trim();
      }),
      skus: this.data.skuList.filter(function(s) {
        return s.color || s.size;
      }).map(function(s) {
        return {
          id: s.id || undefined,
          color: s.color,
          size: s.size,
          price: s.price ? parseFloat(s.price) : null,
          stock: s.stock ? parseInt(s.stock) : 0
        };
      })
    };
    if (this.data.goodsId) {
      data.id = this.data.goodsId;
    }

    // 从 editor 获取最新 HTML
    if (that.data.editorCtx) {
      return new Promise(function(resolve) {
        that.data.editorCtx.getContents({
          success(res) {
            data.detail = res.html;
            resolve(data);
          },
          fail() {
            resolve(data);
          }
        });
      });
    }
    return Promise.resolve(data);
  },
```

- [ ] **Step 8: 修改 onSaveDraft 和 onPublish — 适配 async collectFormData**

由于 `collectFormData` 现在返回 Promise，`onSaveDraft`（第 526 行）和 `onPublish`（第 549 行）中调用处需要改为 `.then()`。

**onSaveDraft** — 将 `const data = this.collectFormData();` 替换为：

```javascript
    this.collectFormData().then(function(data) {
```

并在方法末尾（原最后的 `});` 之后）补一个 `});` 闭合。

完整 `onSaveDraft`：

```javascript
  onSaveDraft() {
    if (this.data.submitting || !this.validateForm()) return;
    let that = this;
    this.setData({ submitting: true });
    this.collectFormData().then(function(data) {
      const api_url = that.data.goodsId ? api.ManagerGoodsEdit : api.ManagerGoodsCreate;
      util.request(api_url, data, 'POST').then(function(res) {
        if (res.errno === 0) {
          wx.showToast({ title: '保存成功', icon: 'success' });
          if (!that.data.isEdit) {
            that.clearDraft();
          }
          setTimeout(function() { wx.navigateBack(); }, 1000);
        } else {
          that.setData({ submitting: false });
          wx.showToast({ title: res.errmsg || '保存失败', icon: 'none' });
        }
      }).catch(function() {
        that.setData({ submitting: false });
      });
    });
  },
```

**onPublish** — 同理改为：

```javascript
  onPublish() {
    if (this.data.submitting || !this.validateForm()) return;
    let that = this;
    this.setData({ submitting: true });
    this.collectFormData().then(function(data) {
      const saveApi = that.data.goodsId ? api.ManagerGoodsEdit : api.ManagerGoodsCreate;
      util.request(saveApi, data, 'POST').then(function(res) {
        if (res.errno === 0) {
          const goodsId = that.data.goodsId || res.data;
          util.request(api.ManagerGoodsPublish, { id: goodsId }, 'POST').then(function(res2) {
            if (res2.errno === 0) {
              wx.showToast({ title: '上架成功', icon: 'success' });
              if (!that.data.isEdit) {
                that.clearDraft();
              }
              setTimeout(function() { wx.navigateBack(); }, 1000);
            } else {
              that.setData({ submitting: false });
              wx.showToast({ title: '保存成功但上架失败', icon: 'none' });
            }
          });
        } else {
          that.setData({ submitting: false });
          wx.showToast({ title: res.errmsg || '保存失败', icon: 'none' });
        }
      }).catch(function() {
        that.setData({ submitting: false });
      });
    });
  },
```

- [ ] **Step 9: 删除不再需要的 onDetailInput 方法**

删除第 319-322 行的 `onDetailInput` 方法（editor 内容变化不再通过 bindinput 触发）。

- [ ] **Step 10: Commit**

```bash
git add clothing-mall-wx/pages/manager/goodsEdit/goodsEdit.js
git commit -m "feat: editor 富文本编辑器逻辑 — 初始化、工具栏、图片插入、内容获取"
```

---

### Task 3: 修改 WXSS — 工具栏和编辑区样式

**Files:**
- Modify: `clothing-mall-wx/pages/manager/goodsEdit/goodsEdit.wxss:312-323`

- [ ] **Step 1: 替换 detail-textarea 和 char-count 样式**

将第 312-323 行（`/* 商品详细介绍 */` 到 `.char-count` 块结束）替换为：

```css
/* 富文本编辑器 */
.editor-wrap {
  border: 1rpx solid #e8e8e8;
  border-radius: 12rpx;
  overflow: hidden;
}

.editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  padding: 16rpx 20rpx;
  background: #f8f8f8;
  border-bottom: 1rpx solid #e8e8e8;
}

.toolbar-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #333;
  background: #fff;
  border-radius: 8rpx;
  border: 1rpx solid #e0e0e0;
}

.toolbar-btn.italic {
  font-style: italic;
}

.toolbar-btn.active {
  background: #FF8096;
  color: #fff;
  border-color: #FF8096;
}

.editor-content {
  width: 100%;
  min-height: 400rpx;
  padding: 20rpx;
  box-sizing: border-box;
  font-size: 28rpx;
  line-height: 1.6;
}
```

- [ ] **Step 2: Commit**

```bash
git add clothing-mall-wx/pages/manager/goodsEdit/goodsEdit.wxss
git commit -m "feat: 富文本编辑器工具栏和编辑区样式"
```

---

### Task 4: 编辑模式回显兼容处理

**Files:**
- Modify: `clothing-mall-wx/pages/manager/goodsEdit/goodsEdit.js`

- [ ] **Step 1: 确保编辑模式加载时 editor 已就绪再设置内容**

在 `getGoodsDetail` 方法中（Task 2 Step 6 已添加的代码），改为通过 `_editorReady` Promise 确保时序正确：

将 Task 2 Step 6 新增的代码替换为：

```javascript
        // 编辑模式：等待 editor 就绪后设置富文本内容
        that._editorReady.then(function() {
          if (goods.detail) {
            that.data.editorCtx.setContents({ html: goods.detail });
          }
        });
```

- [ ] **Step 2: 处理纯文本回显兼容**

如果 `goods.detail` 不包含 HTML 标签（从小程序旧版 textarea 创建的纯文本），需要将换行符转为 `<br>`。在上述代码中增加判断：

```javascript
        that._editorReady.then(function() {
          if (goods.detail) {
            var html = goods.detail;
            // 纯文本兼容：无 HTML 标签时将换行转 <br>
            if (html.indexOf('<') === -1) {
              html = '<p>' + html.replace(/\n/g, '</p><p>') + '</p>';
            }
            that.data.editorCtx.setContents({ html: html });
          }
        });
```

同样，`onLoad` 中新建模式加载草稿的 `this._editorReady.then(...)` 也做相同处理：

```javascript
      this._editorReady.then(function() {
        if (that.data.goods.detail) {
          var html = that.data.goods.detail;
          if (html.indexOf('<') === -1) {
            html = '<p>' + html.replace(/\n/g, '</p><p>') + '</p>';
          }
          that.data.editorCtx.setContents({ html: html });
        }
      });
```

- [ ] **Step 3: Commit**

```bash
git add clothing-mall-wx/pages/manager/goodsEdit/goodsEdit.js
git commit -m "fix: 编辑模式回显兼容纯文本，确保 editor 就绪后再设置内容"
```

---

## 自检清单

- [x] Spec 覆盖：工具栏按钮、图片上传、数据流、字数限制移除全部有对应 Task
- [x] 无占位符：所有步骤包含完整代码
- [x] 类型一致：editorCtx 在所有引用处保持一致
