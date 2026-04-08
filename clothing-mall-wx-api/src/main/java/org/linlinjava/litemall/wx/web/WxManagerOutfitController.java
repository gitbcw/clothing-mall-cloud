package org.linlinjava.litemall.wx.web;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.domain.LitemallGoods;
import org.linlinjava.litemall.db.domain.LitemallOutfit;
import org.linlinjava.litemall.db.domain.LitemallUser;
import org.linlinjava.litemall.db.service.LitemallGoodsService;
import org.linlinjava.litemall.db.service.LitemallOutfitService;
import org.linlinjava.litemall.db.service.LitemallUserService;
import org.linlinjava.litemall.wx.annotation.LoginUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.constraints.NotNull;
import java.util.*;

/**
 * 小程序管理端穿搭推荐控制器
 */
@RestController
@RequestMapping("/wx/manager/outfit")
@Validated
public class WxManagerOutfitController {
    private final Log logger = LogFactory.getLog(WxManagerOutfitController.class);

    private static final ObjectMapper jsonMapper = new ObjectMapper();

    @Autowired
    private LitemallOutfitService outfitService;

    @Autowired
    private LitemallGoodsService goodsService;

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
    public Object list(@LoginUser Integer userId,
                       @RequestParam(defaultValue = "1") Integer page,
                       @RequestParam(defaultValue = "50") Integer limit) {
        Object error = checkManager(userId);
        if (error != null) return error;

        List<LitemallOutfit> outfitList = outfitService.querySelective(null, null, page, limit, "sort_order", "asc");
        for (LitemallOutfit outfit : outfitList) {
            outfit.setGoodsList(buildGoodsList(outfit.getGoodsIds()));
        }
        return ResponseUtil.okList(outfitList);
    }

    @GetMapping("/read")
    public Object read(@LoginUser Integer userId, @RequestParam("id") @NotNull Integer id) {
        Object error = checkManager(userId);
        if (error != null) return error;

        LitemallOutfit outfit = outfitService.findById(id);
        if (outfit == null) {
            return ResponseUtil.badArgumentValue();
        }
        outfit.setGoodsList(buildGoodsList(outfit.getGoodsIds()));
        return ResponseUtil.ok(outfit);
    }

    @PostMapping("/create")
    public Object create(@LoginUser Integer userId, @RequestBody LitemallOutfit outfit) {
        Object error = checkManager(userId);
        if (error != null) return error;

        if (StringUtils.isEmpty(outfit.getTitle())) {
            return ResponseUtil.fail(401, "穿搭标题不能为空");
        }
        if (StringUtils.isEmpty(outfit.getCoverPic())) {
            return ResponseUtil.fail(401, "封面图片不能为空");
        }

        if (outfit.getSortOrder() == null) {
            outfit.setSortOrder(0);
        }
        if (outfit.getStatus() == null) {
            outfit.setStatus(LitemallOutfitService.STATUS_ENABLED);
        }

        outfitService.add(outfit);
        return ResponseUtil.ok(outfit);
    }

    @PostMapping("/update")
    public Object update(@LoginUser Integer userId, @RequestBody LitemallOutfit outfit) {
        Object error = checkManager(userId);
        if (error != null) return error;

        if (outfit.getId() == null) {
            return ResponseUtil.badArgument();
        }
        LitemallOutfit existing = outfitService.findById(outfit.getId());
        if (existing == null) {
            return ResponseUtil.badArgumentValue();
        }
        if (StringUtils.isEmpty(outfit.getTitle())) {
            return ResponseUtil.fail(401, "穿搭标题不能为空");
        }
        if (StringUtils.isEmpty(outfit.getCoverPic())) {
            return ResponseUtil.fail(401, "封面图片不能为空");
        }

        if (outfitService.updateById(outfit) == 0) {
            return ResponseUtil.updatedDataFailed();
        }
        return ResponseUtil.ok(outfit);
    }

    @PostMapping("/delete")
    public Object delete(@LoginUser Integer userId, @RequestBody LitemallOutfit outfit) {
        Object error = checkManager(userId);
        if (error != null) return error;

        if (outfit.getId() == null) {
            return ResponseUtil.badArgument();
        }
        outfitService.deleteById(outfit.getId());
        return ResponseUtil.ok();
    }

    @PostMapping("/status")
    public Object updateStatus(@LoginUser Integer userId, @RequestBody LitemallOutfit outfit) {
        Object error = checkManager(userId);
        if (error != null) return error;

        if (outfit.getId() == null || outfit.getStatus() == null) {
            return ResponseUtil.badArgument();
        }
        LitemallOutfit existing = outfitService.findById(outfit.getId());
        if (existing == null) {
            return ResponseUtil.badArgumentValue();
        }

        existing.setStatus(outfit.getStatus());
        if (outfitService.updateById(existing) == 0) {
            return ResponseUtil.updatedDataFailed();
        }
        return ResponseUtil.ok(existing);
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
}
