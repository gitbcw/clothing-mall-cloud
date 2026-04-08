package org.linlinjava.litemall.db.dao;

import org.apache.ibatis.annotations.Param;
import org.linlinjava.litemall.db.domain.ClothingGoodsScene;
import java.util.List;

public interface ClothingGoodsSceneMapper {
    int insert(ClothingGoodsScene record);
    int deleteBySceneIdAndGoodsId(@Param("sceneId") Integer sceneId, @Param("goodsId") Integer goodsId);
    int deleteBySceneId(@Param("sceneId") Integer sceneId);
    List<ClothingGoodsScene> selectBySceneId(@Param("sceneId") Integer sceneId);
    List<Integer> selectGoodsIdsBySceneId(@Param("sceneId") Integer sceneId);
    int batchInsert(@Param("list") List<ClothingGoodsScene> list);
}
