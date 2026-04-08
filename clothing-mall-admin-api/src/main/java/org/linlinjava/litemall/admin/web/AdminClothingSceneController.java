package org.linlinjava.litemall.admin.web;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.apache.shiro.authz.annotation.RequiresPermissions;
import org.linlinjava.litemall.admin.annotation.RequiresPermissionsDesc;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.domain.ClothingScene;
import org.linlinjava.litemall.db.service.ClothingGoodsSceneService;
import org.linlinjava.litemall.db.service.ClothingSceneService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.constraints.NotNull;
import java.util.List;
import java.util.Map;

/**
 * 场景标签管理接口
 */
@RestController
@RequestMapping("/admin/clothing/scene")
@Validated
public class AdminClothingSceneController {
    private final Log logger = LogFactory.getLog(AdminClothingSceneController.class);

    @Autowired
    private ClothingSceneService sceneService;

    @Autowired
    private ClothingGoodsSceneService goodsSceneService;

    @RequiresPermissions("admin:clothing:scene:list")
    @RequiresPermissionsDesc(menu = {"服装管理", "场景管理"}, button = "查询")
    @GetMapping("/list")
    public Object list() {
        List<ClothingScene> sceneList = sceneService.queryAll();
        return ResponseUtil.okList(sceneList);
    }

    @RequiresPermissions("admin:clothing:scene:read")
    @RequiresPermissionsDesc(menu = {"服装管理", "场景管理"}, button = "详情")
    @GetMapping("/read")
    public Object read(@NotNull Integer id) {
        ClothingScene scene = sceneService.findById(id);
        if (scene == null) {
            return ResponseUtil.badArgumentValue();
        }
        return ResponseUtil.ok(scene);
    }

    private Object validate(ClothingScene scene) {
        if (StringUtils.isEmpty(scene.getName())) {
            return ResponseUtil.fail(401, "场景名称不能为空");
        }
        // 检查名称是否重复
        ClothingScene existingScene = sceneService.findByName(scene.getName());
        if (existingScene != null && !existingScene.getId().equals(scene.getId())) {
            return ResponseUtil.fail(401, "场景名称已存在");
        }
        return null;
    }

    @RequiresPermissions("admin:clothing:scene:create")
    @RequiresPermissionsDesc(menu = {"服装管理", "场景管理"}, button = "添加")
    @PostMapping("/create")
    public Object create(@RequestBody ClothingScene scene) {
        Object error = validate(scene);
        if (error != null) {
            return error;
        }

        if (scene.getSortOrder() == null) {
            scene.setSortOrder(0);
        }
        if (scene.getEnabled() == null) {
            scene.setEnabled(true);
        }

        sceneService.add(scene);
        return ResponseUtil.ok(scene);
    }

    @RequiresPermissions("admin:clothing:scene:update")
    @RequiresPermissionsDesc(menu = {"服装管理", "场景管理"}, button = "编辑")
    @PostMapping("/update")
    public Object update(@RequestBody ClothingScene scene) {
        if (scene.getId() == null) {
            return ResponseUtil.badArgument();
        }

        ClothingScene existingScene = sceneService.findById(scene.getId());
        if (existingScene == null) {
            return ResponseUtil.badArgumentValue();
        }

        Object error = validate(scene);
        if (error != null) {
            return error;
        }

        if (sceneService.update(scene) == 0) {
            return ResponseUtil.updatedDataFailed();
        }
        return ResponseUtil.ok(scene);
    }

    @RequiresPermissions("admin:clothing:scene:delete")
    @RequiresPermissionsDesc(menu = {"服装管理", "场景管理"}, button = "删除")
    @PostMapping("/delete")
    public Object delete(@RequestBody ClothingScene scene) {
        Integer id = scene.getId();
        if (id == null) {
            return ResponseUtil.badArgument();
        }
        sceneService.delete(id);
        return ResponseUtil.ok();
    }

    @RequiresPermissions("admin:clothing:scene:enable")
    @RequiresPermissionsDesc(menu = {"服装管理", "场景管理"}, button = "启用/禁用")
    @PostMapping("/enable")
    public Object enable(@RequestBody ClothingScene scene) {
        if (scene.getId() == null || scene.getEnabled() == null) {
            return ResponseUtil.badArgument();
        }

        ClothingScene existingScene = sceneService.findById(scene.getId());
        if (existingScene == null) {
            return ResponseUtil.badArgumentValue();
        }

        existingScene.setEnabled(scene.getEnabled());
        if (sceneService.update(existingScene) == 0) {
            return ResponseUtil.updatedDataFailed();
        }
        return ResponseUtil.ok(existingScene);
    }

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
}
