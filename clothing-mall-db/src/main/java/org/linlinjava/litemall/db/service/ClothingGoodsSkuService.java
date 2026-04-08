package org.linlinjava.litemall.db.service;

import com.github.pagehelper.PageHelper;
import org.linlinjava.litemall.db.dao.ClothingGoodsSkuMapper;
import org.linlinjava.litemall.db.domain.ClothingGoodsSku;
import org.linlinjava.litemall.db.domain.LitemallGoods;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.ArrayList;
import java.util.List;

@Service
public class ClothingGoodsSkuService {

    @Resource
    private ClothingGoodsSkuMapper skuMapper;

    @Resource
    private LitemallGoodsService goodsService;

    public List<ClothingGoodsSku> queryByGoodsId(Integer goodsId) {
        return skuMapper.selectByGoodsId(goodsId);
    }

    /**
     * 根据商品款号查询SKU列表
     *
     * @param goodsSn 商品款号
     * @return SKU列表
     */
    public List<ClothingGoodsSku> queryByGoodsSn(String goodsSn) {
        if (goodsSn == null || goodsSn.trim().isEmpty()) {
            return new ArrayList<>();
        }
        LitemallGoods goods = goodsService.findByGoodsSn(goodsSn);
        if (goods == null) {
            return new ArrayList<>();
        }
        return skuMapper.selectByGoodsId(goods.getId());
    }

    public List<ClothingGoodsSku> queryByGoodsIdAndColor(Integer goodsId, String color) {
        return skuMapper.selectByGoodsIdAndColor(goodsId, color);
    }

    public ClothingGoodsSku queryByGoodsIdColorSize(Integer goodsId, String color, String size) {
        return skuMapper.selectByGoodsIdColorSize(goodsId, color, size);
    }

    public ClothingGoodsSku findById(Integer id) {
        return skuMapper.selectByPrimaryKey(id);
    }

    public int add(ClothingGoodsSku sku) {
        return skuMapper.insertSelective(sku);
    }

    public int update(ClothingGoodsSku sku) {
        return skuMapper.updateByPrimaryKeySelective(sku);
    }

    public int delete(Integer id) {
        return skuMapper.deleteByPrimaryKey(id);
    }

    public int deleteByGoodsId(Integer goodsId) {
        return skuMapper.deleteByGoodsId(goodsId);
    }

    /**
     * 减少库存
     */
    public int reduceStock(Integer id, Integer num) {
        return skuMapper.reduceStock(id, num);
    }

    /**
     * 增加库存
     */
    public int addStock(Integer id, Integer num) {
        return skuMapper.addStock(id, num);
    }

    /**
     * 检查库存是否充足
     */
    public boolean checkStock(Integer id, Integer num) {
        ClothingGoodsSku sku = findById(id);
        return sku != null && sku.getStock() >= num;
    }

    // ==================== 新增方法 ====================

    /**
     * 查询 SKU 列表（支持分页和筛选）
     *
     * @param status     状态：draft/pending/published
     * @param categoryId 分类ID
     * @param color      颜色（模糊匹配）
     * @param size       尺码
     * @param keyword    关键词（名称或SKU编码）
     * @param goodsId    商品ID
     * @param hasGoods   是否已关联商品（true=已上架，false=未上架）
     * @param page       页码
     * @param limit      每页数量
     * @return SKU列表
     */
    public List<ClothingGoodsSku> querySkuList(String status, Integer categoryId, String color,
                                                String size, String keyword, Integer goodsId,
                                                Boolean hasGoods, Integer page, Integer limit) {
        PageHelper.startPage(page, limit);
        return skuMapper.selectSkuList(status, categoryId, color, size, keyword, goodsId, hasGoods);
    }

    /**
     * 统计 SKU 数量
     */
    public int countSkuList(String status, Integer categoryId, String color,
                            String size, String keyword, Integer goodsId, Boolean hasGoods) {
        return skuMapper.countSkuList(status, categoryId, color, size, keyword, goodsId, hasGoods);
    }

    /**
     * 批量更新状态
     *
     * @param ids   SKU ID列表
     * @param status 新状态
     * @return 更新数量
     */
    public int updateStatusBatch(List<Integer> ids, String status) {
        if (ids == null || ids.isEmpty()) {
            return 0;
        }
        return skuMapper.updateStatusBatch(ids, status);
    }

    /**
     * 批量关联商品
     *
     * @param skuIds  SKU ID列表
     * @param goodsId 商品ID
     * @return 更新数量
     */
    public int bindGoodsBatch(List<Integer> skuIds, Integer goodsId) {
        if (skuIds == null || skuIds.isEmpty()) {
            return 0;
        }
        return skuMapper.bindGoodsBatch(skuIds, goodsId);
    }

    /**
     * 解除商品关联
     */
    public int unbindByGoodsId(Integer goodsId) {
        return skuMapper.unbindByGoodsId(goodsId);
    }

    /**
     * 查询可用的 SKU（用于商品关联选择）
     */
    public List<ClothingGoodsSku> queryActiveSku(Integer page, Integer limit) {
        return querySkuList(ClothingGoodsSku.STATUS_ACTIVE, null, null, null, null, null, null, page, limit);
    }

    /**
     * 查询停用的 SKU
     */
    public List<ClothingGoodsSku> queryInactiveSku(Integer page, Integer limit) {
        return querySkuList(ClothingGoodsSku.STATUS_INACTIVE, null, null, null, null, null, null, page, limit);
    }
}
