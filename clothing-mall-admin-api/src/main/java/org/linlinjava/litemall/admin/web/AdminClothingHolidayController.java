package org.linlinjava.litemall.admin.web;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.apache.shiro.authz.annotation.RequiresPermissions;
import org.linlinjava.litemall.admin.annotation.RequiresPermissionsDesc;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.domain.ClothingHoliday;
import org.linlinjava.litemall.db.service.ClothingHolidayGoodsService;
import org.linlinjava.litemall.db.service.ClothingHolidayService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.constraints.NotNull;
import java.util.List;
import java.util.Map;

/**
 * 节日活动管理接口
 */
@RestController
@RequestMapping("/admin/clothing/holiday")
@Validated
public class AdminClothingHolidayController {
    private final Log logger = LogFactory.getLog(AdminClothingHolidayController.class);

    @Autowired
    private ClothingHolidayService holidayService;

    @Autowired
    private ClothingHolidayGoodsService holidayGoodsService;

    @RequiresPermissions("admin:clothing:holiday:list")
    @RequiresPermissionsDesc(menu = {"服装管理", "节日管理"}, button = "查询")
    @GetMapping("/list")
    public Object list() {
        List<ClothingHoliday> holidayList = holidayService.queryAll();
        return ResponseUtil.okList(holidayList);
    }

    @RequiresPermissions("admin:clothing:holiday:read")
    @RequiresPermissionsDesc(menu = {"服装管理", "节日管理"}, button = "详情")
    @GetMapping("/read")
    public Object read(@NotNull Integer id) {
        ClothingHoliday holiday = holidayService.findById(id);
        if (holiday == null) {
            return ResponseUtil.badArgumentValue();
        }
        return ResponseUtil.ok(holiday);
    }

    private Object validate(ClothingHoliday holiday) {
        if (StringUtils.isEmpty(holiday.getName())) {
            return ResponseUtil.fail(401, "节日名称不能为空");
        }
        if (holiday.getStartDate() == null) {
            return ResponseUtil.fail(401, "开始日期不能为空");
        }
        if (holiday.getEndDate() == null) {
            return ResponseUtil.fail(401, "结束日期不能为空");
        }
        if (holiday.getEndDate().isBefore(holiday.getStartDate())) {
            return ResponseUtil.fail(401, "结束日期不能早于开始日期");
        }
        return null;
    }

    @RequiresPermissions("admin:clothing:holiday:create")
    @RequiresPermissionsDesc(menu = {"服装管理", "节日管理"}, button = "添加")
    @PostMapping("/create")
    public Object create(@RequestBody ClothingHoliday holiday) {
        Object error = validate(holiday);
        if (error != null) {
            return error;
        }

        if (holiday.getSortOrder() == null) {
            holiday.setSortOrder(0);
        }
        if (holiday.getEnabled() == null) {
            holiday.setEnabled(true);
        }

        holidayService.add(holiday);
        return ResponseUtil.ok(holiday);
    }

    @RequiresPermissions("admin:clothing:holiday:update")
    @RequiresPermissionsDesc(menu = {"服装管理", "节日管理"}, button = "编辑")
    @PostMapping("/update")
    public Object update(@RequestBody ClothingHoliday holiday) {
        if (holiday.getId() == null) {
            return ResponseUtil.badArgument();
        }

        ClothingHoliday existingHoliday = holidayService.findById(holiday.getId());
        if (existingHoliday == null) {
            return ResponseUtil.badArgumentValue();
        }

        Object error = validate(holiday);
        if (error != null) {
            return error;
        }

        if (holidayService.update(holiday) == 0) {
            return ResponseUtil.updatedDataFailed();
        }
        return ResponseUtil.ok(holiday);
    }

    @RequiresPermissions("admin:clothing:holiday:delete")
    @RequiresPermissionsDesc(menu = {"服装管理", "节日管理"}, button = "删除")
    @PostMapping("/delete")
    public Object delete(@RequestBody ClothingHoliday holiday) {
        Integer id = holiday.getId();
        if (id == null) {
            return ResponseUtil.badArgument();
        }
        holidayService.delete(id);
        return ResponseUtil.ok();
    }

    @RequiresPermissions("admin:clothing:holiday:enable")
    @RequiresPermissionsDesc(menu = {"服装管理", "节日管理"}, button = "启用/禁用")
    @PostMapping("/enable")
    public Object enable(@RequestBody ClothingHoliday holiday) {
        if (holiday.getId() == null || holiday.getEnabled() == null) {
            return ResponseUtil.badArgument();
        }

        ClothingHoliday existingHoliday = holidayService.findById(holiday.getId());
        if (existingHoliday == null) {
            return ResponseUtil.badArgumentValue();
        }

        existingHoliday.setEnabled(holiday.getEnabled());
        if (holidayService.update(existingHoliday) == 0) {
            return ResponseUtil.updatedDataFailed();
        }
        return ResponseUtil.ok(existingHoliday);
    }

    @RequiresPermissions("admin:clothing:holiday:list")
    @GetMapping("/goods")
    public Object listHolidayGoods(@RequestParam Integer holidayId) {
        List<Integer> goodsIds = holidayGoodsService.queryGoodsIdsByHolidayId(holidayId);
        return ResponseUtil.ok(goodsIds);
    }

    @RequiresPermissions("admin:clothing:holiday:update")
    @PostMapping("/goods/update")
    public Object updateHolidayGoods(@RequestBody Map<String, Object> body) {
        Integer holidayId = (Integer) body.get("holidayId");
        @SuppressWarnings("unchecked")
        List<Integer> goodsIds = (List<Integer>) body.get("goodsIds");
        holidayGoodsService.updateHolidayGoods(holidayId, goodsIds);
        return ResponseUtil.ok();
    }
}
