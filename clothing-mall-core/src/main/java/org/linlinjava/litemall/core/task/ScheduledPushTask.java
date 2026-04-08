package org.linlinjava.litemall.core.task;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.linlinjava.litemall.core.system.WeWorkService;
import org.linlinjava.litemall.db.domain.LitemallPushGroup;
import org.linlinjava.litemall.db.domain.LitemallPushLog;
import org.linlinjava.litemall.db.service.LitemallPushGroupService;
import org.linlinjava.litemall.db.service.LitemallPushLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 定时推送任务
 * 每分钟检查一次待发送的定时推送
 * 使用乐观锁确保多实例部署时不会重复执行
 */
@Component
public class ScheduledPushTask {
    private final Log logger = LogFactory.getLog(ScheduledPushTask.class);

    private static final int MAX_RETRY = 3;

    @Autowired
    private LitemallPushLogService pushLogService;

    @Autowired
    private LitemallPushGroupService pushGroupService;

    @Autowired
    private WeWorkService weWorkService;

    /**
     * 每分钟执行一次，检查待发送的定时推送
     */
    @Scheduled(cron = "0 * * * * ?")
    public void checkScheduledPush() {
        try {
            List<LitemallPushLog> pendingPushList = pushLogService.findPendingScheduled();

            if (pendingPushList.isEmpty()) {
                return;
            }

            logger.info("发现 " + pendingPushList.size() + " 条待发送的定时推送");

            for (LitemallPushLog pushLog : pendingPushList) {
                try {
                    if (!pushLogService.tryLockForSending(pushLog.getId())) {
                        logger.debug("推送任务已被其他实例锁定: " + pushLog.getTitle());
                        continue;
                    }

                    executePush(pushLog);

                } catch (Exception e) {
                    logger.error("定时推送发送失败: " + pushLog.getTitle(), e);
                    pushLog.setStatus("failed");
                    pushLog.setErrorMsg(e.getMessage());
                    pushLog.setUpdateTime(LocalDateTime.now());
                    pushLogService.updateById(pushLog);
                }
            }
        } catch (Exception e) {
            logger.error("定时推送任务执行失败", e);
        }
    }

    /**
     * 执行实际推送逻辑
     */
    private void executePush(LitemallPushLog pushLog) {
        int successCount = 0;
        int failCount = 0;
        String errorMsg = null;

        // 获取目标推送组信息
        if ("group".equals(pushLog.getTargetType()) && pushLog.getTargetGroupId() != null) {
            LitemallPushGroup group = pushGroupService.findById(pushLog.getTargetGroupId());
            if (group != null && group.getUserIds() != null) {
                try {
                    boolean success;
                    if ("card".equals(pushLog.getContentType())) {
                        // 小程序卡片推送
                        success = weWorkService.sendMiniProgramCardByTag(
                                pushLog.getTargetTagId() != null ? pushLog.getTargetTagId() : "",
                                pushLog.getTitle(),
                                pushLog.getMediaId(),
                                null,
                                pushLog.getPage()
                        );
                    } else {
                        // 纯文本推送
                        success = weWorkService.sendPromotionByTag(
                                pushLog.getTargetTagId() != null ? pushLog.getTargetTagId() : "",
                                pushLog.getContent()
                        );
                    }

                    if (success) {
                        successCount = pushLog.getTotalCount() != null ? pushLog.getTotalCount() : 0;
                    } else {
                        failCount = pushLog.getTotalCount() != null ? pushLog.getTotalCount() : 0;
                        errorMsg = "企微推送接口返回失败";
                    }
                } catch (Exception e) {
                    failCount = pushLog.getTotalCount() != null ? pushLog.getTotalCount() : 0;
                    errorMsg = e.getMessage();
                    logger.error("推送执行异常", e);
                }
            } else {
                // 推送组不存在或无用户
                successCount = 0;
                failCount = 0;
            }
        } else {
            // 非组目标，直接按标签推送
            try {
                boolean success;
                if ("card".equals(pushLog.getContentType())) {
                    success = weWorkService.sendMiniProgramCardByTag(
                            pushLog.getTargetTagId() != null ? pushLog.getTargetTagId() : "",
                            pushLog.getTitle(),
                            pushLog.getMediaId(),
                            null,
                            pushLog.getPage()
                    );
                } else {
                    success = weWorkService.sendPromotionByTag(
                            pushLog.getTargetTagId() != null ? pushLog.getTargetTagId() : "",
                            pushLog.getContent()
                    );
                }

                if (success) {
                    successCount = pushLog.getTotalCount() != null ? pushLog.getTotalCount() : 1;
                } else {
                    failCount = pushLog.getTotalCount() != null ? pushLog.getTotalCount() : 1;
                    errorMsg = "企微推送接口返回失败";
                }
            } catch (Exception e) {
                failCount = pushLog.getTotalCount() != null ? pushLog.getTotalCount() : 1;
                errorMsg = e.getMessage();
                logger.error("推送执行异常", e);
            }
        }

        // 更新推送结果
        pushLog.setStatus(failCount > 0 && successCount == 0 ? "failed" : "sent");
        pushLog.setSuccessCount(successCount);
        pushLog.setFailCount(failCount);
        pushLog.setErrorMsg(errorMsg);
        pushLog.setSentAt(LocalDateTime.now());
        pushLog.setUpdateTime(LocalDateTime.now());
        pushLogService.updateById(pushLog);

        logger.info("定时推送执行完成: " + pushLog.getTitle() + ", 成功=" + successCount + ", 失败=" + failCount);
    }
}
