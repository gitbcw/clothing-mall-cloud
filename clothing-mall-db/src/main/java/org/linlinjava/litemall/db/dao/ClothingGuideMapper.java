package org.linlinjava.litemall.db.dao;

import org.linlinjava.litemall.db.domain.ClothingGuide;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface ClothingGuideMapper {

    int insert(ClothingGuide record);

    int insertSelective(ClothingGuide record);

    int deleteByPrimaryKey(Integer id);

    int updateByPrimaryKeySelective(ClothingGuide record);

    int updateByPrimaryKey(ClothingGuide record);

    ClothingGuide selectByPrimaryKey(Integer id);

    List<ClothingGuide> selectSelective(ClothingGuide record);

    int countSelective(ClothingGuide record);

    ClothingGuide selectByPhone(@Param("phone") String phone);
}
