package org.linlinjava.litemall.db.service;

import com.github.pagehelper.PageHelper;
import org.linlinjava.litemall.db.dao.LitemallOutfitMapper;
import org.linlinjava.litemall.db.domain.LitemallOutfit;
import org.linlinjava.litemall.db.domain.LitemallOutfitExample;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class LitemallOutfitService {
    @Resource
    private LitemallOutfitMapper outfitMapper;

    public static final short STATUS_DISABLED = 0;
    public static final short STATUS_ENABLED = 1;

    public List<LitemallOutfit> querySelective(String title, Short status, Integer page, Integer limit, String sort, String order) {
        LitemallOutfitExample example = new LitemallOutfitExample();
        LitemallOutfitExample.Criteria criteria = example.createCriteria();

        if (!StringUtils.isEmpty(title)) {
            criteria.andTitleLike("%" + title + "%");
        }
        if (status != null) {
            criteria.andStatusEqualTo(status);
        }
        criteria.andDeletedEqualTo(false);

        if (!StringUtils.isEmpty(sort) && !StringUtils.isEmpty(order)) {
            example.setOrderByClause(sort + " " + order);
        } else {
            example.setOrderByClause("sort_order asc, add_time desc");
        }

        PageHelper.startPage(page, limit);
        return outfitMapper.selectByExample(example);
    }

    public LitemallOutfit findById(Integer id) {
        return outfitMapper.selectByPrimaryKey(id);
    }

    /**
     * 查询所有启用的穿搭（按排序字段升序）
     */
    public List<LitemallOutfit> queryEnabled() {
        LitemallOutfitExample example = new LitemallOutfitExample();
        example.or()
                .andStatusEqualTo(STATUS_ENABLED)
                .andDeletedEqualTo(false);
        example.setOrderByClause("sort_order asc, add_time desc");
        return outfitMapper.selectByExample(example);
    }

    public int add(LitemallOutfit outfit) {
        outfit.setAddTime(LocalDateTime.now());
        outfit.setUpdateTime(LocalDateTime.now());
        return outfitMapper.insertSelective(outfit);
    }

    public int updateById(LitemallOutfit outfit) {
        outfit.setUpdateTime(LocalDateTime.now());
        return outfitMapper.updateByPrimaryKeySelective(outfit);
    }

    public void deleteById(Integer id) {
        outfitMapper.logicalDeleteByPrimaryKey(id);
    }
}
