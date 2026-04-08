package org.linlinjava.litemall.wx.web;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.domain.ClothingScene;
import org.linlinjava.litemall.db.domain.LitemallUser;
import org.linlinjava.litemall.db.service.ClothingGoodsSceneService;
import org.linlinjava.litemall.db.service.ClothingSceneService;
import org.linlinjava.litemall.db.service.LitemallUserService;
import org.linlinjava.litemall.wx.annotation.LoginUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.constraints.NotNull;
import java.util.List;
import java.util.Map;

/**
 * 小程序管理端场景管理控制器
 */
@RestController
@RequestMapping("/wx/manager/scene")
@Validated
public class WxManagerSceneController {
    private final Log logger = LogFactory.getLog(WxManagerSceneController.class);

    @Autowired
    private ClothingSceneService sceneService;

    @Autowired
    private ClothingGoodsSceneService goodsSceneService;

    @Autowired
    private LitemallUserService userService;

    private Object checkManager(Integer userId) {
        if (userId == null) {
            return ResponseUtil.unlogin();
        }
        LitemallUser user = userService.findById(userId);
        if (user == null) {
            return ResponseUtil.badArgumentValue();
        }
        String role = user.getRole();
        if (role == null) {
            role = "user";
        }
        if (!"owner".equals(role)) {
            return ResponseUtil.fail(403, "无管理权限");
        }
        return null;
    }

    @GetMapping("/list")
    public Object list(@LoginUser Integer userId) {
        Object error = checkManager(userId);
        if (error != null) return error;

        List<ClothingScene> sceneList = sceneService.queryAll();
        return ResponseUtil.okList(sceneList);
    }

    @GetMapping("/read")
    public Object read(@LoginUser Integer userId, @RequestParam("id") @NotNull Integer id) {
        Object error = checkManager(userId);
        if (error != null) return error;

        ClothingScene scene = sceneService.findById(id);
        if (scene == null) {
            return ResponseUtil.badArgumentValue();
        }
        return ResponseUtil.ok(scene);
    }

    @PostMapping("/create")
    public Object create(@LoginUser Integer userId, @RequestBody ClothingScene scene) {
        Object error = checkManager(userId);
        if (error != null) return error;

        if (StringUtils.isEmpty(scene.getName())) {
            return ResponseUtil.fail(401, "场景名称不能为空");
        }
        ClothingScene existing = sceneService.findByName(scene.getName());
        if (existing != null) {
            return ResponseUtil.fail(401, "场景名称已存在");
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

    @PostMapping("/update")
    public Object update(@LoginUser Integer userId, @RequestBody ClothingScene scene) {
        Object error = checkManager(userId);
        if (error != null) return error;

        if (scene.getId() == null) {
            return ResponseUtil.badArgument();
        }
        ClothingScene existing = sceneService.findById(scene.getId());
        if (existing == null) {
            return ResponseUtil.badArgumentValue();
        }
        if (StringUtils.isEmpty(scene.getName())) {
            return ResponseUtil.fail(401, "场景名称不能为空");
        }
        ClothingScene nameScene = sceneService.findByName(scene.getName());
        if (nameScene != null && !nameScene.getId().equals(scene.getId())) {
            return ResponseUtil.fail(401, "场景名称已存在");
        }

        if (sceneService.update(scene) == 0) {
            return ResponseUtil.updatedDataFailed();
        }
        return ResponseUtil.ok(scene);
    }

    @PostMapping("/delete")
    public Object delete(@LoginUser Integer userId, @RequestBody ClothingScene scene) {
        Object error = checkManager(userId);
        if (error != null) return error;

        Integer id = scene.getId();
        if (id == null) {
            return ResponseUtil.badArgument();
        }
        sceneService.delete(id);
        return ResponseUtil.ok();
    }

    @PostMapping("/enable")
    public Object enable(@LoginUser Integer userId, @RequestBody ClothingScene scene) {
        Object error = checkManager(userId);
        if (error != null) return error;

        if (scene.getId() == null || scene.getEnabled() == null) {
            return ResponseUtil.badArgument();
        }
        ClothingScene existing = sceneService.findById(scene.getId());
        if (existing == null) {
            return ResponseUtil.badArgumentValue();
        }

        existing.setEnabled(scene.getEnabled());
        if (sceneService.update(existing) == 0) {
            return ResponseUtil.updatedDataFailed();
        }
        return ResponseUtil.ok(existing);
    }

    @GetMapping("/goods")
    public Object listSceneGoods(@LoginUser Integer userId, @RequestParam Integer sceneId) {
        Object error = checkManager(userId);
        if (error != null) return error;

        List<Integer> goodsIds = goodsSceneService.queryGoodsIdsBySceneId(sceneId);
        return ResponseUtil.ok(goodsIds);
    }

    @PostMapping("/goods/update")
    public Object updateSceneGoods(@LoginUser Integer userId, @RequestBody Map<String, Object> body) {
        Object error = checkManager(userId);
        if (error != null) return error;

        Integer sceneId = (Integer) body.get("sceneId");
        @SuppressWarnings("unchecked")
        List<Integer> goodsIds = (List<Integer>) body.get("goodsIds");
        goodsSceneService.updateSceneGoods(sceneId, goodsIds);
        return ResponseUtil.ok();
    }
}
