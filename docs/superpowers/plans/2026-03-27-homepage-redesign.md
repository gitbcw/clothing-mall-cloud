# 小程序首页重构 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构小程序首页展示逻辑，轮播图改为场景驱动，新增活动位模块，对接穿搭推荐，完善后台管理配置。

**Architecture:** 后端在现有 Spring Boot + MyBatis 架构上扩展，新增商品-场景关联和活动位置顶两张表。管理后台增强场景管理和穿搭推荐页面。小程序首页切换数据源并新增模块。

**Tech Stack:** Spring Boot 2.1.5, MyBatis, Vue 2 + Element UI, 微信小程序原生框架

---

## 文件结构映射

### 新建文件

| 文件 | 职责 |
|------|------|
| `docker/db/migration/V1.0.17__scene_poster_url.sql` | 场景表新增海报图字段 |
| `docker/db/migration/V1.0.18__activity_top_and_special_price.sql` | 活动位置顶表 + 商品特价字段 |
| `clothing-mall-db/.../domain/ClothingGoodsScene.java` | 商品-场景关联实体 |
| `clothing-mall-db/.../dao/ClothingGoodsSceneMapper.java` | 商品-场景关联 Mapper 接口 |
| `clothing-mall-db/.../dao/ClothingGoodsSceneMapper.xml` | 商品-场景关联 SQL |
| `clothing-mall-db/.../service/ClothingGoodsSceneService.java` | 商品-场景关联 Service |
| `clothing-mall-db/.../domain/ClothingActivityTop.java` | 活动位置顶实体 |
| `clothing-mall-db/.../dao/ClothingActivityTopMapper.java` | 活动位置顶 Mapper 接口 |
| `clothing-mall-db/.../dao/ClothingActivityTopMapper.xml` | 活动位置顶 SQL |
| `clothing-mall-db/.../service/ClothingActivityTopService.java` | 活动位置顶 Service |
| `clothing-mall-admin-api/.../web/AdminActivityTopController.java` | 活动位置顶管理 API |
| `clothing-mall-wx-api/.../web/WxSceneController.java` | 小程序场景 API |
| `clothing-mall-admin/src/api/activityTop.js` | 管理后台活动位置顶 API |
| `clothing-mall-wx/pages/scene/scene.js` | 场景商品列表页逻辑 |
| `clothing-mall-wx/pages/scene/scene.wxml` | 场景商品列表页模板 |
| `clothing-mall-wx/pages/scene/scene.wxss` | 场景商品列表页样式 |
| `clothing-mall-wx/pages/scene/scene.json` | 场景商品列表页配置 |

### 修改文件

| 文件 | 变更内容 |
|------|----------|
| `clothing-mall-db/.../domain/ClothingScene.java` | 新增 posterUrl 字段 |
| `clothing-mall-db/.../dao/ClothingSceneMapper.java` | 新增 selectBannerScenes 方法 |
| `clothing-mall-db/.../dao/ClothingSceneMapper.xml` | 新增 poster_url 列 + selectBannerScenes SQL |
| `clothing-mall-db/.../service/ClothingSceneService.java` | 新增 queryBannerScenes 方法 |
| `clothing-mall-db/.../domain/LitemallGoods.java` | 新增 isSpecialPrice 字段 |
| `clothing-mall-db/.../domain/LitemallGoodsExample.java` | 新增 isSpecialPrice 条件 |
| `clothing-mall-db/.../dao/LitemallGoodsMapper.xml` | Base_Column_List 新增 is_special_price |
| `clothing-mall-db/.../service/LitemallGoodsService.java` | 新增 queryBySpecialPrice, queryByWeeklyNew 方法 |
| `clothing-mall-admin-api/.../web/AdminClothingSceneController.java` | 新增商品关联 CRUD 端点 |
| `clothing-mall-wx-api/.../web/WxHomeController.java` | 重写 buildHomeActivity，新增场景轮播图数据 |
| `clothing-mall-admin/src/api/scene.js` | 新增商品关联 API 方法 |
| `clothing-mall-admin/src/views/goods/scene.vue` | 新增海报图上传 + 商品关联功能 |
| `clothing-mall-admin/src/views/goods/list.vue` | 新增特价列 |
| `clothing-mall-admin/src/views/promotion/outfit.vue` | 修复字段映射，对接真实 API |
| `clothing-mall-admin/src/views/promotion/activity.vue` | 重写为活动位置顶管理 |
| `clothing-mall-admin/src/router/index.js` | 隐藏广告路由，取消隐藏穿搭路由 |
| `clothing-mall-wx/config/api.js` | 新增 SceneBanners, SceneGoods API |
| `clothing-mall-wx/pages/index/index.js` | 轮播图改用场景 API，接入活动位和穿搭推荐 |
| `clothing-mall-wx/pages/index/index.wxml` | 轮播图绑定跳转，新增活动位，替换搭配推荐 |
| `clothing-mall-wx/pages/index/index.wxss` | 新增活动位样式 |
| `clothing-mall-wx/app.json` | 注册场景商品页路由 |

---

## Task 1: 数据库迁移

**Files:**
- Create: `docker/db/migration/V1.0.17__scene_poster_url.sql`
- Create: `docker/db/migration/V1.0.18__activity_top_and_special_price.sql`

- [ ] **Step 1: 创建场景表海报图迁移**

```sql
-- docker/db/migration/V1.0.17__scene_poster_url.sql
ALTER TABLE clothing_scene ADD COLUMN poster_url VARCHAR(255) DEFAULT NULL COMMENT '场景海报图' AFTER icon;
```

- [ ] **Step 2: 创建活动位迁移**

```sql
-- docker/db/migration/V1.0.18__activity_top_and_special_price.sql

-- 商品表新增特价标记
ALTER TABLE litemall_goods ADD COLUMN is_special_price BIT(1) DEFAULT 0 COMMENT '是否特价' AFTER is_hot;

-- 活动位置顶商品表
CREATE TABLE IF NOT EXISTS clothing_activity_top (
    id INT(11) NOT NULL AUTO_INCREMENT,
    goods_id INT(11) NOT NULL COMMENT '商品ID',
    sort_order INT(11) DEFAULT 0 COMMENT '排序（越小越靠前）',
    add_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_goods_id (goods_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='活动位置顶商品';
```

- [ ] **Step 3: 执行迁移验证**

Run: `mysql -u root -proot123456 clothing_mall < docker/db/migration/V1.0.17__scene_poster_url.sql && mysql -u root -proot123456 clothing_mall < docker/db/migration/V1.0.18__activity_top_and_special_price.sql`
Expected: 无报错

- [ ] **Step 4: Commit**

```bash
git add docker/db/migration/
git commit -m "db: 场景海报图字段 + 活动位置顶表 + 商品特价标记"
```

---

## Task 2: 商品-场景关联 Java 层

**Files:**
- Create: `clothing-mall-db/src/main/java/org/linlinjava/litemall/db/domain/ClothingGoodsScene.java`
- Create: `clothing-mall-db/src/main/java/org/linlinjava/litemall/db/dao/ClothingGoodsSceneMapper.java`
- Create: `clothing-mall-db/src/main/resources/org/linlinjava/litemall/db/dao/ClothingGoodsSceneMapper.xml`
- Create: `clothing-mall-db/src/main/java/org/linlinjava/litemall/db/service/ClothingGoodsSceneService.java`

- [ ] **Step 1: 创建 ClothingGoodsScene 实体类**

```java
// clothing-mall-db/src/main/java/org/linlinjava/litemall/db/domain/ClothingGoodsScene.java
package org.linlinjava.litemall.db.domain;

import java.time.LocalDateTime;

public class ClothingGoodsScene {
    private Integer id;
    private Integer goodsId;
    private Integer sceneId;
    private LocalDateTime addTime;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getGoodsId() { return goodsId; }
    public void setGoodsId(Integer goodsId) { this.goodsId = goodsId; }
    public Integer getSceneId() { return sceneId; }
    public void setSceneId(Integer sceneId) { this.sceneId = sceneId; }
    public LocalDateTime getAddTime() { return addTime; }
    public void setAddTime(LocalDateTime addTime) { this.addTime = addTime; }
}
```

- [ ] **Step 2: 创建 Mapper 接口**

```java
// clothing-mall-db/src/main/java/org/linlinjava/litemall/db/dao/ClothingGoodsSceneMapper.java
package org.linlinjava.litemall.db.dao;

import org.apache.ibatis.annotations.Param;
import org.linlinjava.litemall.db.domain.ClothingGoodsScene;
import java.util.List;

public interface ClothingGoodsSceneMapper {
    int insert(ClothingGoodsScene record);
    int deleteBySceneIdAndGoodsId(@Param("sceneId") Integer sceneId, @Param("goodsId") Integer goodsId);
    int deleteBySceneId(@Param("sceneId") Integer sceneId);
    List<ClothingGoodsScene> selectBySceneId(@Param("sceneId") Integer sceneId);
    List<Integer> selectGoodsIdsBySceneId(@Param("sceneId") Integer sceneId);
    int batchInsert(@Param("list") List<ClothingGoodsScene> list);
}
```

- [ ] **Step 3: 创建 Mapper XML**

```xml
<!-- clothing-mall-db/src/main/resources/org/linlinjava/litemall/db/dao/ClothingGoodsSceneMapper.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="org.linlinjava.litemall.db.dao.ClothingGoodsSceneMapper">

    <insert id="insert" parameterType="org.linlinjava.litemall.db.domain.ClothingGoodsScene" useGeneratedKeys="true" keyProperty="id">
        INSERT INTO clothing_goods_scene (goods_id, scene_id, add_time)
        VALUES (#{goodsId}, #{sceneId}, NOW())
    </insert>

    <insert id="batchInsert">
        INSERT INTO clothing_goods_scene (goods_id, scene_id, add_time) VALUES
        <foreach collection="list" item="item" separator=",">
            (#{item.goodsId}, #{item.sceneId}, NOW())
        </foreach>
    </insert>

    <delete id="deleteBySceneIdAndGoodsId">
        DELETE FROM clothing_goods_scene WHERE scene_id = #{sceneId} AND goods_id = #{goodsId}
    </delete>

    <delete id="deleteBySceneId">
        DELETE FROM clothing_goods_scene WHERE scene_id = #{sceneId}
    </delete>

    <select id="selectBySceneId" resultType="org.linlinjava.litemall.db.domain.ClothingGoodsScene">
        SELECT id, goods_id, scene_id, add_time FROM clothing_goods_scene WHERE scene_id = #{sceneId}
    </select>

    <select id="selectGoodsIdsBySceneId" resultType="java.lang.Integer">
        SELECT goods_id FROM clothing_goods_scene WHERE scene_id = #{sceneId}
    </select>

</mapper>
```

- [ ] **Step 4: 创建 Service**

```java
// clothing-mall-db/src/main/java/org/linlinjava/litemall/db/service/ClothingGoodsSceneService.java
package org.linlinjava.litemall.db.service;

import org.linlinjava.litemall.db.dao.ClothingGoodsSceneMapper;
import org.linlinjava.litemall.db.domain.ClothingGoodsScene;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.util.List;

@Service
public class ClothingGoodsSceneService {

    @Resource
    private ClothingGoodsSceneMapper goodsSceneMapper;

    public List<ClothingGoodsScene> queryBySceneId(Integer sceneId) {
        return goodsSceneMapper.selectBySceneId(sceneId);
    }

    public List<Integer> queryGoodsIdsBySceneId(Integer sceneId) {
        return goodsSceneMapper.selectGoodsIdsBySceneId(sceneId);
    }

    @Transactional
    public void updateSceneGoods(Integer sceneId, List<Integer> goodsIds) {
        goodsSceneMapper.deleteBySceneId(sceneId);
        if (goodsIds != null && !goodsIds.isEmpty()) {
            List<ClothingGoodsScene> list = new java.util.ArrayList<>();
            for (Integer goodsId : goodsIds) {
                ClothingGoodsScene record = new ClothingGoodsScene();
                record.setSceneId(sceneId);
                record.setGoodsId(goodsId);
                list.add(record);
            }
            goodsSceneMapper.batchInsert(list);
        }
    }

    @Transactional
    public void addGoodsToScene(Integer sceneId, List<Integer> goodsIds) {
        if (goodsIds != null && !goodsIds.isEmpty()) {
            List<ClothingGoodsScene> list = new java.util.ArrayList<>();
            for (Integer goodsId : goodsIds) {
                ClothingGoodsScene record = new ClothingGoodsScene();
                record.setSceneId(sceneId);
                record.setGoodsId(goodsId);
                list.add(record);
            }
            goodsSceneMapper.batchInsert(list);
        }
    }

    public void removeGoodsFromScene(Integer sceneId, Integer goodsId) {
        goodsSceneMapper.deleteBySceneIdAndGoodsId(sceneId, goodsId);
    }
}
```

- [ ] **Step 5: 编译验证**

Run: `cd /Users/combo/MyFile/projects/clothing-mall && mvn compile -pl clothing-mall-db -q`
Expected: BUILD SUCCESS

- [ ] **Step 6: Commit**

```bash
git add clothing-mall-db/src/main/java/org/linlinjava/litemall/db/domain/ClothingGoodsScene.java \
        clothing-mall-db/src/main/java/org/linlinjava/litemall/db/dao/ClothingGoodsSceneMapper.java \
        clothing-mall-db/src/main/resources/org/linlinjava/litemall/db/dao/ClothingGoodsSceneMapper.xml \
        clothing-mall-db/src/main/java/org/linlinjava/litemall/db/service/ClothingGoodsSceneService.java
git commit -m "feat(db): 商品-场景关联表 Java 层实现"
```

---

## Task 3: 场景管理增强（posterUrl 字段 + 后端）

**Files:**
- Modify: `clothing-mall-db/src/main/java/org/linlinjava/litemall/db/domain/ClothingScene.java`
- Modify: `clothing-mall-db/src/main/java/org/linlinjava/litemall/db/dao/ClothingSceneMapper.java`
- Modify: `clothing-mall-db/src/main/resources/org/linlinjava/litemall/db/dao/ClothingSceneMapper.xml`
- Modify: `clothing-mall-db/src/main/java/org/linlinjava/litemall/db/service/ClothingSceneService.java`

- [ ] **Step 1: ClothingScene.java 新增 posterUrl 字段**

在 `icon` 字段后面新增：

```java
private String posterUrl;

public String getPosterUrl() { return posterUrl; }
public void setPosterUrl(String posterUrl) { this.posterUrl = posterUrl; }
```

- [ ] **Step 2: ClothingSceneMapper.java 新增方法**

```java
List<ClothingScene> selectBannerScenes();
```

- [ ] **Step 3: ClothingSceneMapper.xml 更新**

Base_Column_List 新增 `poster_url`：
```xml
<sql id="Base_Column_List">
    id, name, icon, poster_url, description, sort_order, enabled, add_time, update_time, deleted
</sql>
```

resultMap 新增：
```xml
<result column="poster_url" property="posterUrl"/>
```

insertSelective 和 updateByPrimaryKeySelective 新增 poster_url 条件分支（参照 icon 的写法）。

新增查询：
```xml
<select id="selectBannerScenes" resultMap="BaseResultMap">
    SELECT <include refid="Base_Column_List"/>
    FROM clothing_scene
    WHERE enabled = 1 AND poster_url IS NOT NULL AND poster_url != '' AND deleted = 0
    ORDER BY sort_order ASC, id ASC
</select>
```

- [ ] **Step 4: ClothingSceneService.java 新增方法**

```java
public List<ClothingScene> queryBannerScenes() {
    return sceneMapper.selectBannerScenes();
}
```

- [ ] **Step 5: 编译验证**

Run: `mvn compile -pl clothing-mall-db -q`
Expected: BUILD SUCCESS

- [ ] **Step 6: Commit**

```bash
git add clothing-mall-db/
git commit -m "feat(db): 场景表新增 posterUrl 字段 + 查询海报场景方法"
```

---

## Task 4: 管理后台 - 场景管理页面增强

**Files:**
- Modify: `clothing-mall-admin/src/api/scene.js`
- Modify: `clothing-mall-admin/src/views/goods/scene.vue`
- Modify: `clothing-mall-admin-api/src/main/java/org/linlinjava/litemall/admin/web/AdminClothingSceneController.java`

- [ ] **Step 1: scene.js 新增商品关联 API**

```javascript
// 在 scene.js 末尾新增
export function listSceneGoods(sceneId) {
  return request({
    url: '/clothing/scene/goods',
    method: 'get',
    params: { sceneId }
  })
}

export function updateSceneGoods(data) {
  return request({
    url: '/clothing/scene/goods/update',
    method: 'post',
    data
  })
}
```

- [ ] **Step 2: AdminClothingSceneController.java 新增商品关联端点**

注入 `ClothingGoodsSceneService`，新增两个端点：

```java
@Autowired
private ClothingGoodsSceneService goodsSceneService;

@GetMapping("/goods")
public Object listSceneGoods(@RequestParam Integer sceneId) {
    List<Integer> goodsIds = goodsSceneService.queryGoodsIdsBySceneId(sceneId);
    return ResponseUtil.ok(goodsIds);
}

@PostMapping("/goods/update")
public Object updateSceneGoods(@RequestBody Map<String, Object> body) {
    Integer sceneId = (Integer) body.get("sceneId");
    @SuppressWarnings("unchecked")
    List<Integer> goodsIds = (List<Integer>) body.get("goodsIds");
    goodsSceneService.updateSceneGoods(sceneId, goodsIds);
    return ResponseUtil.ok();
}
```

- [ ] **Step 3: scene.vue 增强**

在表格中「图标」列后面新增「海报图」预览列：

```html
<el-table-column align="center" label="海报图" width="100">
  <template slot-scope="scope">
    <el-image v-if="scope.row.posterUrl" :src="scope.row.posterUrl" style="width: 60px; height: 40px;" fit="cover" :preview-src-list="[scope.row.posterUrl]" />
    <span v-else style="color: #ccc;">-</span>
  </template>
</el-table-column>
```

在操作列新增「关联商品」按钮：

```html
<el-button type="info" size="mini" @click="handleGoods(scope.row)">关联商品</el-button>
```

在表单中「图标」上传后面新增「海报图」上传（参照图标上传的写法，字段名 `posterUrl`）：

```html
<el-form-item label="海报图" prop="posterUrl">
  <el-upload :headers="headers" :action="uploadPath" :show-file-list="false" :on-success="posterUploadSuccess" class="avatar-uploader" accept=".jpg,.jpeg,.png,.gif">
    <img v-if="dataForm.posterUrl" :src="dataForm.posterUrl" class="avatar">
    <i v-else class="el-icon-plus avatar-uploader-icon" />
  </el-upload>
</el-form-item>
```

新增关联商品弹窗对话框（el-dialog），包含：
- 商品搜索（el-input）
- 商品列表（el-table + el-checkbox 多选）
- 分页（pagination）
- 确认按钮调用 `updateSceneGoods`

dataForm 新增 `posterUrl: ''` 字段。

methods 新增：
- `handleGoods(row)` — 打开关联商品弹窗，加载已有关联
- `posterUploadSuccess(response)` — `this.dataForm.posterUrl = response.data.url`
- `loadSceneGoods(sceneId)` — 调用 `listSceneGoods(sceneId)` 加载关联商品 ID
- `confirmSceneGoods()` — 调用 `updateSceneGoods({sceneId, goodsIds})`

- [ ] **Step 4: 编译验证**

Run: `mvn compile -pl clothing-mall-admin-api -q`
Expected: BUILD SUCCESS

- [ ] **Step 5: Commit**

```bash
git add clothing-mall-admin/src/api/scene.js \
        clothing-mall-admin/src/views/goods/scene.vue \
        clothing-mall-admin-api/
git commit -m "feat(admin): 场景管理新增海报图上传 + 商品关联功能"
```

---

## Task 5: 小程序 - 场景轮播图 + 场景商品页

**Files:**
- Create: `clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/web/WxSceneController.java`
- Create: `clothing-mall-wx/pages/scene/scene.js`
- Create: `clothing-mall-wx/pages/scene/scene.wxml`
- Create: `clothing-mall-wx/pages/scene/scene.wxss`
- Create: `clothing-mall-wx/pages/scene/scene.json`
- Modify: `clothing-mall-wx/config/api.js`
- Modify: `clothing-mall-wx/pages/index/index.js`
- Modify: `clothing-mall-wx/pages/index/index.wxml`
- Modify: `clothing-mall-wx/app.json`

- [ ] **Step 1: api.js 新增场景 API**

在 `config/api.js` 的 `StorageUpload` 后面新增：

```javascript
SceneBanners: WxApiRoot + 'scene/banners',
SceneGoods: WxApiRoot + 'scene/goods',
```

- [ ] **Step 2: 创建 WxSceneController.java**

```java
package org.linlinjava.litemall.wx.web;

import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.domain.ClothingGoodsScene;
import org.linlinjava.litemall.db.domain.ClothingScene;
import org.linlinjava.litemall.db.service.*;
import com.github.pagehelper.PageHelper;
import com.github.pagehelper.PageInfo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/wx/scene")
@Validated
public class WxSceneController {

    @Autowired
    private ClothingSceneService sceneService;

    @Autowired
    private ClothingGoodsSceneService goodsSceneService;

    @Autowired
    private LitemallGoodsService goodsService;

    /**
     * 场景轮播图列表（有海报图且启用的场景）
     */
    @GetMapping("/banners")
    public Object banners() {
        List<ClothingScene> scenes = sceneService.queryBannerScenes();
        List<Map<String, Object>> result = new ArrayList<>();
        for (ClothingScene scene : scenes) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", scene.getId());
            item.put("name", scene.getName());
            item.put("posterUrl", scene.getPosterUrl());
            item.put("description", scene.getDescription());
            result.add(item);
        }
        return ResponseUtil.ok(result);
    }

    /**
     * 场景下的商品列表
     */
    @GetMapping("/goods")
    public Object goods(@RequestParam Integer sceneId,
                        @RequestParam(defaultValue = "1") Integer page,
                        @RequestParam(defaultValue = "10") Integer limit) {
        List<Integer> goodsIds = goodsSceneService.queryGoodsIdsBySceneId(sceneId);
        if (goodsIds == null || goodsIds.isEmpty()) {
            Map<String, Object> data = new HashMap<>();
            data.put("total", 0);
            data.put("pages", 0);
            data.put("list", Collections.emptyList());
            return ResponseUtil.ok(data);
        }

        PageHelper.startPage(page, limit);
        List<org.linlinjava.litemall.db.domain.LitemallGoods> allGoods = goodsService.queryByIds(goodsIds);
        PageInfo<org.linlinjava.litemall.db.domain.LitemallGoods> pageInfo = new PageInfo<>(allGoods);

        Map<String, Object> data = new HashMap<>();
        data.put("total", pageInfo.getTotal());
        data.put("pages", pageInfo.getPages());
        data.put("list", pageInfo.getList());
        return ResponseUtil.ok(data);
    }
}
```

注意：需要在 `LitemallGoodsService` 中新增 `queryByIds(List<Integer> ids)` 方法：

```java
// LitemallGoodsService.java 新增
public List<LitemallGoods> queryByIds(List<Integer> ids) {
    if (ids == null || ids.isEmpty()) {
        return new ArrayList<>();
    }
    LitemallGoodsExample example = new LitemallGoodsExample();
    example.or().andIdIn(ids).andStatusEqualTo(STATUS_PUBLISHED).andDeletedEqualTo(false);
    example.setOrderByClause("add_time desc");
    return goodsMapper.selectByExampleSelective(example, columns);
}
```

- [ ] **Step 3: app.json 注册场景商品页**

在 pages 数组中 `pages/category/category` 后面新增：

```json
"pages/scene/scene"
```

- [ ] **Step 4: 创建场景商品页**

`scene.json`:
```json
{
  "usingComponents": {},
  "navigationStyle": "custom"
}
```

`scene.js`: 参照 `category/category.js` 的结构，但数据来源改为 `api.SceneGoods`，参数为 `sceneId`（从 options 获取）。使用瀑布流两列布局展示商品列表，支持 `onReachBottom` 分页加载。顶部展示场景名称和描述。

`scene.wxml`: 参照 `category/category.wxml` 结构：
- 自定义导航栏（返回按钮 + 场景名称标题）
- 商品瀑布流两列布局
- 底部占位

`scene.wxss`: 参照 `category/category.wxss` 的瀑布流样式。

- [ ] **Step 5: 修改首页轮播图数据源**

`index.js` — `loadData()` 方法中，在调用 `api.IndexUrl` 的回调之外，新增一个独立请求：

```javascript
loadSceneBanners() {
  util.request(api.SceneBanners).then(res => {
    this.setData({ banners: res.data.data || [] })
  }).catch(() => {
    this.setData({ banners: [] })
  })
}
```

在 `onLoad()` 和 `onPullDownRefresh()` 中调用 `this.loadSceneBanners()`。

从 `loadData()` 的回调中移除 `banners` 赋值。

- [ ] **Step 6: 修改首页轮播图模板**

`index.wxml` — 轮播图 `swiper-item` 修改为：

```xml
<swiper-item wx:for="{{banners}}" wx:key="id" bindtap="goToScene" data-scene-id="{{item.id}}">
  <image src="{{item.posterUrl}}" mode="aspectFill" class="banner-image" binderror="onHomeImageError" data-source="banner" data-index="{{index}}" />
</swiper-item>
```

`index.js` — 新增 `goToScene` 方法：

```javascript
goToScene(e) {
  const sceneId = e.currentTarget.dataset.sceneId
  wx.navigateTo({ url: `/pages/scene/scene?id=${sceneId}` })
}
```

- [ ] **Step 7: 编译验证**

Run: `mvn compile -pl clothing-mall-wx-api -q`
Expected: BUILD SUCCESS

- [ ] **Step 8: Commit**

```bash
git add clothing-mall-wx-api/ clothing-mall-wx/
git commit -m "feat(wx): 首页轮播图改为场景驱动 + 新建场景商品页"
```

---

## Task 6: 活动位置顶 Java 层

**Files:**
- Create: `clothing-mall-db/.../domain/ClothingActivityTop.java`
- Create: `clothing-mall-db/.../dao/ClothingActivityTopMapper.java`
- Create: `clothing-mall-db/.../dao/ClothingActivityTopMapper.xml`
- Create: `clothing-mall-db/.../service/ClothingActivityTopService.java`

- [ ] **Step 1: 创建实体类**

```java
// ClothingActivityTop.java
package org.linlinjava.litemall.db.domain;

import java.time.LocalDateTime;

public class ClothingActivityTop {
    private Integer id;
    private Integer goodsId;
    private Integer sortOrder;
    private LocalDateTime addTime;
    private LocalDateTime updateTime;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getGoodsId() { return goodsId; }
    public void setGoodsId(Integer goodsId) { this.goodsId = goodsId; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
    public LocalDateTime getAddTime() { return addTime; }
    public void setAddTime(LocalDateTime addTime) { this.addTime = addTime; }
    public LocalDateTime getUpdateTime() { return updateTime; }
    public void setUpdateTime(LocalDateTime updateTime) { this.updateTime = updateTime; }
}
```

- [ ] **Step 2: 创建 Mapper 接口**

```java
// ClothingActivityTopMapper.java
package org.linlinjava.litemall.db.dao;

import org.apache.ibatis.annotations.Param;
import org.linlinjava.litemall.db.domain.ClothingActivityTop;
import java.util.List;

public interface ClothingActivityTopMapper {
    int insert(ClothingActivityTop record);
    int deleteByGoodsId(@Param("goodsId") Integer goodsId);
    int deleteByPrimaryKey(@Param("id") Integer id);
    int updateSortOrder(@Param("id") Integer id, @Param("sortOrder") Integer sortOrder);
    ClothingActivityTop selectByGoodsId(@Param("goodsId") Integer goodsId);
    List<ClothingActivityTop> selectAll();
}
```

- [ ] **Step 3: 创建 Mapper XML**

```xml
<!-- ClothingActivityTopMapper.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="org.linlinjava.litemall.db.dao.ClothingActivityTopMapper">

    <insert id="insert" parameterType="org.linlinjava.litemall.db.domain.ClothingActivityTop" useGeneratedKeys="true" keyProperty="id">
        INSERT INTO clothing_activity_top (goods_id, sort_order, add_time, update_time)
        VALUES (#{goodsId}, #{sortOrder}, NOW(), NOW())
    </insert>

    <delete id="deleteByPrimaryKey">
        DELETE FROM clothing_activity_top WHERE id = #{id}
    </delete>

    <delete id="deleteByGoodsId">
        DELETE FROM clothing_activity_top WHERE goods_id = #{goodsId}
    </delete>

    <update id="updateSortOrder">
        UPDATE clothing_activity_top SET sort_order = #{sortOrder}, update_time = NOW() WHERE id = #{id}
    </update>

    <select id="selectByGoodsId" resultType="org.linlinjava.litemall.db.domain.ClothingActivityTop">
        SELECT id, goods_id, sort_order, add_time, update_time FROM clothing_activity_top WHERE goods_id = #{goodsId}
    </select>

    <select id="selectAll" resultType="org.linlinjava.litemall.db.domain.ClothingActivityTop">
        SELECT id, goods_id, sort_order, add_time, update_time FROM clothing_activity_top ORDER BY sort_order ASC, id ASC
    </select>

</mapper>
```

- [ ] **Step 4: 创建 Service**

```java
// ClothingActivityTopService.java
package org.linlinjava.litemall.db.service;

import org.linlinjava.litemall.db.dao.ClothingActivityTopMapper;
import org.linlinjava.litemall.db.domain.ClothingActivityTop;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.List;

@Service
public class ClothingActivityTopService {

    @Resource
    private ClothingActivityTopMapper activityTopMapper;

    public List<ClothingActivityTop> queryAll() {
        return activityTopMapper.selectAll();
    }

    public List<Integer> queryTopGoodsIds() {
        List<ClothingActivityTop> list = activityTopMapper.selectAll();
        java.util.ArrayList<Integer> ids = new java.util.ArrayList<>();
        for (ClothingActivityTop item : list) {
            ids.add(item.getGoodsId());
        }
        return ids;
    }

    public void add(ClothingActivityTop record) {
        activityTopMapper.insert(record);
    }

    public void remove(Integer id) {
        activityTopMapper.deleteByPrimaryKey(id);
    }

    public void removeByGoodsId(Integer goodsId) {
        activityTopMapper.deleteByGoodsId(goodsId);
    }

    public void updateSortOrder(Integer id, Integer sortOrder) {
        activityTopMapper.updateSortOrder(id, sortOrder);
    }
}
```

- [ ] **Step 5: 编译验证**

Run: `mvn compile -pl clothing-mall-db -q`
Expected: BUILD SUCCESS

- [ ] **Step 6: Commit**

```bash
git add clothing-mall-db/
git commit -m "feat(db): 活动位置顶商品表 Java 层实现"
```

---

## Task 7: LitemallGoods 新增 isSpecialPrice + 查询方法

**Files:**
- Modify: `clothing-mall-db/.../domain/LitemallGoods.java`
- Modify: `clothing-mall-db/.../domain/LitemallGoodsExample.java`
- Modify: `clothing-mall-db/.../dao/LitemallGoodsMapper.xml`
- Modify: `clothing-mall-db/.../service/LitemallGoodsService.java`

- [ ] **Step 1: LitemallGoods.java 新增 isSpecialPrice 字段**

在 `isHot` 字段后面新增（参照 isHot 的写法）：

```java
private Boolean isSpecialPrice;

public Boolean getIsSpecialPrice() { return isSpecialPrice; }
public void setIsSpecialPrice(Boolean isSpecialPrice) { this.isSpecialPrice = isSpecialPrice; }
```

- [ ] **Step 2: LitemallGoodsExample.java 新增条件**

在 `andIsHotEqualTo` 附近新增（参照其写法）：

```java
public Criteria andIsSpecialPriceEqualTo(Boolean value) {
    addCriterion("is_special_price =", value, "isSpecialPrice");
    return (Criteria) this;
}
```

同时在 `createCriteria()` 内部类的字段声明区新增 `isSpecialPrice` 相关方法（参照 `isHot` 的 `addCriterion` 写法）。

- [ ] **Step 3: LitemallGoodsMapper.xml Base_Column_List 新增**

在 `is_hot` 后面新增 `is_special_price`。

- [ ] **Step 4: LitemallGoodsService.java 新增查询方法**

在 `queryByHot` 方法后面新增：

```java
public List<LitemallGoods> queryBySpecialPrice(int offset, int limit) {
    LitemallGoodsExample example = new LitemallGoodsExample();
    example.or().andIsSpecialPriceEqualTo(true).andStatusEqualTo(STATUS_PUBLISHED).andDeletedEqualTo(false);
    example.setOrderByClause("add_time desc");
    PageHelper.startPage(offset, limit);
    return goodsMapper.selectByExampleSelective(example, columns);
}

public List<LitemallGoods> queryByWeeklyNew(int offset, int limit) {
    LitemallGoodsExample example = new LitemallGoodsExample();
    example.or().andIsNewEqualTo(true).andStatusEqualTo(STATUS_PUBLISHED).andDeletedEqualTo(false)
            .andAddTimeGreaterThanOrEqualTo(java.time.LocalDateTime.now().minusDays(7));
    example.setOrderByClause("add_time desc");
    PageHelper.startPage(offset, limit);
    return goodsMapper.selectByExampleSelective(example, columns);
}
```

- [ ] **Step 5: 编译验证**

Run: `mvn compile -pl clothing-mall-db -q`
Expected: BUILD SUCCESS

- [ ] **Step 6: Commit**

```bash
git add clothing-mall-db/
git commit -m "feat(db): 商品新增 isSpecialPrice 字段 + 特价/本周上新查询方法"
```

---

## Task 8: 后端活动位 API + 首页聚合

**Files:**
- Create: `clothing-mall-admin-api/.../web/AdminActivityTopController.java`
- Create: `clothing-mall-admin/src/api/activityTop.js`
- Modify: `clothing-mall-wx-api/.../web/WxHomeController.java`

- [ ] **Step 1: 创建 AdminActivityTopController.java**

```java
package org.linlinjava.litemall.admin.web;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.domain.ClothingActivityTop;
import org.linlinjava.litemall.db.domain.LitemallGoods;
import org.linlinjava.litemall.db.service.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/admin/activity/top")
public class AdminActivityTopController {
    private final Log logger = LogFactory.getLog(AdminActivityTopController.class);

    @Autowired
    private ClothingActivityTopService activityTopService;

    @Autowired
    private LitemallGoodsService goodsService;

    @GetMapping("/list")
    public Object list() {
        List<ClothingActivityTop> topList = activityTopService.queryAll();
        List<Map<String, Object>> result = new ArrayList<>();
        for (ClothingActivityTop top : topList) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", top.getId());
            item.put("goodsId", top.getGoodsId());
            item.put("sortOrder", top.getSortOrder());
            LitemallGoods goods = goodsService.findById(top.getGoodsId());
            if (goods != null) {
                item.put("goodsName", goods.getName());
                item.put("picUrl", goods.getPicUrl());
                item.put("retailPrice", goods.getRetailPrice());
            }
            result.add(item);
        }
        return ResponseUtil.ok(result);
    }

    @PostMapping("/add")
    public Object add(@RequestBody Map<String, Object> body) {
        Integer goodsId = (Integer) body.get("goodsId");
        Integer sortOrder = body.get("sortOrder") != null ? ((Number) body.get("sortOrder")).intValue() : 0;

        if (goodsId == null) {
            return ResponseUtil.badArgument();
        }
        ClothingActivityTop existing = activityTopService.queryAll().stream()
                .filter(t -> t.getGoodsId().equals(goodsId))
                .findFirst().orElse(null);
        if (existing != null) {
            return ResponseUtil.fail(402, "该商品已在活动位置顶中");
        }

        ClothingActivityTop record = new ClothingActivityTop();
        record.setGoodsId(goodsId);
        record.setSortOrder(sortOrder);
        activityTopService.add(record);
        return ResponseUtil.ok();
    }

    @PostMapping("/delete")
    public Object delete(@RequestBody Map<String, Object> body) {
        Integer id = (Integer) body.get("id");
        if (id == null) {
            return ResponseUtil.badArgument();
        }
        activityTopService.remove(id);
        return ResponseUtil.ok();
    }

    @PostMapping("/update")
    public Object update(@RequestBody Map<String, Object> body) {
        Integer id = (Integer) body.get("id");
        Integer sortOrder = body.get("sortOrder") != null ? ((Number) body.get("sortOrder")).intValue() : 0;
        if (id == null) {
            return ResponseUtil.badArgument();
        }
        activityTopService.updateSortOrder(id, sortOrder);
        return ResponseUtil.ok();
    }
}
```

注意：需要在 `ClothingActivityTopService` 中补充 `queryByGoodsId` 方法（用于 add 时的重复检查），或者直接在上面的 Controller 中用 `selectAll()` 过滤（如上代码所示）。

- [ ] **Step 2: 创建 activityTop.js**

```javascript
// clothing-mall-admin/src/api/activityTop.js
import request from '@/utils/request'

export function listActivityTop() {
  return request({
    url: '/activity/top/list',
    method: 'get'
  })
}

export function addActivityTop(data) {
  return request({
    url: '/activity/top/add',
    method: 'post',
    data
  })
}

export function deleteActivityTop(data) {
  return request({
    url: '/activity/top/delete',
    method: 'post',
    data
  })
}

export function updateActivityTop(data) {
  return request({
    url: '/activity/top/update',
    method: 'post',
    data
  })
}
```

- [ ] **Step 3: 重写 WxHomeController.buildHomeActivity()**

注入新依赖：

```java
@Autowired
private ClothingActivityTopService activityTopService;

@Autowired
private ClothingGoodsSceneService goodsSceneService;
```

替换整个 `buildHomeActivity` 方法：

```java
private Map<String, Object> buildHomeActivity() {
    List<Map<String, Object>> result = new ArrayList<>();
    Set<Integer> addedIds = new HashSet<>();
    int limit = 8;

    // 1. 手动置顶商品
    List<ClothingActivityTop> topList = activityTopService.queryAll();
    for (ClothingActivityTop top : topList) {
        if (addedIds.contains(top.getGoodsId())) continue;
        LitemallGoods goods = goodsService.findById(top.getGoodsId());
        if (goods != null && LitemallGoods.STATUS_PUBLISHED.equals(goods.getStatus())) {
            result.add(goodsToMap(goods));
            addedIds.add(top.getGoodsId());
        }
    }

    // 2. 节假日场景商品
    List<ClothingScene> allScenes = sceneService.queryAll();
    for (ClothingScene scene : allScenes) {
        if (scene.getName() != null && scene.getName().contains("节假日")) {
            List<Integer> goodsIds = goodsSceneService.queryGoodsIdsBySceneId(scene.getId());
            int count = 0;
            for (Integer goodsId : goodsIds) {
                if (addedIds.contains(goodsId) || count >= limit) continue;
                LitemallGoods goods = goodsService.findById(goodsId);
                if (goods != null && LitemallGoods.STATUS_PUBLISHED.equals(goods.getStatus())) {
                    result.add(goodsToMap(goods));
                    addedIds.add(goodsId);
                    count++;
                }
            }
            break;
        }
    }

    // 3. 特价商品
    List<LitemallGoods> specialGoods = goodsService.queryBySpecialPrice(0, limit);
    int specialCount = 0;
    for (LitemallGoods goods : specialGoods) {
        if (addedIds.contains(goods.getId()) || specialCount >= limit) continue;
        result.add(goodsToMap(goods));
        addedIds.add(goods.getId());
        specialCount++;
    }

    // 4. 本周上新
    List<LitemallGoods> weeklyGoods = goodsService.queryByWeeklyNew(0, limit);
    int weeklyCount = 0;
    for (LitemallGoods goods : weeklyGoods) {
        if (addedIds.contains(goods.getId()) || weeklyCount >= limit) continue;
        result.add(goodsToMap(goods));
        addedIds.add(goods.getId());
        weeklyCount++;
    }

    // 限制总数 20
    if (result.size() > 20) {
        result = result.subList(0, 20);
    }

    if (result.isEmpty()) {
        return null;
    }

    Map<String, Object> activity = new HashMap<>();
    activity.put("goods", result);
    return activity;
}

private Map<String, Object> goodsToMap(LitemallGoods goods) {
    Map<String, Object> map = new HashMap<>();
    map.put("id", goods.getId());
    map.put("name", goods.getName());
    map.put("picUrl", goods.getPicUrl());
    map.put("retailPrice", goods.getRetailPrice());
    map.put("counterPrice", goods.getCounterPrice());
    return map;
}
```

修改 `index()` 方法中调用 `buildHomeActivity` 的部分，不再传入 config 参数：

```java
Map<String, Object> activity = buildHomeActivity();
if (activity != null) {
    entity.put("homeActivity", activity);
}
```

注入 `ClothingSceneService`：

```java
@Autowired
private ClothingSceneService sceneService;
```

- [ ] **Step 4: 编译验证**

Run: `mvn compile -pl clothing-mall-wx-api,clothing-mall-admin-api -q`
Expected: BUILD SUCCESS

- [ ] **Step 5: Commit**

```bash
git add clothing-mall-wx-api/ clothing-mall-admin-api/ clothing-mall-admin/src/api/activityTop.js
git commit -m "feat: 活动位后端 API（管理端置顶 + 小程序端聚合）"
```

---

## Task 9: 管理后台 - 商品列表特价列 + 活动位管理页面

**Files:**
- Modify: `clothing-mall-admin/src/views/goods/list.vue`
- Modify: `clothing-mall-admin/src/views/promotion/activity.vue`
- Modify: `clothing-mall-admin/src/router/index.js`

- [ ] **Step 1: goods/list.vue 新增特价列**

在 `isHot` 列后面新增：

```html
<el-table-column align="center" label="特价" prop="isSpecialPrice" width="80">
  <template slot-scope="scope">
    <el-tag :type="scope.row.isSpecialPrice ? 'warning' : 'info'" size="mini">
      {{ scope.row.isSpecialPrice ? '特价' : '普通' }}
    </el-tag>
  </template>
</el-table-column>
```

注意：商品编辑（edit.vue）中也需要新增特价勾选字段（参照 isNew/isHot 的写法），修改 `handleUpdate` 传参和后端 `AdminGoodsController.update()` 接收 `isSpecialPrice` 参数。

- [ ] **Step 2: 重写 activity.vue 为活动位置顶管理**

替换 Mock 数据为真实 API 调用（`listActivityTop`, `addActivityTop`, `deleteActivityTop`, `updateActivityTop`）。

页面结构：
- 表格列：排序(sortOrder)、商品图(picUrl)、商品名称(goodsName)、价格(retailPrice)、操作
- 操作：修改排序、移除
- 添加按钮：弹窗选择商品（el-select 或商品搜索弹窗，选择后调用 addActivityTop）
- 排序修改：点击后弹出 el-dialog 输入新排序值

- [ ] **Step 3: router/index.js 更新**

广告管理路由设为 hidden（如果还不是的话），确认活动位路由可访问。

穿搭推荐路由取消 `hidden: true`。

- [ ] **Step 4: Commit**

```bash
git add clothing-mall-admin/src/views/ clothing-mall-admin/src/router/index.js
git commit -m "feat(admin): 商品列表特价列 + 活动位置顶管理页面"
```

---

## Task 10: 小程序首页 - 活动位 + 穿搭推荐 + 广告隐藏

**Files:**
- Modify: `clothing-mall-wx/pages/index/index.js`
- Modify: `clothing-mall-wx/pages/index/index.wxml`
- Modify: `clothing-mall-wx/pages/index/index.wxss`

- [ ] **Step 1: index.js 接入活动位数据**

在 `data` 中新增 `activityGoods: []`。

在 `loadData()` 回调中，从返回数据提取活动位：

```javascript
if (res.data.data.homeActivity) {
  this.setData({ activityGoods: res.data.data.homeActivity.goods || [] })
}
```

- [ ] **Step 2: index.js 接入穿搭推荐数据**

在 `loadData()` 回调中，从返回数据提取穿搭推荐：

```javascript
const outfitList = res.data.data.outfitList || []
this.setData({ matchRecommends: outfitList })
```

注意：`matchRecommends` 数据结构从 `{id, name, picUrl, retailPrice}` 变为 `{id, title, coverPic, goods: [...]}`，需要同步更新 wxml 模板。

- [ ] **Step 3: index.wxml 新增活动位模块**

在轮播图 `</swiper>` 和 `weekly-new-section` 之间新增：

```xml
<!-- 活动位 -->
<view class="activity-section" wx:if="{{activityGoods.length > 0}}">
  <view class="section-header-weekly">
    <text class="section-title-cn">精选活动</text>
    <text class="section-title-en">FEATURED</text>
  </view>
  <scroll-view class="activity-scroll" scroll-x enhanced show-scrollbar="{{false}}">
    <view class="activity-item" wx:for="{{activityGoods}}" wx:key="id" bindtap="goToDetail" data-id="{{item.id}}">
      <image src="{{item.picUrl}}" mode="aspectFill" class="activity-img" binderror="onHomeImageError" data-source="activity" data-index="{{index}}" />
      <view class="activity-info">
        <text class="activity-name">{{item.name}}</text>
        <text class="activity-price">¥{{item.retailPrice}}</text>
      </view>
    </view>
  </scroll-view>
</view>
```

- [ ] **Step 4: index.wxml 替换搭配推荐为穿搭推荐**

将 `matchRecommends` 模块替换为穿搭推荐：

```xml
<!-- 穿搭推荐 -->
<view class="grid-section" wx:if="{{matchRecommends.length > 0}}">
  <view class="section-title-center">
    <view class="title-line"></view>
    <text class="title-text">穿搭推荐</text>
    <view class="title-line"></view>
  </view>
  <view class="grid-list">
    <view class="grid-item" wx:for="{{matchRecommends}}" wx:key="id" bindtap="goToOutfit" data-id="{{item.id}}">
      <image src="{{item.coverPic}}" mode="aspectFill" class="grid-img" binderror="onHomeImageError" data-source="outfit" data-index="{{index}}" />
      <view class="grid-info">
        <text class="grid-name">{{item.title}}</text>
      </view>
    </view>
  </view>
</view>
```

新增 `goToOutfit` 方法（暂跳转商品详情页，使用第一个关联商品 ID）：

```javascript
goToOutfit(e) {
  const id = e.currentTarget.dataset.id
  const outfit = this.data.matchRecommends.find(o => o.id === id)
  if (outfit && outfit.goods && outfit.goods.length > 0) {
    wx.navigateTo({ url: `/pages/goods_detail/goods_detail?id=${outfit.goods[0].id}` })
  }
}
```

- [ ] **Step 5: index.wxss 新增活动位样式**

参照现有 `hot-sale-section` 的横向滚动样式，新增 `.activity-section`、`.activity-scroll`、`.activity-item`、`.activity-img`、`.activity-info`、`.activity-name`、`.activity-price` 样式。

- [ ] **Step 6: Commit**

```bash
git add clothing-mall-wx/pages/index/
git commit -m "feat(wx): 首页新增活动位模块 + 穿搭推荐对接"
```

---

## Task 11: 穿搭推荐管理后台对接

**Files:**
- Modify: `clothing-mall-admin/src/views/promotion/outfit.vue`

- [ ] **Step 1: 修复 outfit.vue 字段映射**

全局替换：
- `posterUrl` → `coverPic`（模板和 dataForm 中）
- `name` → `title`（模板和 dataForm 中）
- `enabled` → `status`（dataForm 中，类型从 Boolean 改为 Number 1/0）
- Switch 组件改为 `:active-value="1" :inactive-value="0"`

- [ ] **Step 2: 对接真实 API**

移除 Mock 数据（`setTimeout` + `resolve(mockData)`），替换为真实 API 调用：
- `getList()` → `listOutfit(this.listQuery).then(...)`
- `createData()` → `createOutfit(this.dataForm).then(...)`
- `updateData()` → `updateOutfit(this.dataForm).then(...)`
- `handleDelete()` → `deleteOutfit({ id: row.id }).then(...)`

- [ ] **Step 3: goodsIds 格式处理**

前端传数组，后端存字符串。在 `createData()` 和 `updateData()` 中：

```javascript
// 提交时将数组转为逗号分隔字符串
const submitData = { ...this.dataForm, goodsIds: this.dataForm.goodsIds.join(',') }
```

在 `getList()` 回调中：

```javascript
// 后端返回字符串，前端转为数组
item.goodsIds = item.goodsIds ? item.goodsIds.split(',').map(Number) : []
```

- [ ] **Step 4: Commit**

```bash
git add clothing-mall-admin/src/views/promotion/outfit.vue
git commit -m "fix(admin): 穿搭推荐字段映射修复 + 对接真实 API"
```

---

## Task 12: 广告管理路由隐藏

**Files:**
- Modify: `clothing-mall-admin/src/router/index.js`

- [ ] **Step 1: 隐藏广告管理路由**

在 `router/index.js` 中找到广告管理路由（约行 546-554），添加 `hidden: true`。

- [ ] **Step 2: Commit**

```bash
git add clothing-mall-admin/src/router/index.js
git commit -m "chore(admin): 隐藏广告管理路由"
```

---

## Task 13: 集成验证

- [ ] **Step 1: 全量编译**

Run: `mvn clean compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 2: 启动本地环境验证**

Run: `./scripts/docker-start.sh deploy`
验证项：
1. 管理后台 → 场景管理 → 上传海报图、关联商品 → 保存成功
2. 管理后台 → 商品列表 → 特价列显示
3. 管理后台 → 穿搭推荐 → 创建/编辑/删除正常
4. 管理后台 → 活动位管理 → 添加/移除置顶商品
5. 小程序首页 → 轮播图显示场景海报，点击跳转场景商品页
6. 小程序首页 → 活动位显示聚合商品
7. 小程序首页 → 穿搭推荐显示真实数据
8. 小程序首页 → 每周上新、热销推荐、饰饰如意保持正常

- [ ] **Step 3: 最终 Commit（如有修复）**

```bash
git add -A
git commit -m "fix: 集成验证修复"
```
