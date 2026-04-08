package org.linlinjava.litemall.db.service;

import com.github.pagehelper.PageHelper;
import org.linlinjava.litemall.db.dao.LitemallGoodsMapper;
import org.linlinjava.litemall.db.domain.LitemallGoods;
import org.linlinjava.litemall.db.domain.LitemallGoods.Column;
import org.linlinjava.litemall.db.domain.LitemallGoodsExample;
import org.linlinjava.litemall.db.domain.LitemallGoodsProduct;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class LitemallGoodsService {
    Column[] columns = new Column[]{Column.id, Column.name, Column.brief, Column.picUrl, Column.isHot, Column.isNew, Column.counterPrice, Column.retailPrice, Column.categoryId};
    @Resource
    private LitemallGoodsMapper goodsMapper;

    /**
     * 获取热卖商品
     */
    public List<LitemallGoods> queryByHot(int offset, int limit) {
        LitemallGoodsExample example = new LitemallGoodsExample();
        example.or().andIsHotEqualTo(true).andStatusEqualTo(LitemallGoods.STATUS_PUBLISHED).andDeletedEqualTo(false);
        example.setOrderByClause("add_time desc");
        PageHelper.startPage(offset, limit);

        return goodsMapper.selectByExampleSelective(example, columns);
    }

    /**
     * 查询所有已上架商品（首页展示用）
     */
    public List<LitemallGoods> queryAllPublished(int offset, int limit) {
        LitemallGoodsExample example = new LitemallGoodsExample();
        example.or().andStatusEqualTo(LitemallGoods.STATUS_PUBLISHED).andDeletedEqualTo(false);
        example.setOrderByClause("add_time desc");
        PageHelper.startPage(offset, limit);

        return goodsMapper.selectByExampleSelective(example, columns);
    }

    /**
     * 查询特价商品
     */
    public List<LitemallGoods> queryBySpecialPrice(int offset, int limit) {
        LitemallGoodsExample example = new LitemallGoodsExample();
        example.or().andIsSpecialPriceEqualTo(true).andStatusEqualTo(LitemallGoods.STATUS_PUBLISHED).andDeletedEqualTo(false);
        example.setOrderByClause("add_time desc");
        PageHelper.startPage(offset, limit);
        return goodsMapper.selectByExampleSelective(example, columns);
    }

    /**
     * 查询本周上新商品（7天内创建的新品）
     */
    public List<LitemallGoods> queryByWeeklyNew(int offset, int limit) {
        LitemallGoodsExample example = new LitemallGoodsExample();
        example.or().andIsNewEqualTo(true).andStatusEqualTo(LitemallGoods.STATUS_PUBLISHED).andDeletedEqualTo(false)
                .andAddTimeGreaterThanOrEqualTo(java.time.LocalDateTime.now().minusDays(7));
        example.setOrderByClause("add_time desc");
        PageHelper.startPage(offset, limit);
        return goodsMapper.selectByExampleSelective(example, columns);
    }

    /**
     * 根据ID列表查询商品
     */
    public List<LitemallGoods> queryByIds(List<Integer> ids) {
        if (ids == null || ids.isEmpty()) {
            return new ArrayList<>();
        }
        LitemallGoodsExample example = new LitemallGoodsExample();
        example.or().andIdIn(ids).andStatusEqualTo(LitemallGoods.STATUS_PUBLISHED).andDeletedEqualTo(false);
        example.setOrderByClause("add_time desc");
        return goodsMapper.selectByExampleSelective(example, columns);
    }

    /**
     * 获取新品上市
     *
     * @param offset
     * @param limit
     * @return
     */
    public List<LitemallGoods> queryByNew(int offset, int limit) {
        LitemallGoodsExample example = new LitemallGoodsExample();
        example.or().andIsNewEqualTo(true).andStatusEqualTo(LitemallGoods.STATUS_PUBLISHED).andDeletedEqualTo(false);
        example.setOrderByClause("add_time desc");
        PageHelper.startPage(offset, limit);

        return goodsMapper.selectByExampleSelective(example, columns);
    }

    /**
     * 获取分类下的商品
     *
     * @param catList
     * @param offset
     * @param limit
     * @return
     */
    public List<LitemallGoods> queryByCategory(List<Integer> catList, int offset, int limit) {
        LitemallGoodsExample example = new LitemallGoodsExample();
        example.or().andCategoryIdIn(catList).andStatusEqualTo(LitemallGoods.STATUS_PUBLISHED).andDeletedEqualTo(false);
        example.setOrderByClause("add_time  desc");
        PageHelper.startPage(offset, limit);

        return goodsMapper.selectByExampleSelective(example, columns);
    }


    /**
     * 获取分类下的商品
     *
     * @param catId
     * @param offset
     * @param limit
     * @return
     */
    public List<LitemallGoods> queryByCategory(Integer catId, int offset, int limit) {
        LitemallGoodsExample example = new LitemallGoodsExample();
        example.or().andCategoryIdEqualTo(catId).andStatusEqualTo(LitemallGoods.STATUS_PUBLISHED).andDeletedEqualTo(false);
        example.setOrderByClause("add_time desc");
        PageHelper.startPage(offset, limit);

        return goodsMapper.selectByExampleSelective(example, columns);
    }


    public List<LitemallGoods> querySelective(Integer catId, Integer brandId, String keywords, Boolean isHot, Boolean isNew, Integer offset, Integer limit, String sort, String order) {
        LitemallGoodsExample example = new LitemallGoodsExample();
        LitemallGoodsExample.Criteria criteria1 = example.or();
        LitemallGoodsExample.Criteria criteria2 = example.or();

        if (!StringUtils.isEmpty(catId) && catId != 0) {
            criteria1.andCategoryIdEqualTo(catId);
            criteria2.andCategoryIdEqualTo(catId);
        }
        if (!StringUtils.isEmpty(brandId)) {
            criteria1.andBrandIdEqualTo(brandId);
            criteria2.andBrandIdEqualTo(brandId);
        }
        if (!StringUtils.isEmpty(isNew)) {
            criteria1.andIsNewEqualTo(isNew);
            criteria2.andIsNewEqualTo(isNew);
        }
        if (!StringUtils.isEmpty(isHot)) {
            criteria1.andIsHotEqualTo(isHot);
            criteria2.andIsHotEqualTo(isHot);
        }
        if (!StringUtils.isEmpty(keywords)) {
            criteria1.andKeywordsLike("%" + keywords + "%");
            criteria2.andNameLike("%" + keywords + "%");
        }
        criteria1.andStatusEqualTo(LitemallGoods.STATUS_PUBLISHED);
        criteria2.andStatusEqualTo(LitemallGoods.STATUS_PUBLISHED);
        criteria1.andDeletedEqualTo(false);
        criteria2.andDeletedEqualTo(false);

        if (!StringUtils.isEmpty(sort) && !StringUtils.isEmpty(order)) {
            example.setOrderByClause(sort + " " + order);
        }

        PageHelper.startPage(offset, limit);

        return goodsMapper.selectByExampleSelective(example, columns);
    }

    public List<LitemallGoods> querySelective(Integer goodsId, String goodsSn, String name, String status, Integer page, Integer size, String sort, String order) {
        LitemallGoodsExample example = new LitemallGoodsExample();
        LitemallGoodsExample.Criteria criteria = example.createCriteria();

        if (goodsId != null) {
            criteria.andIdEqualTo(goodsId);
        }
        if (!StringUtils.isEmpty(goodsSn)) {
            criteria.andGoodsSnEqualTo(goodsSn);
        }
        if (!StringUtils.isEmpty(name)) {
            criteria.andNameLike("%" + name + "%");
        }
        if (!StringUtils.isEmpty(status)) {
            criteria.andStatusEqualTo(status);
        }
        criteria.andDeletedEqualTo(false);

        if (!StringUtils.isEmpty(sort) && !StringUtils.isEmpty(order)) {
            example.setOrderByClause(sort + " " + order);
        }

        PageHelper.startPage(page, size);
        return goodsMapper.selectByExampleWithBLOBs(example);
    }

    /**
     * 获取某个商品信息,包含完整信息
     *
     * @param id
     * @return
     */
    public LitemallGoods findById(Integer id) {
        LitemallGoodsExample example = new LitemallGoodsExample();
        example.or().andIdEqualTo(id).andDeletedEqualTo(false);
        return goodsMapper.selectOneByExampleWithBLOBs(example);
    }

    /**
     * 获取某个商品信息，仅展示相关内容
     *
     * @param id
     * @return
     */
    public LitemallGoods findByIdVO(Integer id) {
        LitemallGoodsExample example = new LitemallGoodsExample();
        example.or().andIdEqualTo(id).andStatusEqualTo(LitemallGoods.STATUS_PUBLISHED).andDeletedEqualTo(false);
        return goodsMapper.selectOneByExampleSelective(example, columns);
    }


    /**
     * 获取所有在售物品总数
     *
     * @return
     */
    public Integer queryOnSale() {
        LitemallGoodsExample example = new LitemallGoodsExample();
        example.or().andStatusEqualTo(LitemallGoods.STATUS_PUBLISHED).andDeletedEqualTo(false);
        return (int) goodsMapper.countByExample(example);
    }

    public int updateById(LitemallGoods goods) {
        goods.setUpdateTime(LocalDateTime.now());
        return goodsMapper.updateByPrimaryKeySelective(goods);
    }

    public void deleteById(Integer id) {
        goodsMapper.logicalDeleteByPrimaryKey(id);
    }

    public void add(LitemallGoods goods) {
        goods.setAddTime(LocalDateTime.now());
        goods.setUpdateTime(LocalDateTime.now());
        goodsMapper.insertSelective(goods);
    }

    /**
     * 获取所有物品总数，包括在售的和下架的，但是不包括已删除的商品
     *
     * @return
     */
    public int count() {
        LitemallGoodsExample example = new LitemallGoodsExample();
        example.or().andDeletedEqualTo(false);
        return (int) goodsMapper.countByExample(example);
    }

    public List<Integer> getCatIds(Integer brandId, String keywords, Boolean isHot, Boolean isNew) {
        LitemallGoodsExample example = new LitemallGoodsExample();
        LitemallGoodsExample.Criteria criteria1 = example.or();
        LitemallGoodsExample.Criteria criteria2 = example.or();

        if (!StringUtils.isEmpty(brandId)) {
            criteria1.andBrandIdEqualTo(brandId);
            criteria2.andBrandIdEqualTo(brandId);
        }
        if (!StringUtils.isEmpty(isNew)) {
            criteria1.andIsNewEqualTo(isNew);
            criteria2.andIsNewEqualTo(isNew);
        }
        if (!StringUtils.isEmpty(isHot)) {
            criteria1.andIsHotEqualTo(isHot);
            criteria2.andIsHotEqualTo(isHot);
        }
        if (!StringUtils.isEmpty(keywords)) {
            criteria1.andKeywordsLike("%" + keywords + "%");
            criteria2.andNameLike("%" + keywords + "%");
        }
        criteria1.andStatusEqualTo(LitemallGoods.STATUS_PUBLISHED);
        criteria2.andStatusEqualTo(LitemallGoods.STATUS_PUBLISHED);
        criteria1.andDeletedEqualTo(false);
        criteria2.andDeletedEqualTo(false);

        List<LitemallGoods> goodsList = goodsMapper.selectByExampleSelective(example, Column.categoryId);
        List<Integer> cats = new ArrayList<Integer>();
        for (LitemallGoods goods : goodsList) {
            cats.add(goods.getCategoryId());
        }
        return cats;
    }

    public boolean checkExistByName(String name) {
        LitemallGoodsExample example = new LitemallGoodsExample();
        example.or().andNameEqualTo(name).andStatusEqualTo(LitemallGoods.STATUS_PUBLISHED).andDeletedEqualTo(false);
        return goodsMapper.countByExample(example) != 0;
    }

    public List<LitemallGoods> queryByIds(Integer[] ids) {
        LitemallGoodsExample example = new LitemallGoodsExample();
        example.or().andIdIn(Arrays.asList(ids)).andStatusEqualTo(LitemallGoods.STATUS_PUBLISHED).andDeletedEqualTo(false);
        return goodsMapper.selectByExampleSelective(example, columns);
    }

    /**
     * 根据商品款号查询商品
     *
     * @param goodsSn 商品款号
     * @return 商品对象，不存在则返回null
     */
    public LitemallGoods findByGoodsSn(String goodsSn) {
        if (StringUtils.isEmpty(goodsSn)) {
            return null;
        }
        LitemallGoodsExample example = new LitemallGoodsExample();
        example.or().andGoodsSnEqualTo(goodsSn).andDeletedEqualTo(false);
        return goodsMapper.selectOneByExampleWithBLOBs(example);
    }

    /**
     * 更新商品状态
     *
     * @param id 商品ID
     * @param status 状态值
     */
    public void updateStatus(Integer id, String status) {
        LitemallGoods goods = new LitemallGoods();
        goods.setId(id);
        goods.setStatus(status);
        goods.setUpdateTime(LocalDateTime.now());
        goodsMapper.updateByPrimaryKeySelective(goods);
    }

    public void updateStatusBatch(List<Integer> ids, String status) {
        for (Integer id : ids) {
            updateStatus(id, status);
        }
    }

    public void updateAllStatus(String status) {
        LitemallGoodsExample example = new LitemallGoodsExample();
        example.createCriteria()
            .andStatusNotEqualTo(status)
            .andDeletedEqualTo(false);
        LitemallGoods goods = new LitemallGoods();
        goods.setStatus(status);
        goods.setUpdateTime(LocalDateTime.now());
        goodsMapper.updateByExampleSelective(goods, example);
    }

    /**
     * 设置商品预售状态
     *
     * @param goodsId 商品ID
     * @param isPresale 是否预售
     */
    public void setPresale(Integer goodsId, Boolean isPresale) {
        LitemallGoods goods = new LitemallGoods();
        goods.setId(goodsId);
        goods.setIsPresale(isPresale);
        goods.setUpdateTime(LocalDateTime.now());
        goodsMapper.updateByPrimaryKeySelective(goods);
    }

    /**
     * 检查商品库存并更新预售状态
     * 当所有货品库存为0时，自动标记为预售
     *
     * @param goodsId 商品ID
     * @param products 商品货品列表
     */
    public void checkAndUpdatePresaleStatus(Integer goodsId, List<LitemallGoodsProduct> products) {
        if (products == null || products.isEmpty()) {
            return;
        }

        // 检查是否所有货品都无库存
        boolean allOutOfStock = true;
        for (LitemallGoodsProduct product : products) {
            if (product.getNumber() != null && product.getNumber() > 0) {
                allOutOfStock = false;
                break;
            }
        }

        // 根据库存状态更新预售标记
        setPresale(goodsId, allOutOfStock);
    }

    /**
     * 设置商品上架/下架状态（不改 status 字段）
     */
    public void setOnSale(Integer id, boolean isOnSale) {
        LitemallGoods goods = new LitemallGoods();
        goods.setId(id);
        goods.setIsOnSale(isOnSale);
        goods.setUpdateTime(LocalDateTime.now());
        goodsMapper.updateByPrimaryKeySelective(goods);
    }

    /**
     * 按 status 和 isOnSale 条件统计商品数量
     */
    public int countByCondition(String status, Boolean isOnSale) {
        LitemallGoodsExample example = new LitemallGoodsExample();
        LitemallGoodsExample.Criteria criteria = example.createCriteria();
        if (status != null && !status.isEmpty()) {
            criteria.andStatusEqualTo(status);
        }
        if (isOnSale != null) {
            criteria.andIsOnSaleEqualTo(isOnSale);
        }
        criteria.andDeletedEqualTo(false);
        return (int) goodsMapper.countByExample(example);
    }

    /**
     * 查询商品列表（支持 isOnSale 过滤，用于管理端）
     */
    public List<LitemallGoods> querySelectiveForManager(String status, Boolean isOnSale, String keyword, Integer page, Integer size, String sort, String order) {
        LitemallGoodsExample example = new LitemallGoodsExample();
        LitemallGoodsExample.Criteria criteria = example.createCriteria();
        if (status != null && !status.isEmpty()) {
            criteria.andStatusEqualTo(status);
        }
        if (isOnSale != null) {
            criteria.andIsOnSaleEqualTo(isOnSale);
        }
        if (keyword != null && !keyword.trim().isEmpty()) {
            String like = "%" + keyword.trim() + "%";
            criteria.andNameLike(like);
        }
        criteria.andDeletedEqualTo(false);
        if (sort != null && !sort.isEmpty() && order != null && !order.isEmpty()) {
            example.setOrderByClause(sort + " " + order);
        }
        PageHelper.startPage(page, size);
        return goodsMapper.selectByExampleWithBLOBs(example);
    }

    /**
     * 搜索商品（支持场景筛选和综合排序）
     */
    public List<LitemallGoods> querySelectiveWithScene(Integer categoryId, Integer brandId, String keyword,
            Boolean isHot, Boolean isNew, Integer sceneId, Integer offset, Integer limit, String sort, String order) {
        PageHelper.startPage(offset, limit);
        return goodsMapper.selectBySearchCondition(categoryId, brandId, keyword, isHot, isNew, sceneId, sort, order);
    }

    public List<String> searchKeywordSuggestions(String keyword, int limit) {
        List<String> rawList = goodsMapper.selectDistinctKeywords(keyword, limit);
        Set<String> result = new LinkedHashSet<>();
        for (String keywords : rawList) {
            for (String kw : keywords.split(",")) {
                String trimmed = kw.trim();
                if (!trimmed.isEmpty()) {
                    result.add(trimmed);
                }
            }
        }
        return new ArrayList<>(result).subList(0, Math.min(result.size(), limit));
    }

}
