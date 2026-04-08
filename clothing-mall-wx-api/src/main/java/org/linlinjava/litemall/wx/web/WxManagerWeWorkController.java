package org.linlinjava.litemall.wx.web;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.linlinjava.litemall.core.system.SystemConfig;
import org.linlinjava.litemall.core.system.WeWorkService;
import org.linlinjava.litemall.core.util.JacksonUtil;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.domain.LitemallPushGroup;
import org.linlinjava.litemall.db.domain.LitemallPushLog;
import org.linlinjava.litemall.db.domain.LitemallUser;
import org.linlinjava.litemall.db.service.LitemallPushGroupService;
import org.linlinjava.litemall.db.service.LitemallPushLogService;
import org.linlinjava.litemall.db.service.LitemallUserService;
import org.linlinjava.litemall.wx.annotation.LoginUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * 小程序管理端企微消息推送控制器
 */
@RestController
@RequestMapping("/wx/manager/wework")
@Validated
public class WxManagerWeWorkController {
    private final Log logger = LogFactory.getLog(WxManagerWeWorkController.class);

    @Autowired
    private WeWorkService weWorkService;

    @Autowired
    private LitemallPushGroupService pushGroupService;

    @Autowired
    private LitemallPushLogService pushLogService;

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

    @GetMapping("/tags")
    public Object getTags(@LoginUser Integer userId) {
        Object error = checkManager(userId);
        if (error != null) return error;

        List<Map<String, Object>> tags = weWorkService.getCorpTagList();
        if (tags == null) {
            return ResponseUtil.fail(500, "获取企业微信标签列表失败，请检查企业微信配置");
        }
        return ResponseUtil.okList(tags);
    }

    @GetMapping("/pages")
    public Object getPages(@LoginUser Integer userId) {
        Object error = checkManager(userId);
        if (error != null) return error;

        List<Map<String, String>> pages = new ArrayList<>();
        pages.add(createPageItem("首页", "pages/index/index"));
        pages.add(createPageItem("商品分类", "pages/catalog/catalog"));
        pages.add(createPageItem("新品推荐", "pages/newGoods/newGoods"));
        pages.add(createPageItem("热门商品", "pages/hotGoods/hotGoods"));
        pages.add(createPageItem("个人中心", "pages/ucenter/index/index"));
        pages.add(createPageItem("优惠券中心", "pages/coupon/coupon"));

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

    @PostMapping("/uploadMedia")
    public Object uploadMedia(@LoginUser Integer userId, @RequestParam("file") MultipartFile file) throws IOException {
        Object error = checkManager(userId);
        if (error != null) return error;

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

    @PostMapping("/sendCard")
    public Object sendCard(@LoginUser Integer userId, @RequestBody String body) {
        Object error = checkManager(userId);
        if (error != null) return error;

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

    @GetMapping("/pushGroups")
    public Object getPushGroups(@LoginUser Integer userId) {
        Object error = checkManager(userId);
        if (error != null) return error;

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

    @PostMapping("/sendMessage")
    public Object sendMessage(@LoginUser Integer userId, @RequestBody String body) {
        Object error = checkManager(userId);
        if (error != null) return error;

        String targetType = JacksonUtil.parseString(body, "targetType");
        List<Integer> targetGroupIds = JacksonUtil.parseIntegerList(body, "targetGroupIds");
        String targetTagId = JacksonUtil.parseString(body, "targetTagId");
        String contentType = JacksonUtil.parseString(body, "contentType");
        String title = JacksonUtil.parseString(body, "title");
        String content = JacksonUtil.parseString(body, "content");
        String mediaId = JacksonUtil.parseString(body, "mediaId");
        String page = JacksonUtil.parseString(body, "page");
        String scheduledAt = JacksonUtil.parseString(body, "scheduledAt");

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
            LocalDateTime scheduledTime = LocalDateTime.parse(scheduledAt, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            if (scheduledTime.isBefore(LocalDateTime.now())) {
                return ResponseUtil.fail(402, "定时时间不能早于当前时间");
            }
            pushLog.setScheduledAt(scheduledTime);
            pushLog.setStatus("pending");
            pushLogService.add(pushLog);
            return ResponseUtil.ok("定时推送已创建，将在 " + scheduledAt + " 发送");
        } else {
            pushLog.setStatus("sent");
            pushLog.setSentAt(LocalDateTime.now());

            boolean sendSuccess = false;
            try {
                if ("card".equals(contentType)) {
                    if (targetTagId != null && !targetTagId.isEmpty()) {
                        sendSuccess = weWorkService.sendMiniProgramCardByTag(targetTagId, title, mediaId, null, page);
                    } else {
                        sendSuccess = true;
                    }
                } else {
                    if (targetTagId != null && !targetTagId.isEmpty()) {
                        sendSuccess = weWorkService.sendPromotionByTag(targetTagId, content);
                    } else {
                        sendSuccess = true;
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
