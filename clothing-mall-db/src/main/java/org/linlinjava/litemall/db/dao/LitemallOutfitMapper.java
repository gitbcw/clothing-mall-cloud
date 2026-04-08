package org.linlinjava.litemall.db.dao;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import org.linlinjava.litemall.db.domain.LitemallOutfit;
import org.linlinjava.litemall.db.domain.LitemallOutfitExample;

public interface LitemallOutfitMapper {
    long countByExample(LitemallOutfitExample example);

    int deleteByExample(LitemallOutfitExample example);

    int deleteByPrimaryKey(Integer id);

    int insert(LitemallOutfit record);

    int insertSelective(LitemallOutfit record);

    LitemallOutfit selectOneByExample(LitemallOutfitExample example);

    LitemallOutfit selectOneByExampleSelective(@Param("example") LitemallOutfitExample example, @Param("selective") LitemallOutfit.Column ... selective);

    List<LitemallOutfit> selectByExampleSelective(@Param("example") LitemallOutfitExample example, @Param("selective") LitemallOutfit.Column ... selective);

    List<LitemallOutfit> selectByExample(LitemallOutfitExample example);

    LitemallOutfit selectByPrimaryKeySelective(@Param("id") Integer id, @Param("selective") LitemallOutfit.Column ... selective);

    LitemallOutfit selectByPrimaryKey(Integer id);

    LitemallOutfit selectByPrimaryKeyWithLogicalDelete(@Param("id") Integer id, @Param("andLogicalDeleted") boolean andLogicalDeleted);

    int updateByExampleSelective(@Param("record") LitemallOutfit record, @Param("example") LitemallOutfitExample example);

    int updateByExample(@Param("record") LitemallOutfit record, @Param("example") LitemallOutfitExample example);

    int updateByPrimaryKeySelective(LitemallOutfit record);

    int updateByPrimaryKey(LitemallOutfit record);

    int logicalDeleteByExample(@Param("example") LitemallOutfitExample example);

    int logicalDeleteByPrimaryKey(Integer id);
}
