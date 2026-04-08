package org.linlinjava.litemall.db.service;

import org.linlinjava.litemall.db.dao.ClothingGoodsSceneMapper;
import org.linlinjava.litemall.db.domain.ClothingGoodsScene;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.util.ArrayList;
import java.util.List;

@Service
public class ClothingGoodsSceneService {

    @Resource
    private ClothingGoodsSceneMapper goodsSceneMapper;

    public List<ClothingGoodsScene> queryBySceneId(Integer sceneId) {
        return goodsSceneMapper.selectBySceneId(sceneId);
    }

    public List<Integer> queryGoodsIdsBySceneId(Integer sceneId) {
        return goodsSceneMapper.selectGoodsIdsBySceneId(sceneId);
    }

    @Transactional
    public void updateSceneGoods(Integer sceneId, List<Integer> goodsIds) {
        goodsSceneMapper.deleteBySceneId(sceneId);
        if (goodsIds != null && !goodsIds.isEmpty()) {
            List<ClothingGoodsScene> list = new ArrayList<>();
            for (Integer goodsId : goodsIds) {
                ClothingGoodsScene record = new ClothingGoodsScene();
                record.setSceneId(sceneId);
                record.setGoodsId(goodsId);
                list.add(record);
            }
            goodsSceneMapper.batchInsert(list);
        }
    }

    @Transactional
    public void addGoodsToScene(Integer sceneId, List<Integer> goodsIds) {
        if (goodsIds != null && !goodsIds.isEmpty()) {
            List<ClothingGoodsScene> list = new ArrayList<>();
            for (Integer goodsId : goodsIds) {
                ClothingGoodsScene record = new ClothingGoodsScene();
                record.setSceneId(sceneId);
                record.setGoodsId(goodsId);
                list.add(record);
            }
            goodsSceneMapper.batchInsert(list);
        }
    }

    public void removeGoodsFromScene(Integer sceneId, Integer goodsId) {
        goodsSceneMapper.deleteBySceneIdAndGoodsId(sceneId, goodsId);
    }
}
