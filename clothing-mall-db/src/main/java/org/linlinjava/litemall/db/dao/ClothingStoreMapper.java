package org.linlinjava.litemall.db.dao;

import org.linlinjava.litemall.db.domain.ClothingStore;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface ClothingStoreMapper {

    int insert(ClothingStore record);

    int insertSelective(ClothingStore record);

    int deleteByPrimaryKey(Integer id);

    int updateByPrimaryKeySelective(ClothingStore record);

    int updateByPrimaryKey(ClothingStore record);

    ClothingStore selectByPrimaryKey(Integer id);

    List<ClothingStore> selectAll();

    List<ClothingStore> selectSelective(ClothingStore record);

    int countSelective(ClothingStore record);
}
