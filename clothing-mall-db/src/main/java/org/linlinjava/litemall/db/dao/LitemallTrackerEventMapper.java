package org.linlinjava.litemall.db.dao;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import org.linlinjava.litemall.db.domain.LitemallTrackerEvent;
import org.linlinjava.litemall.db.domain.LitemallTrackerEventExample;

public interface LitemallTrackerEventMapper {
    long countByExample(LitemallTrackerEventExample example);

    int deleteByExample(LitemallTrackerEventExample example);

    int deleteByPrimaryKey(Long id);

    int insert(LitemallTrackerEvent record);

    int insertSelective(LitemallTrackerEvent record);

    List<LitemallTrackerEvent> selectByExample(LitemallTrackerEventExample example);

    LitemallTrackerEvent selectByPrimaryKey(Long id);

    int updateByExampleSelective(@Param("record") LitemallTrackerEvent record, @Param("example") LitemallTrackerEventExample example);

    int updateByExample(@Param("record") LitemallTrackerEvent record, @Param("example") LitemallTrackerEventExample example);

    int updateByPrimaryKeySelective(LitemallTrackerEvent record);

    int updateByPrimaryKey(LitemallTrackerEvent record);

    int logicalDeleteByExample(@Param("example") LitemallTrackerEventExample example);

    int logicalDeleteByPrimaryKey(Long id);

    /**
     * 批量插入埋点事件
     */
    int batchInsert(@Param("list") List<LitemallTrackerEvent> list);
}
