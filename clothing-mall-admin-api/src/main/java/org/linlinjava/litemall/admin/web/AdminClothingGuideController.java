package org.linlinjava.litemall.admin.web;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.apache.shiro.authz.annotation.RequiresPermissions;
import org.linlinjava.litemall.admin.annotation.RequiresPermissionsDesc;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.core.validator.Order;
import org.linlinjava.litemall.core.validator.Sort;
import org.linlinjava.litemall.db.domain.ClothingGuide;
import org.linlinjava.litemall.db.service.ClothingGuideService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

/**
 * 导购管理接口
 */
@RestController
@RequestMapping("/admin/clothing/guide")
@Validated
public class AdminClothingGuideController {
    private final Log logger = LogFactory.getLog(AdminClothingGuideController.class);

    @Autowired
    private ClothingGuideService guideService;

    @RequiresPermissions("admin:clothing:guide:list")
    @RequiresPermissionsDesc(menu = {"服装管理", "导购管理"}, button = "查询")
    @GetMapping("/list")
    public Object list(String name, String phone, Integer storeId, Boolean status,
                       @RequestParam(defaultValue = "1") Integer page,
                       @RequestParam(defaultValue = "10") Integer limit,
                       @Sort @RequestParam(defaultValue = "add_time") String sort,
                       @Order @RequestParam(defaultValue = "desc") String order) {
        List<ClothingGuide> guideList = guideService.querySelective(name, phone, storeId, status, page, limit);
        return ResponseUtil.okList(guideList);
    }

    @RequiresPermissions("admin:clothing:guide:read")
    @RequiresPermissionsDesc(menu = {"服装管理", "导购管理"}, button = "详情")
    @GetMapping("/read")
    public Object read(@NotNull Integer id) {
        ClothingGuide guide = guideService.findById(id);
        if (guide == null) {
            return ResponseUtil.badArgumentValue();
        }
        return ResponseUtil.ok(guide);
    }

    private Object validate(ClothingGuide guide) {
        if (StringUtils.isEmpty(guide.getName())) {
            return ResponseUtil.fail(401, "导购姓名不能为空");
        }
        if (StringUtils.isEmpty(guide.getPhone())) {
            return ResponseUtil.fail(401, "手机号不能为空");
        }

        // 检查手机号格式
        if (!guide.getPhone().matches("^1[3-9]\\d{9}$")) {
            return ResponseUtil.fail(401, "手机号格式不正确");
        }

        // 检查提成比例
        if (guide.getCommissionRate() != null) {
            if (guide.getCommissionRate().compareTo(BigDecimal.ZERO) < 0 ||
                guide.getCommissionRate().compareTo(BigDecimal.ONE) > 0) {
                return ResponseUtil.fail(401, "提成比例应在0-1之间");
            }
        }

        return null;
    }

    @RequiresPermissions("admin:clothing:guide:create")
    @RequiresPermissionsDesc(menu = {"服装管理", "导购管理"}, button = "添加")
    @PostMapping("/create")
    public Object create(@RequestBody ClothingGuide guide) {
        Object error = validate(guide);
        if (error != null) {
            return error;
        }

        // 检查手机号是否已存在
        ClothingGuide existingGuide = guideService.findByPhone(guide.getPhone());
        if (existingGuide != null) {
            return ResponseUtil.fail(401, "该手机号已存在");
        }

        if (guide.getStatus() == null) {
            guide.setStatus(true);
        }
        if (guide.getCommissionRate() == null) {
            guide.setCommissionRate(new BigDecimal("0.01"));
        }

        guideService.add(guide);
        return ResponseUtil.ok(guide);
    }

    @RequiresPermissions("admin:clothing:guide:update")
    @RequiresPermissionsDesc(menu = {"服装管理", "导购管理"}, button = "编辑")
    @PostMapping("/update")
    public Object update(@RequestBody ClothingGuide guide) {
        if (guide.getId() == null) {
            return ResponseUtil.badArgument();
        }

        ClothingGuide existingGuide = guideService.findById(guide.getId());
        if (existingGuide == null) {
            return ResponseUtil.badArgumentValue();
        }

        Object error = validate(guide);
        if (error != null) {
            return error;
        }

        // 如果修改了手机号，检查新手机号是否已存在
        if (!existingGuide.getPhone().equals(guide.getPhone())) {
            ClothingGuide phoneGuide = guideService.findByPhone(guide.getPhone());
            if (phoneGuide != null) {
                return ResponseUtil.fail(401, "该手机号已存在");
            }
        }

        if (guideService.update(guide) == 0) {
            return ResponseUtil.updatedDataFailed();
        }
        return ResponseUtil.ok(guide);
    }

    @RequiresPermissions("admin:clothing:guide:delete")
    @RequiresPermissionsDesc(menu = {"服装管理", "导购管理"}, button = "删除")
    @PostMapping("/delete")
    public Object delete(@RequestBody ClothingGuide guide) {
        Integer id = guide.getId();
        if (id == null) {
            return ResponseUtil.badArgument();
        }
        guideService.delete(id);
        return ResponseUtil.ok();
    }
}
