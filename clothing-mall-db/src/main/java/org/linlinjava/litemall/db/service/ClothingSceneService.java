package org.linlinjava.litemall.db.service;

import org.linlinjava.litemall.db.dao.ClothingSceneMapper;
import org.linlinjava.litemall.db.domain.ClothingScene;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.List;

@Service
public class ClothingSceneService {

    @Resource
    private ClothingSceneMapper sceneMapper;

    /**
     * 查询所有场景
     */
    public List<ClothingScene> queryAll() {
        return sceneMapper.selectAll();
    }

    /**
     * 查询启用的场景
     */
    public List<ClothingScene> queryEnabled() {
        return sceneMapper.selectByEnabled(true);
    }

    /**
     * 根据ID查询
     */
    public ClothingScene findById(Integer id) {
        return sceneMapper.selectByPrimaryKey(id);
    }

    /**
     * 根据名称查询
     */
    public ClothingScene findByName(String name) {
        return sceneMapper.selectByName(name);
    }

    /**
     * 查询可用于轮播图展示的场景（有海报图且启用）
     */
    public List<ClothingScene> queryBannerScenes() {
        return sceneMapper.selectBannerScenes();
    }

    /**
     * 添加场景
     */
    public int add(ClothingScene scene) {
        return sceneMapper.insertSelective(scene);
    }

    /**
     * 更新场景
     */
    public int update(ClothingScene scene) {
        return sceneMapper.updateByPrimaryKeySelective(scene);
    }

    /**
     * 删除场景
     */
    public int delete(Integer id) {
        return sceneMapper.deleteByPrimaryKey(id);
    }
}
