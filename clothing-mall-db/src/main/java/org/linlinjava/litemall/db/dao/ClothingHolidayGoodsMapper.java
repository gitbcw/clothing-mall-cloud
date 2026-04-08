package org.linlinjava.litemall.db.dao;

import org.apache.ibatis.annotations.Param;
import org.linlinjava.litemall.db.domain.ClothingHolidayGoods;

import java.util.List;

public interface ClothingHolidayGoodsMapper {

    int insert(ClothingHolidayGoods record);

    int batchInsert(@Param("list") List<ClothingHolidayGoods> list);

    int deleteByHolidayId(@Param("holidayId") Integer holidayId);

    List<Integer> selectGoodsIdsByHolidayId(@Param("holidayId") Integer holidayId);
}
