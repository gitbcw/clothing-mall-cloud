package org.linlinjava.litemall.db.dao;

import org.linlinjava.litemall.db.domain.LitemallPushGroup;
import org.linlinjava.litemall.db.domain.LitemallPushGroupExample;
import java.util.List;

public interface LitemallPushGroupMapper {
    long countByExample(LitemallPushGroupExample example);

    int deleteByExample(LitemallPushGroupExample example);

    int deleteByPrimaryKey(Integer id);

    int insert(LitemallPushGroup record);

    int insertSelective(LitemallPushGroup record);

    List<LitemallPushGroup> selectByExample(LitemallPushGroupExample example);

    LitemallPushGroup selectByPrimaryKey(Integer id);

    int updateByExampleSelective(LitemallPushGroup record, LitemallPushGroupExample example);

    int updateByExample(LitemallPushGroup record, LitemallPushGroupExample example);

    int updateByPrimaryKeySelective(LitemallPushGroup record);

    int updateByPrimaryKey(LitemallPushGroup record);

    void logicalDeleteByPrimaryKey(Integer id);

    void logicalDeleteByExample(LitemallPushGroupExample example);
}
