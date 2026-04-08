package org.linlinjava.litemall.wx.web;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.linlinjava.litemall.core.util.JacksonUtil;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.domain.LitemallTrackerEvent;
import org.linlinjava.litemall.db.service.LitemallTrackerEventService;
import org.linlinjava.litemall.wx.annotation.LoginUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.RejectedExecutionHandler;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

/**
 * 埋点数据上报服务
 * <p>
 * 支持匿名访问（userId 可为 null）
 */
@RestController
@RequestMapping("/wx/tracker")
@Validated
public class WxTrackerController {
    private final Log logger = LogFactory.getLog(WxTrackerController.class);

    @Autowired
    private LitemallTrackerEventService trackerEventService;

    private final static ArrayBlockingQueue<Runnable> WORK_QUEUE = new ArrayBlockingQueue<>(100);
    private final static RejectedExecutionHandler HANDLER = new ThreadPoolExecutor.CallerRunsPolicy();
    private static ThreadPoolExecutor executorService = new ThreadPoolExecutor(4, 8, 60, TimeUnit.SECONDS, WORK_QUEUE, HANDLER);

    private static final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 埋点数据上报
     * <p>
     * 接收前端上报的埋点事件列表，异步批量写入数据库
     *
     * @param userId 用户ID（可为 null，表示匿名用户）
     * @param body   请求内容，格式：{ events: [...] }
     * @return 上报结果
     */
    @PostMapping("report")
    public Object report(@LoginUser Integer userId, @RequestBody String body) {
        if (body == null) {
            return ResponseUtil.badArgument();
        }

        Map<String, Object> params;
        try {
            params = objectMapper.readValue(body, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return ResponseUtil.badArgument();
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> eventList = (List<Map<String, Object>>) params.get("events");
        if (eventList == null || eventList.isEmpty()) {
            return ResponseUtil.ok();
        }

        // 异步处理埋点数据
        final Integer finalUserId = userId;
        executorService.execute(() -> {
            try {
                List<LitemallTrackerEvent> events = new ArrayList<>(eventList.size());
                for (Map<String, Object> eventMap : eventList) {
                    LitemallTrackerEvent event = new LitemallTrackerEvent();

                    // 优先使用登录用户的 userId
                    if (finalUserId != null) {
                        event.setUserId(finalUserId);
                    } else {
                        // 尝试从事件数据中获取 userId
                        @SuppressWarnings("unchecked")
                        Map<String, Object> user = (Map<String, Object>) eventMap.get("user");
                        if (user != null && user.get("userId") != null) {
                            try {
                                event.setUserId(Integer.valueOf(user.get("userId").toString()));
                            } catch (NumberFormatException ignored) {
                            }
                        }
                    }

                    event.setEventType((String) eventMap.get("type"));

                    // 事件数据序列化为 JSON
                    @SuppressWarnings("unchecked")
                    Map<String, Object> data = (Map<String, Object>) eventMap.get("data");
                    if (data != null) {
                        event.setEventData(JacksonUtil.toJson(data));
                    }

                    event.setPageRoute((String) eventMap.get("page"));

                    // 设备信息序列化为 JSON
                    @SuppressWarnings("unchecked")
                    Map<String, Object> device = (Map<String, Object>) eventMap.get("device");
                    if (device != null) {
                        event.setDeviceInfo(JacksonUtil.toJson(device));
                    }

                    Object timestamp = eventMap.get("timestamp");
                    if (timestamp != null) {
                        try {
                            event.setTimestamp(Long.valueOf(timestamp.toString()));
                        } catch (NumberFormatException ignored) {
                        }
                    }

                    events.add(event);
                }

                trackerEventService.batchInsert(events);
            } catch (Exception e) {
                logger.error("埋点数据处理失败", e);
            }
        });

        return ResponseUtil.ok();
    }
}
