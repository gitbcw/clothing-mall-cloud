package org.linlinjava.litemall.db.service;

import org.apache.ibatis.annotations.Param;
import org.linlinjava.litemall.db.dao.GoodsProductMapper;
import org.linlinjava.litemall.db.dao.LitemallGoodsProductMapper;
import org.linlinjava.litemall.db.domain.LitemallGoodsProduct;
import org.linlinjava.litemall.db.domain.LitemallGoodsProductExample;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class LitemallGoodsProductService {
    @Resource
    private LitemallGoodsProductMapper litemallGoodsProductMapper;
    @Resource
    private GoodsProductMapper goodsProductMapper;
    @Resource
    private LitemallGoodsService goodsService;

    public List<LitemallGoodsProduct> queryByGid(Integer gid) {
        LitemallGoodsProductExample example = new LitemallGoodsProductExample();
        example.or().andGoodsIdEqualTo(gid).andDeletedEqualTo(false);
        return litemallGoodsProductMapper.selectByExample(example);
    }

    public LitemallGoodsProduct findById(Integer id) {
        return litemallGoodsProductMapper.selectByPrimaryKey(id);
    }

    public void deleteById(Integer id) {
        litemallGoodsProductMapper.logicalDeleteByPrimaryKey(id);
    }

    public void add(LitemallGoodsProduct goodsProduct) {
        goodsProduct.setAddTime(LocalDateTime.now());
        goodsProduct.setUpdateTime(LocalDateTime.now());
        litemallGoodsProductMapper.insertSelective(goodsProduct);
    }

    public int count() {
        LitemallGoodsProductExample example = new LitemallGoodsProductExample();
        example.or().andDeletedEqualTo(false);
        return (int) litemallGoodsProductMapper.countByExample(example);
    }

    public void deleteByGid(Integer gid) {
        LitemallGoodsProductExample example = new LitemallGoodsProductExample();
        example.or().andGoodsIdEqualTo(gid);
        litemallGoodsProductMapper.logicalDeleteByExample(example);
    }

    @Transactional
    public int addStock(Integer id, Short num){
        int result = goodsProductMapper.addStock(id, num);
        // 库存变动后检查预售状态
        updatePresaleStatusIfNeeded(id);
        return result;
    }

    @Transactional
    public int reduceStock(Integer id, Short num){
        int result = goodsProductMapper.reduceStock(id, num);
        // 库存变动后检查预售状态
        updatePresaleStatusIfNeeded(id);
        return result;
    }

    /**
     * 库存变动后检查并更新商品预售状态
     */
    private void updatePresaleStatusIfNeeded(Integer productId) {
        LitemallGoodsProduct product = findById(productId);
        if (product != null && product.getGoodsId() != null) {
            List<LitemallGoodsProduct> products = queryByGid(product.getGoodsId());
            goodsService.checkAndUpdatePresaleStatus(product.getGoodsId(), products);
        }
    }

    public void updateById(LitemallGoodsProduct product) {
        product.setUpdateTime(LocalDateTime.now());
        litemallGoodsProductMapper.updateByPrimaryKeySelective(product);
        // 库存变动后检查预售状态
        if (product.getGoodsId() != null) {
            List<LitemallGoodsProduct> products = queryByGid(product.getGoodsId());
            goodsService.checkAndUpdatePresaleStatus(product.getGoodsId(), products);
        }
    }
}