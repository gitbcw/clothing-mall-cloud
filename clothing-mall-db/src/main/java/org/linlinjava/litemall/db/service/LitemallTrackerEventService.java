package org.linlinjava.litemall.db.service;

import org.linlinjava.litemall.db.dao.LitemallTrackerEventMapper;
import org.linlinjava.litemall.db.domain.LitemallTrackerEvent;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class LitemallTrackerEventService {

    @Resource
    private LitemallTrackerEventMapper trackerEventMapper;

    /**
     * 批量插入埋点事件
     */
    public void batchInsert(List<LitemallTrackerEvent> events) {
        if (events == null || events.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        for (LitemallTrackerEvent event : events) {
            event.setServerTime(now);
            event.setAddTime(now);
            event.setUpdateTime(now);
            event.setDeleted(false);
        }

        trackerEventMapper.batchInsert(events);
    }

    /**
     * 单条插入埋点事件
     */
    public void add(LitemallTrackerEvent event) {
        LocalDateTime now = LocalDateTime.now();
        event.setServerTime(now);
        event.setAddTime(now);
        event.setUpdateTime(now);
        event.setDeleted(false);
        trackerEventMapper.insertSelective(event);
    }
}
