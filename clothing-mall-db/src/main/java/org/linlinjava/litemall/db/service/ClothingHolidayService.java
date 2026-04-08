package org.linlinjava.litemall.db.service;

import org.linlinjava.litemall.db.dao.ClothingHolidayMapper;
import org.linlinjava.litemall.db.domain.ClothingHoliday;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.time.LocalDate;
import java.util.List;

@Service
public class ClothingHolidayService {

    @Resource
    private ClothingHolidayMapper holidayMapper;

    /**
     * 查询所有节日
     */
    public List<ClothingHoliday> queryAll() {
        return holidayMapper.selectAll();
    }

    /**
     * 查询启用的节日
     */
    public List<ClothingHoliday> queryEnabled() {
        return holidayMapper.selectByEnabled(true);
    }

    /**
     * 查询当前活跃的节日
     */
    public List<ClothingHoliday> queryActive() {
        return holidayMapper.selectActive(LocalDate.now());
    }

    /**
     * 根据ID查询
     */
    public ClothingHoliday findById(Integer id) {
        return holidayMapper.selectByPrimaryKey(id);
    }

    /**
     * 添加节日
     */
    public int add(ClothingHoliday holiday) {
        return holidayMapper.insertSelective(holiday);
    }

    /**
     * 更新节日
     */
    public int update(ClothingHoliday holiday) {
        return holidayMapper.updateByPrimaryKeySelective(holiday);
    }

    /**
     * 删除节日
     */
    public int delete(Integer id) {
        return holidayMapper.deleteByPrimaryKey(id);
    }
}
