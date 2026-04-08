package org.linlinjava.litemall.db.service;

import org.linlinjava.litemall.db.dao.ClothingHolidayGoodsMapper;
import org.linlinjava.litemall.db.domain.ClothingHolidayGoods;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.util.ArrayList;
import java.util.List;

@Service
public class ClothingHolidayGoodsService {

    @Resource
    private ClothingHolidayGoodsMapper holidayGoodsMapper;

    public List<Integer> queryGoodsIdsByHolidayId(Integer holidayId) {
        return holidayGoodsMapper.selectGoodsIdsByHolidayId(holidayId);
    }

    @Transactional
    public void updateHolidayGoods(Integer holidayId, List<Integer> goodsIds) {
        holidayGoodsMapper.deleteByHolidayId(holidayId);
        if (goodsIds != null && !goodsIds.isEmpty()) {
            List<ClothingHolidayGoods> list = new ArrayList<>();
            for (Integer goodsId : goodsIds) {
                ClothingHolidayGoods record = new ClothingHolidayGoods();
                record.setHolidayId(holidayId);
                record.setGoodsId(goodsId);
                list.add(record);
            }
            holidayGoodsMapper.batchInsert(list);
        }
    }
}
