package org.linlinjava.litemall.db.dao;

import org.linlinjava.litemall.db.domain.ClothingHoliday;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDate;
import java.util.List;

public interface ClothingHolidayMapper {

    int insertSelective(ClothingHoliday record);

    int deleteByPrimaryKey(Integer id);

    int updateByPrimaryKeySelective(ClothingHoliday record);

    ClothingHoliday selectByPrimaryKey(Integer id);

    List<ClothingHoliday> selectAll();

    List<ClothingHoliday> selectByEnabled(@Param("enabled") Boolean enabled);

    List<ClothingHoliday> selectActive(@Param("date") LocalDate date);
}
