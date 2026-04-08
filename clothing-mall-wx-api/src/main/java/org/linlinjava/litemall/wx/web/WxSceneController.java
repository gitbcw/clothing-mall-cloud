package org.linlinjava.litemall.wx.web;

import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.domain.ClothingScene;
import org.linlinjava.litemall.db.service.*;
import com.github.pagehelper.PageHelper;
import com.github.pagehelper.PageInfo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.*;

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
     * 启用的场景名称列表（供小程序管理端预加载）
     */
    @GetMapping("/list")
    public Object list() {
        List<ClothingScene> scenes = sceneService.queryEnabled();
        List<String> names = new ArrayList<>();
        for (ClothingScene scene : scenes) {
            names.add(scene.getName());
        }
        return ResponseUtil.ok(names);
    }

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
