package org.linlinjava.litemall.db.service;

import com.github.pagehelper.PageHelper;
import org.linlinjava.litemall.db.dao.ClothingGuideMapper;
import org.linlinjava.litemall.db.domain.ClothingGuide;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.annotation.Resource;
import java.util.List;

@Service
public class ClothingGuideService {

    @Resource
    private ClothingGuideMapper guideMapper;

    public ClothingGuide findById(Integer id) {
        return guideMapper.selectByPrimaryKey(id);
    }

    public ClothingGuide findByPhone(String phone) {
        return guideMapper.selectByPhone(phone);
    }

    public List<ClothingGuide> querySelective(String name, String phone, Integer storeId, Boolean status, Integer page, Integer limit) {
        ClothingGuide query = new ClothingGuide();
        if (!StringUtils.isEmpty(name)) {
            query.setName(name);
        }
        if (!StringUtils.isEmpty(phone)) {
            query.setPhone(phone);
        }
        if (storeId != null) {
            query.setStoreId(storeId);
        }
        if (status != null) {
            query.setStatus(status);
        }
        PageHelper.startPage(page, limit);
        return guideMapper.selectSelective(query);
    }

    public int countSelective(String name, String phone, Integer storeId, Boolean status) {
        ClothingGuide query = new ClothingGuide();
        if (!StringUtils.isEmpty(name)) {
            query.setName(name);
        }
        if (!StringUtils.isEmpty(phone)) {
            query.setPhone(phone);
        }
        if (storeId != null) {
            query.setStoreId(storeId);
        }
        if (status != null) {
            query.setStatus(status);
        }
        return guideMapper.countSelective(query);
    }

    public int add(ClothingGuide guide) {
        return guideMapper.insert(guide);
    }

    public int update(ClothingGuide guide) {
        return guideMapper.updateByPrimaryKeySelective(guide);
    }

    public int delete(Integer id) {
        return guideMapper.deleteByPrimaryKey(id);
    }
}
