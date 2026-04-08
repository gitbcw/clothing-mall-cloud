package org.linlinjava.litemall.admin.web;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.apache.shiro.authz.annotation.RequiresPermissions;
import org.linlinjava.litemall.admin.annotation.RequiresPermissionsDesc;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.core.validator.Order;
import org.linlinjava.litemall.core.validator.Sort;
import org.linlinjava.litemall.db.domain.LitemallGoods;
import org.linlinjava.litemall.db.domain.LitemallOutfit;
import org.linlinjava.litemall.db.service.LitemallGoodsService;
import org.linlinjava.litemall.db.service.LitemallOutfitService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.constraints.NotNull;
import java.util.*;

/**
 * 穿搭推荐管理
 */
@RestController
@RequestMapping("/admin/outfit")
@Validated
public class AdminOutfitController {
    private final Log logger = LogFactory.getLog(AdminOutfitController.class);

    @Autowired
    private LitemallOutfitService outfitService;

    @Autowired
    private LitemallGoodsService goodsService;

    private static final ObjectMapper jsonMapper = new ObjectMapper();

    @RequiresPermissions("admin:outfit:list")
    @RequiresPermissionsDesc(menu = {"推广管理", "穿搭推荐"}, button = "查询")
    @GetMapping("/list")
    public Object list(String title, Short status,
                       @RequestParam(defaultValue = "1") Integer page,
                       @RequestParam(defaultValue = "10") Integer limit,
                       @Sort(accepts = {"sort_order", "add_time", "id"}) @RequestParam(defaultValue = "sort_order") String sort,
                       @Order @RequestParam(defaultValue = "asc") String order) {
        List<LitemallOutfit> outfitList = outfitService.querySelective(title, status, page, limit, sort, order);
        // 解析 goodsIds 并附加 goodsList（商品摘要信息）
        for (LitemallOutfit outfit : outfitList) {
            outfit.setGoodsList(buildGoodsList(outfit.getGoodsIds()));
        }
        return ResponseUtil.okList(outfitList);
    }

    @RequiresPermissions("admin:outfit:create")
    @RequiresPermissionsDesc(menu = {"推广管理", "穿搭推荐"}, button = "添加")
    @PostMapping("/create")
    public Object create(@RequestBody LitemallOutfit outfit) {
        Object error = validate(outfit);
        if (error != null) {
            return error;
        }

        outfitService.add(outfit);
        return ResponseUtil.ok(outfit);
    }

    @RequiresPermissions("admin:outfit:read")
    @RequiresPermissionsDesc(menu = {"推广管理", "穿搭推荐"}, button = "详情")
    @GetMapping("/read")
    public Object read(@NotNull Integer id) {
        LitemallOutfit outfit = outfitService.findById(id);
        if (outfit == null) {
            return ResponseUtil.badArgumentValue();
        }
        // 补充 goodsList 回填
        outfit.setGoodsList(buildGoodsList(outfit.getGoodsIds()));
        return ResponseUtil.ok(outfit);
    }

    @RequiresPermissions("admin:outfit:update")
    @RequiresPermissionsDesc(menu = {"推广管理", "穿搭推荐"}, button = "编辑")
    @PostMapping("/update")
    public Object update(@RequestBody LitemallOutfit outfit) {
        Object error = validate(outfit);
        if (error != null) {
            return error;
        }

        if (outfitService.updateById(outfit) == 0) {
            return ResponseUtil.updatedDataFailed();
        }
        return ResponseUtil.ok(outfit);
    }

    @RequiresPermissions("admin:outfit:delete")
    @RequiresPermissionsDesc(menu = {"推广管理", "穿搭推荐"}, button = "删除")
    @PostMapping("/delete")
    public Object delete(@RequestBody LitemallOutfit outfit) {
        outfitService.deleteById(outfit.getId());
        return ResponseUtil.ok();
    }

    /**
     * 解析 goodsIds JSON 字符串，查询商品并返回摘要列表
     */
    private List<Map<String, Object>> buildGoodsList(String goodsIdsJson) {
        List<Map<String, Object>> result = new ArrayList<>();
        if (goodsIdsJson == null || goodsIdsJson.isEmpty()) {
            return result;
        }
        try {
            List<Integer> goodsIds = jsonMapper.readValue(goodsIdsJson, new TypeReference<List<Integer>>() {});
            for (Integer goodsId : goodsIds) {
                LitemallGoods goods = goodsService.findById(goodsId);
                if (goods != null) {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", goods.getId());
                    map.put("name", goods.getName());
                    map.put("picUrl", goods.getPicUrl());
                    map.put("retailPrice", goods.getRetailPrice());
                    result.add(map);
                }
            }
        } catch (Exception e) {
            logger.error("解析穿搭商品ID失败: " + goodsIdsJson, e);
        }
        return result;
    }

    private Object validate(LitemallOutfit outfit) {
        String title = outfit.getTitle();
        if (StringUtils.isEmpty(title)) {
            return ResponseUtil.badArgument();
        }
        String coverPic = outfit.getCoverPic();
        if (StringUtils.isEmpty(coverPic)) {
            return ResponseUtil.badArgument();
        }
        return null;
    }
}
