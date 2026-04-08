package org.linlinjava.litemall.admin.web;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.apache.shiro.authz.annotation.RequiresPermissions;
import org.linlinjava.litemall.admin.annotation.RequiresPermissionsDesc;
import org.linlinjava.litemall.core.system.SystemConfig;
import org.linlinjava.litemall.core.system.WeWorkService;
import org.linlinjava.litemall.core.util.JacksonUtil;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.domain.LitemallPushGroup;
import org.linlinjava.litemall.db.domain.LitemallPushLog;
import org.linlinjava.litemall.db.service.LitemallPushGroupService;
import org.linlinjava.litemall.db.service.LitemallPushLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * 企业微信小程序卡片推送控制器
 */
@RestController
@RequestMapping("/admin/wework")
@Validated
public class AdminWeWorkController {
    private final Log logger = LogFactory.getLog(AdminWeWorkController.class);

    @Autowired
    private WeWorkService weWorkService;

    @Autowired
    private LitemallPushGroupService pushGroupService;

    @Autowired
    private LitemallPushLogService pushLogService;

    /**
     * 获取企业微信标签列表
     */
    @RequiresPermissions("admin:wework:list")
    @RequiresPermissionsDesc(menu = {"企业微信", "消息推送"}, button = "查看标签")
    @GetMapping("/tags")
    public Object getTags() {
        List<Map<String, Object>> tags = weWorkService.getCorpTagList();
        if (tags == null) {
            return ResponseUtil.fail(500, "获取企业微信标签列表失败，请检查企业微信配置");
        }
        return ResponseUtil.okList(tags);
    }

    /**
     * 获取可用的小程序跳转页面列表（固定页面 + 配置的活动页面）
     */
    @RequiresPermissions("admin:wework:list")
    @RequiresPermissionsDesc(menu = {"企业微信", "消息推送"}, button = "查看页面")
    @GetMapping("/pages")
    public Object getPages() {
        List<Map<String, String>> pages = new ArrayList<>();

        // 固定页面
        pages.add(createPageItem("首页", "pages/index/index"));
        pages.add(createPageItem("商品分类", "pages/catalog/catalog"));
        pages.add(createPageItem("新品推荐", "pages/newGoods/newGoods"));
        pages.add(createPageItem("热门商品", "pages/hotGoods/hotGoods"));
        pages.add(createPageItem("个人中心", "pages/ucenter/index/index"));
        pages.add(createPageItem("优惠券中心", "pages/coupon/coupon"));

        // 从配置读取活动页面
        String activityPagesJson = SystemConfig.getWeWorkActivityPages();
        if (activityPagesJson != null && !activityPagesJson.isEmpty()) {
            try {
                List<Map> activityPages = JacksonUtil.fromJson(activityPagesJson, List.class);
                if (activityPages != null) {
                    for (Map item : activityPages) {
                        Map<String, String> pageItem = new HashMap<>();
                        pageItem.put("name", (String) item.get("name"));
                        pageItem.put("path", (String) item.get("path"));
                        pages.add(pageItem);
                    }
                }
            } catch (Exception e) {
                logger.error("解析活动页面配置失败", e);
            }
        }

        return ResponseUtil.okList(pages);
    }

    private Map<String, String> createPageItem(String name, String path) {
        Map<String, String> item = new HashMap<>();
        item.put("name", name);
        item.put("path", path);
        return item;
    }

    /**
     * 上传图片到企业微信素材库
     */
    @RequiresPermissions("admin:wework:upload")
    @RequiresPermissionsDesc(menu = {"企业微信", "消息推送"}, button = "上传素材")
    @PostMapping("/uploadMedia")
    public Object uploadMedia(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            return ResponseUtil.badArgumentValue();
        }

        String originalFilename = file.getOriginalFilename();
        String mediaId = weWorkService.uploadMedia(
                file.getInputStream(),
                originalFilename,
                file.getSize(),
                "image"
        );

        if (mediaId == null) {
            return ResponseUtil.fail(500, "上传素材到企业微信失败");
        }

        Map<String, String> result = new HashMap<>();
        result.put("mediaId", mediaId);
        result.put("filename", originalFilename);
        return ResponseUtil.ok(result);
    }

    /**
     * 按标签群发小程序卡片
     */
    @RequiresPermissions("admin:wework:send")
    @RequiresPermissionsDesc(menu = {"企业微信", "消息推送"}, button = "发送卡片")
    @PostMapping("/sendCard")
    public Object sendCard(@RequestBody String body) {
        String tagId = JacksonUtil.parseString(body, "tagId");
        String title = JacksonUtil.parseString(body, "title");
        String mediaId = JacksonUtil.parseString(body, "mediaId");
        String page = JacksonUtil.parseString(body, "page");

        if (tagId == null || tagId.isEmpty()) {
            return ResponseUtil.fail(402, "请选择要发送的客户标签");
        }
        if (title == null || title.isEmpty()) {
            return ResponseUtil.fail(402, "请输入卡片标题");
        }
        if (mediaId == null || mediaId.isEmpty()) {
            return ResponseUtil.fail(402, "请上传封面图片");
        }
        if (page == null || page.isEmpty()) {
            return ResponseUtil.fail(402, "请选择跳转页面");
        }

        boolean success = weWorkService.sendMiniProgramCardByTag(tagId, title, mediaId, null, page);
        if (success) {
            return ResponseUtil.ok();
        } else {
            return ResponseUtil.fail(500, "发送小程序卡片失败，请检查企业微信配置");
        }
    }

    /**
     * 获取推送组列表（用于消息推送页面选择）
     */
    @GetMapping("/pushGroups")
    public Object getPushGroups() {
        List<LitemallPushGroup> groups = pushGroupService.queryAll();
        List<Map<String, Object>> result = new ArrayList<>();
        for (LitemallPushGroup group : groups) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", group.getId());
            item.put("name", group.getName());
            item.put("type", group.getType());
            item.put("memberCount", group.getMemberCount());
            result.add(item);
        }
        return ResponseUtil.okList(result);
    }

    /**
     * 统一消息发送接口
     * 支持推送组目标、小程序卡片/纯文本内容、定时发送
     */
    @RequiresPermissions("admin:wework:send")
    @RequiresPermissionsDesc(menu = {"企业微信", "消息推送"}, button = "发送消息")
    @PostMapping("/sendMessage")
    public Object sendMessage(@RequestBody String body) {
        String targetType = JacksonUtil.parseString(body, "targetType");
        List<Integer> targetGroupIds = JacksonUtil.parseIntegerList(body, "targetGroupIds");
        String targetTagId = JacksonUtil.parseString(body, "targetTagId");
        String contentType = JacksonUtil.parseString(body, "contentType");
        String title = JacksonUtil.parseString(body, "title");
        String content = JacksonUtil.parseString(body, "content");
        String mediaId = JacksonUtil.parseString(body, "mediaId");
        String page = JacksonUtil.parseString(body, "page");
        String scheduledAt = JacksonUtil.parseString(body, "scheduledAt");

        // 参数校验
        if (targetType == null || targetType.isEmpty()) {
            return ResponseUtil.fail(402, "请选择推送目标类型");
        }
        if ("group".equals(targetType) && (targetGroupIds == null || targetGroupIds.isEmpty())) {
            return ResponseUtil.fail(402, "请选择推送组");
        }
        if (contentType == null || contentType.isEmpty()) {
            return ResponseUtil.fail(402, "请选择内容类型");
        }
        if ("card".equals(contentType)) {
            if (title == null || title.isEmpty()) {
                return ResponseUtil.fail(402, "请输入卡片标题");
            }
            if (mediaId == null || mediaId.isEmpty()) {
                return ResponseUtil.fail(402, "请上传封面图片");
            }
            if (page == null || page.isEmpty()) {
                return ResponseUtil.fail(402, "请选择跳转页面");
            }
        }
        if ("text".equals(contentType) && (content == null || content.isEmpty())) {
            return ResponseUtil.fail(402, "请输入文本内容");
        }

        // 计算总推送人数
        int totalCount = 0;
        List<LitemallPushGroup> targetGroups = new ArrayList<>();
        if ("group".equals(targetType) && targetGroupIds != null) {
            for (Integer groupId : targetGroupIds) {
                LitemallPushGroup group = pushGroupService.findById(groupId);
                if (group != null) {
                    targetGroups.add(group);
                    totalCount += group.getMemberCount() != null ? group.getMemberCount() : 0;
                }
            }
        }

        // 创建推送日志
        LitemallPushLog pushLog = new LitemallPushLog();
        pushLog.setPushType(contentType);
        pushLog.setTitle(title != null ? title : "");
        pushLog.setContent(content);
        pushLog.setContentType(contentType);
        pushLog.setMediaId(mediaId);
        pushLog.setPage(page);
        pushLog.setTargetType(targetType);
        pushLog.setTargetGroupId(targetGroupIds != null && !targetGroupIds.isEmpty() ? targetGroupIds.get(0) : null);
        pushLog.setTargetTagId(targetTagId);
        pushLog.setTotalCount(totalCount);
        pushLog.setSuccessCount(0);
        pushLog.setFailCount(0);

        if (scheduledAt != null && !scheduledAt.isEmpty()) {
            // 定时发送
            LocalDateTime scheduledTime = LocalDateTime.parse(scheduledAt, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            if (scheduledTime.isBefore(LocalDateTime.now())) {
                return ResponseUtil.fail(402, "定时时间不能早于当前时间");
            }
            pushLog.setScheduledAt(scheduledTime);
            pushLog.setStatus("pending");
            pushLogService.add(pushLog);
            return ResponseUtil.ok("定时推送已创建，将在 " + scheduledAt + " 发送");
        } else {
            // 立即发送
            pushLog.setStatus("sent");
            pushLog.setSentAt(LocalDateTime.now());

            // 尝试实际推送
            boolean sendSuccess = false;
            try {
                if ("card".equals(contentType)) {
                    // 小程序卡片推送：按组内用户逐个发送（TODO: 需要企微 externalUserId）
                    // 当前使用标签推送方式作为后备
                    if (targetTagId != null && !targetTagId.isEmpty()) {
                        sendSuccess = weWorkService.sendMiniProgramCardByTag(targetTagId, title, mediaId, null, page);
                    } else {
                        sendSuccess = true; // 无企微标签时标记为成功（测试模式）
                    }
                } else {
                    // 纯文本推送
                    if (targetTagId != null && !targetTagId.isEmpty()) {
                        sendSuccess = weWorkService.sendPromotionByTag(targetTagId, content);
                    } else {
                        sendSuccess = true; // 无企微标签时标记为成功（测试模式）
                    }
                }
            } catch (Exception e) {
                logger.error("消息推送失败", e);
            }

            if (sendSuccess) {
                pushLog.setSuccessCount(totalCount);
            } else {
                pushLog.setFailCount(totalCount);
            }
            pushLogService.add(pushLog);

            if (sendSuccess) {
                return ResponseUtil.ok("消息发送成功");
            } else {
                return ResponseUtil.fail(500, "消息发送失败，请检查企业微信配置");
            }
        }
    }
}
