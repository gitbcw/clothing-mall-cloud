package org.linlinjava.litemall.admin.web;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.apache.shiro.authz.annotation.RequiresPermissions;
import org.linlinjava.litemall.admin.annotation.RequiresPermissionsDesc;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.core.validator.Order;
import org.linlinjava.litemall.core.validator.Sort;
import org.linlinjava.litemall.db.domain.LitemallFootprint;
import org.linlinjava.litemall.db.domain.LitemallGoods;
import org.linlinjava.litemall.db.domain.LitemallUser;
import org.linlinjava.litemall.db.service.LitemallFootprintService;
import org.linlinjava.litemall.db.service.LitemallGoodsService;
import org.linlinjava.litemall.db.service.LitemallUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/footprint")
@Validated
public class AdminFootprintController {
    private final Log logger = LogFactory.getLog(AdminFootprintController.class);

    @Autowired
    private LitemallFootprintService footprintService;

    @Autowired
    private LitemallUserService userService;

    @Autowired
    private LitemallGoodsService goodsService;

    @RequiresPermissions("admin:footprint:list")
    @RequiresPermissionsDesc(menu = {"会员管理", "会员足迹"}, button = "查询")
    @GetMapping("/list")
    public Object list(String userId, String goodsId,
                       @RequestParam(defaultValue = "1") Integer page,
                       @RequestParam(defaultValue = "10") Integer limit,
                       @Sort @RequestParam(defaultValue = "add_time") String sort,
                       @Order @RequestParam(defaultValue = "desc") String order) {
        List<LitemallFootprint> footprintList = footprintService.querySelective(userId, goodsId, page, limit, sort,
                order);

        // 组装返回数据，添加用户昵称和商品名称
        List<Map<String, Object>> resultList = new ArrayList<>();
        for (LitemallFootprint footprint : footprintList) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", footprint.getId());
            item.put("userId", footprint.getUserId());
            item.put("goodsId", footprint.getGoodsId());
            item.put("addTime", footprint.getAddTime());

            // 获取用户昵称
            if (footprint.getUserId() != null) {
                LitemallUser user = userService.findById(footprint.getUserId());
                if (user != null) {
                    item.put("userName", user.getNickname());
                } else {
                    item.put("userName", "");
                }
            } else {
                item.put("userName", "");
            }

            // 获取商品名称
            if (footprint.getGoodsId() != null) {
                LitemallGoods goods = goodsService.findById(footprint.getGoodsId());
                if (goods != null) {
                    item.put("goodsName", goods.getName());
                } else {
                    item.put("goodsName", "");
                }
            } else {
                item.put("goodsName", "");
            }

            resultList.add(item);
        }

        return ResponseUtil.okList(resultList, footprintList);
    }
}
