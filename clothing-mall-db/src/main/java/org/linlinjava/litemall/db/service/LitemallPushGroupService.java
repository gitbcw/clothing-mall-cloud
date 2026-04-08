package org.linlinjava.litemall.db.service;

import com.github.pagehelper.PageHelper;
import org.linlinjava.litemall.db.dao.LitemallPushGroupMapper;
import org.linlinjava.litemall.db.domain.LitemallPushGroup;
import org.linlinjava.litemall.db.domain.LitemallPushGroupExample;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class LitemallPushGroupService {
    @Resource
    private LitemallPushGroupMapper pushGroupMapper;

    public List<LitemallPushGroup> queryAll() {
        LitemallPushGroupExample example = new LitemallPushGroupExample();
        example.or().andDeletedEqualTo(false);
        example.setOrderByClause("id asc");
        return pushGroupMapper.selectByExample(example);
    }

    public List<LitemallPushGroup> querySelective(String name, String type, Integer page, Integer size, String sort, String order) {
        LitemallPushGroupExample example = new LitemallPushGroupExample();
        LitemallPushGroupExample.Criteria criteria = example.createCriteria();
        criteria.andDeletedEqualTo(false);

        if (!StringUtils.isEmpty(name)) {
            criteria.andNameLike("%" + name + "%");
        }
        if (!StringUtils.isEmpty(type)) {
            criteria.andTypeEqualTo(type);
        }

        if (!StringUtils.isEmpty(sort) && !StringUtils.isEmpty(order)) {
            example.setOrderByClause(sort + " " + order);
        }

        PageHelper.startPage(page, size);
        return pushGroupMapper.selectByExample(example);
    }

    public LitemallPushGroup findById(Integer id) {
        return pushGroupMapper.selectByPrimaryKey(id);
    }

    public LitemallPushGroup findByType(String type) {
        LitemallPushGroupExample example = new LitemallPushGroupExample();
        example.or().andTypeEqualTo(type).andDeletedEqualTo(false);
        List<LitemallPushGroup> list = pushGroupMapper.selectByExample(example);
        return list.isEmpty() ? null : list.get(0);
    }

    public int add(LitemallPushGroup group) {
        group.setAddTime(LocalDateTime.now());
        group.setUpdateTime(LocalDateTime.now());
        return pushGroupMapper.insertSelective(group);
    }

    public int updateById(LitemallPushGroup group) {
        group.setUpdateTime(LocalDateTime.now());
        return pushGroupMapper.updateByPrimaryKeySelective(group);
    }

    /**
     * 带乐观锁的更新方法
     * 检查数据是否在读取后被其他请求修改
     * @param group 包含 id, updateTime（原始值）, 和要更新的字段
     * @return 更新成功返回 1，数据已被修改返回 0
     */
    public int updateByIdWithOptimisticLock(LitemallPushGroup group) {
        // 先查询当前数据
        LitemallPushGroup existing = pushGroupMapper.selectByPrimaryKey(group.getId());
        if (existing == null || existing.getDeleted()) {
            throw new RuntimeException("数据不存在");
        }

        // 检查 updateTime 是否变化
        if (group.getUpdateTime() != null && !group.getUpdateTime().equals(existing.getUpdateTime())) {
            throw new RuntimeException("数据已被其他请求修改，请刷新后重试");
        }

        LocalDateTime now = LocalDateTime.now();
        group.setUpdateTime(now);
        return pushGroupMapper.updateByPrimaryKeySelective(group);
    }

    public void deleteById(Integer id) {
        pushGroupMapper.logicalDeleteByPrimaryKey(id);
    }

    public void updateMemberCount(Integer id, Integer count) {
        LitemallPushGroup group = new LitemallPushGroup();
        group.setId(id);
        group.setMemberCount(count);
        group.setLastUpdated(LocalDateTime.now());
        group.setUpdateTime(LocalDateTime.now());
        pushGroupMapper.updateByPrimaryKeySelective(group);
    }
}
