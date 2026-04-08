package org.linlinjava.litemall.admin.web;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.apache.shiro.authz.annotation.RequiresPermissions;
import org.linlinjava.litemall.admin.annotation.RequiresPermissionsDesc;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.core.validator.Order;
import org.linlinjava.litemall.core.validator.Sort;
import org.linlinjava.litemall.db.domain.ClothingStore;
import org.linlinjava.litemall.db.service.ClothingStoreService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.constraints.NotNull;
import java.util.List;

/**
 * 门店管理接口
 */
@RestController
@RequestMapping("/admin/clothing/store")
@Validated
public class AdminClothingStoreController {
    private final Log logger = LogFactory.getLog(AdminClothingStoreController.class);

    @Autowired
    private ClothingStoreService storeService;

    @RequiresPermissions("admin:clothing:store:list")
    @RequiresPermissionsDesc(menu = {"服装管理", "门店管理"}, button = "查询")
    @GetMapping("/list")
    public Object list(String name, Boolean status,
                       @RequestParam(defaultValue = "1") Integer page,
                       @RequestParam(defaultValue = "10") Integer limit,
                       @Sort @RequestParam(defaultValue = "add_time") String sort,
                       @Order @RequestParam(defaultValue = "desc") String order) {
        List<ClothingStore> storeList = storeService.querySelective(name, status, page, limit);
        return ResponseUtil.okList(storeList);
    }

    @RequiresPermissions("admin:clothing:store:read")
    @RequiresPermissionsDesc(menu = {"服装管理", "门店管理"}, button = "详情")
    @GetMapping("/read")
    public Object read(@NotNull Integer id) {
        ClothingStore store = storeService.findById(id);
        if (store == null) {
            return ResponseUtil.badArgumentValue();
        }
        return ResponseUtil.ok(store);
    }

    private Object validate(ClothingStore store) {
        if (StringUtils.isEmpty(store.getName())) {
            return ResponseUtil.fail(401, "门店名称不能为空");
        }
        if (StringUtils.isEmpty(store.getAddress())) {
            return ResponseUtil.fail(401, "门店地址不能为空");
        }
        if (StringUtils.isEmpty(store.getPhone())) {
            return ResponseUtil.fail(401, "联系电话不能为空");
        }
        return null;
    }

    @RequiresPermissions("admin:clothing:store:create")
    @RequiresPermissionsDesc(menu = {"服装管理", "门店管理"}, button = "添加")
    @PostMapping("/create")
    public Object create(@RequestBody ClothingStore store) {
        Object error = validate(store);
        if (error != null) {
            return error;
        }

        if (store.getStatus() == null) {
            store.setStatus(true);
        }

        storeService.add(store);
        return ResponseUtil.ok(store);
    }

    @RequiresPermissions("admin:clothing:store:update")
    @RequiresPermissionsDesc(menu = {"服装管理", "门店管理"}, button = "编辑")
    @PostMapping("/update")
    public Object update(@RequestBody ClothingStore store) {
        if (store.getId() == null) {
            return ResponseUtil.badArgument();
        }

        ClothingStore existingStore = storeService.findById(store.getId());
        if (existingStore == null) {
            return ResponseUtil.badArgumentValue();
        }

        Object error = validate(store);
        if (error != null) {
            return error;
        }

        if (storeService.update(store) == 0) {
            return ResponseUtil.updatedDataFailed();
        }
        return ResponseUtil.ok(store);
    }

    @RequiresPermissions("admin:clothing:store:delete")
    @RequiresPermissionsDesc(menu = {"服装管理", "门店管理"}, button = "删除")
    @PostMapping("/delete")
    public Object delete(@RequestBody ClothingStore store) {
        Integer id = store.getId();
        if (id == null) {
            return ResponseUtil.badArgument();
        }
        storeService.delete(id);
        return ResponseUtil.ok();
    }

    @RequiresPermissions("admin:clothing:store:list")
    @GetMapping("/all")
    public Object listAll() {
        List<ClothingStore> storeList = storeService.queryAll();
        return ResponseUtil.okList(storeList);
    }
}
