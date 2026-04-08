package org.linlinjava.litemall.db.service;

import com.github.pagehelper.PageHelper;
import org.linlinjava.litemall.db.dao.ClothingStoreMapper;
import org.linlinjava.litemall.db.domain.ClothingStore;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.annotation.Resource;
import java.util.List;

@Service
public class ClothingStoreService {

    @Resource
    private ClothingStoreMapper storeMapper;

    public List<ClothingStore> queryAll() {
        return storeMapper.selectAll();
    }

    public ClothingStore findById(Integer id) {
        return storeMapper.selectByPrimaryKey(id);
    }

    public List<ClothingStore> querySelective(String name, Boolean status, Integer page, Integer limit) {
        ClothingStore query = new ClothingStore();
        if (!StringUtils.isEmpty(name)) {
            query.setName(name);
        }
        if (status != null) {
            query.setStatus(status);
        }
        PageHelper.startPage(page, limit);
        return storeMapper.selectSelective(query);
    }

    public int countSelective(String name, Boolean status) {
        ClothingStore query = new ClothingStore();
        if (!StringUtils.isEmpty(name)) {
            query.setName(name);
        }
        if (status != null) {
            query.setStatus(status);
        }
        return storeMapper.countSelective(query);
    }

    public int add(ClothingStore store) {
        return storeMapper.insert(store);
    }

    public int update(ClothingStore store) {
        return storeMapper.updateByPrimaryKeySelective(store);
    }

    public int delete(Integer id) {
        return storeMapper.deleteByPrimaryKey(id);
    }
}
