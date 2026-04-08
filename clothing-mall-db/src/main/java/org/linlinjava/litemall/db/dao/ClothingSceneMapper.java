package org.linlinjava.litemall.db.dao;

import org.linlinjava.litemall.db.domain.ClothingScene;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface ClothingSceneMapper {

    int insert(ClothingScene record);

    int insertSelective(ClothingScene record);

    int deleteByPrimaryKey(Integer id);

    int updateByPrimaryKeySelective(ClothingScene record);

    int updateByPrimaryKey(ClothingScene record);

    ClothingScene selectByPrimaryKey(Integer id);

    List<ClothingScene> selectAll();

    List<ClothingScene> selectByEnabled(@Param("enabled") Boolean enabled);

    ClothingScene selectByName(@Param("name") String name);

    List<ClothingScene> selectBannerScenes();
}
