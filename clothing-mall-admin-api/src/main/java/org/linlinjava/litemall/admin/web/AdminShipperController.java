package org.linlinjava.litemall.admin.web;

import org.linlinjava.litemall.admin.annotation.RequiresPermissionsDesc;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.domain.LitemallShipper;
import org.linlinjava.litemall.db.service.LitemallShipperService;
import org.apache.shiro.authz.annotation.RequiresPermissions;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/shipper")
@Validated
public class AdminShipperController {

    @Autowired
    private LitemallShipperService shipperService;

    @RequiresPermissions("admin:shipper:list")
    @RequiresPermissionsDesc(menu = {"平台设置", "快递公司管理"}, button = "查询")
    @GetMapping("/list")
    public Object list() {
        List<LitemallShipper> list = shipperService.listAll();
        return ResponseUtil.ok(list);
    }

    @RequiresPermissions("admin:shipper:create")
    @RequiresPermissionsDesc(menu = {"平台设置", "快递公司管理"}, button = "新增")
    @PostMapping("/create")
    public Object create(@RequestBody LitemallShipper shipper) {
        if (shipper.getCode() == null || shipper.getName() == null) {
            return ResponseUtil.badArgument();
        }
        shipperService.create(shipper);
        return ResponseUtil.ok();
    }

    @RequiresPermissions("admin:shipper:update")
    @RequiresPermissionsDesc(menu = {"平台设置", "快递公司管理"}, button = "编辑")
    @PostMapping("/update")
    public Object update(@RequestBody LitemallShipper shipper) {
        if (shipper.getId() == null) {
            return ResponseUtil.badArgument();
        }
        shipperService.update(shipper);
        return ResponseUtil.ok();
    }

    @RequiresPermissions("admin:shipper:delete")
    @RequiresPermissionsDesc(menu = {"平台设置", "快递公司管理"}, button = "删除")
    @PostMapping("/delete")
    public Object delete(@RequestBody LitemallShipper shipper) {
        if (shipper.getId() == null) {
            return ResponseUtil.badArgument();
        }
        shipperService.delete(shipper.getId());
        return ResponseUtil.ok();
    }

    @RequiresPermissions("admin:shipper:update")
    @RequiresPermissionsDesc(menu = {"平台设置", "快递公司管理"}, button = "启用/禁用")
    @PostMapping("/toggle")
    public Object toggle(@RequestBody LitemallShipper shipper) {
        if (shipper.getId() == null || shipper.getEnabled() == null) {
            return ResponseUtil.badArgument();
        }
        shipperService.toggle(shipper.getId(), shipper.getEnabled());
        return ResponseUtil.ok();
    }
}
