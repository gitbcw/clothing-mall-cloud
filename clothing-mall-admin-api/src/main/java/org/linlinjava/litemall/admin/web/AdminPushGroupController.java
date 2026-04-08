package org.linlinjava.litemall.admin.web;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.apache.shiro.authz.annotation.RequiresPermissions;
import org.linlinjava.litemall.admin.annotation.RequiresPermissionsDesc;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.domain.LitemallPushGroup;
import org.linlinjava.litemall.db.service.LitemallPushGroupService;
import org.linlinjava.litemall.db.service.LitemallPushLogService;
import org.springframework.beans.factory.annotation.Autowired;
import javax.validation.constraints.Size;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.constraints.NotNull;
import java.util.List;

@RestController
@RequestMapping("/admin/push/group")
@Validated
public class AdminPushGroupController {
    private final Log logger = LogFactory.getLog(AdminPushGroupController.class);

    // 推送组类型常量
    private static final String TYPE_TEST = "test";
    private static final String TYPE_ACTIVE = "active";
    private static final String TYPE_DORMANT = "dormant";
    private static final String TYPE_SALVAGE = "salvage";

    @Autowired
    private LitemallPushGroupService pushGroupService;

    @Autowired
    private LitemallPushLogService pushLogService;

    @RequiresPermissions("admin:push:group:list")
    @RequiresPermissionsDesc(menu = {"平台设置", "推送组管理"}, button = "查询")
    @GetMapping("/list")
    public Object list(String name, String type,
                       @RequestParam(defaultValue = "1") Integer page,
                       @RequestParam(defaultValue = "10") Integer size,
                       @RequestParam(defaultValue = "id") String sort,
                       @RequestParam(defaultValue = "asc") String order) {
        List<LitemallPushGroup> list = pushGroupService.querySelective(name, type, page, size, sort, order);
        return ResponseUtil.okList(list);
    }

    @RequiresPermissions("admin:push:group:list")
    @RequiresPermissionsDesc(menu = {"平台设置", "推送组管理"}, button = "详情")
    @GetMapping("/detail")
    public Object detail(@NotNull Integer id) {
        LitemallPushGroup group = pushGroupService.findById(id);
        if (group == null) {
            return ResponseUtil.badArgumentValue();
        }
        return ResponseUtil.ok(group);
    }

    @RequiresPermissions("admin:push:group:create")
    @RequiresPermissionsDesc(menu = {"平台设置", "推送组管理"}, button = "创建")
    @PostMapping("/create")
    public Object create(@RequestBody LitemallPushGroup group) {
        Object error = validate(group);
        if (error != null) {
            return error;
        }
        pushGroupService.add(group);
        return ResponseUtil.ok(group);
    }

    @RequiresPermissions("admin:push:group:update")
    @RequiresPermissionsDesc(menu = {"平台设置", "推送组管理"}, button = "编辑")
    @PostMapping("/update")
    public Object update(@RequestBody LitemallPushGroup group) {
        Object error = validate(group);
        if (error != null) {
            return error;
        }
        LitemallPushGroup existing = pushGroupService.findById(group.getId());
        if (existing == null) {
            return ResponseUtil.badArgumentValue();
        }
        pushGroupService.updateById(group);
        return ResponseUtil.ok();
    }

    @RequiresPermissions("admin:push:group:delete")
    @RequiresPermissionsDesc(menu = {"平台设置", "推送组管理"}, button = "删除")
    @PostMapping("/delete")
    public Object delete(@NotNull Integer id) {
        LitemallPushGroup group = pushGroupService.findById(id);
        if (group == null) {
            return ResponseUtil.badArgumentValue();
        }
        // 检查是否有待发送的推送日志
        if (pushLogService.hasPendingLogsByGroupId(id)) {
            return ResponseUtil.fail(403, "该推送组有待发送的推送任务，无法删除");
        }
        pushGroupService.deleteById(id);
        return ResponseUtil.ok();
    }

    private Object validate(LitemallPushGroup group) {
        String name = group.getName();
        if (name == null || name.isEmpty()) {
            return ResponseUtil.badArgument();
        }
        // 名称长度校验（数据库限制为64字符）
        if (name.length() > 64) {
            return ResponseUtil.fail(400, "分组名称不能超过64个字符");
        }
        String type = group.getType();
        if (type == null || type.isEmpty()) {
            return ResponseUtil.badArgument();
        }
        // 验证类型是否合法
        if (!TYPE_TEST.equals(type) && !TYPE_ACTIVE.equals(type) && !TYPE_DORMANT.equals(type) && !TYPE_SALVAGE.equals(type)) {
            return ResponseUtil.badArgumentValue();
        }
        return null;
    }
}
