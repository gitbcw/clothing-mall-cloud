package org.linlinjava.litemall.db.service;

import com.github.pagehelper.PageHelper;
import org.linlinjava.litemall.db.dao.LitemallPushLogMapper;
import org.linlinjava.litemall.db.domain.LitemallPushLog;
import org.linlinjava.litemall.db.domain.LitemallPushLogExample;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class LitemallPushLogService {
    @Resource
    private LitemallPushLogMapper pushLogMapper;

    /**
     * 查询所有待发送的定时推送
     */
    public List<LitemallPushLog> findPendingScheduled() {
        LitemallPushLogExample example = new LitemallPushLogExample();
        example.or()
            .andStatusEqualTo("pending")
            .andScheduledAtLessThanOrEqualTo(LocalDateTime.now())
            .andDeletedEqualTo(false);
        return pushLogMapper.selectByExample(example);
    }

    /**
     * 分页查询推送日志
     */
    public List<LitemallPushLog> querySelective(String status, Integer page, Integer size, String sort, String order) {
        LitemallPushLogExample example = new LitemallPushLogExample();
        LitemallPushLogExample.Criteria criteria = example.createCriteria();
        criteria.andDeletedEqualTo(false);

        if (status != null && !status.isEmpty()) {
            criteria.andStatusEqualTo(status);
        }

        if (sort != null && order != null) {
            example.setOrderByClause(sort + " " + order);
        } else {
            example.setOrderByClause("id desc");
        }

        PageHelper.startPage(page, size);
        return pushLogMapper.selectByExample(example);
    }

    /**
     * 根据ID查询
     */
    public LitemallPushLog findById(Integer id) {
        return pushLogMapper.selectByPrimaryKey(id);
    }

    /**
     * 添加推送日志
     */
    public int add(LitemallPushLog log) {
        log.setAddTime(LocalDateTime.now());
        log.setUpdateTime(LocalDateTime.now());
        return pushLogMapper.insertSelective(log);
    }

    /**
     * 更新推送日志
     */
    public int updateById(LitemallPushLog log) {
        log.setUpdateTime(LocalDateTime.now());
        return pushLogMapper.updateByPrimaryKeySelective(log);
    }

    /**
     * 删除推送日志
     */
    public void deleteById(Integer id) {
        pushLogMapper.logicalDeleteByPrimaryKey(id);
    }

    /**
     * 检查指定分组是否有待发送的推送日志
     */
    public boolean hasPendingLogsByGroupId(Integer groupId) {
        LitemallPushLogExample example = new LitemallPushLogExample();
        example.or()
            .andStatusIn(java.util.Arrays.asList("pending", "sending"))
            .andDeletedEqualTo(false);
        List<LitemallPushLog> logs = pushLogMapper.selectByExample(example);
        // 手动过滤 targetGroupId
        return logs.stream().anyMatch(log -> groupId.equals(log.getTargetGroupId()));
    }

    /**
     * 尝试锁定推送日志（使用乐观锁）
     * 将 pending 状态更新为 sending，只有成功更新的才能执行推送
     * @return 是否成功锁定
     */
    public boolean tryLockForSending(Integer logId) {
        LitemallPushLog log = pushLogMapper.selectByPrimaryKey(logId);
        if (log == null || !"pending".equals(log.getStatus())) {
            return false;
        }
        // 使用 CAS 方式更新
        log.setStatus("sending");
        log.setUpdateTime(LocalDateTime.now());
        return pushLogMapper.updateByPrimaryKeySelective(log) > 0;
    }
}
