package org.linlinjava.litemall.db.dao;

import org.linlinjava.litemall.db.domain.LitemallPushLog;
import org.linlinjava.litemall.db.domain.LitemallPushLogExample;
import java.util.List;

public interface LitemallPushLogMapper {
    long countByExample(LitemallPushLogExample example);

    int deleteByExample(LitemallPushLogExample example);

    int deleteByPrimaryKey(Integer id);

    int insert(LitemallPushLog record);

    int insertSelective(LitemallPushLog record);

    List<LitemallPushLog> selectByExample(LitemallPushLogExample example);

    LitemallPushLog selectByPrimaryKey(Integer id);

    int updateByExampleSelective(LitemallPushLog record, LitemallPushLogExample example);

    int updateByExample(LitemallPushLog record, LitemallPushLogExample example);

    int updateByPrimaryKeySelective(LitemallPushLog record);

    int updateByPrimaryKey(LitemallPushLog record);

    void logicalDeleteByPrimaryKey(Integer id);

    void logicalDeleteByExample(LitemallPushLogExample example);
}
