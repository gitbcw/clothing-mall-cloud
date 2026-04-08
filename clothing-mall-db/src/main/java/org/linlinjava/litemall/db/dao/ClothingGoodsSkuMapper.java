package org.linlinjava.litemall.db.dao;

import org.linlinjava.litemall.db.domain.ClothingGoodsSku;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface ClothingGoodsSkuMapper {

    int insert(ClothingGoodsSku record);

    int insertSelective(ClothingGoodsSku record);

    int deleteByPrimaryKey(Integer id);

    int updateByPrimaryKeySelective(ClothingGoodsSku record);

    int updateByPrimaryKey(ClothingGoodsSku record);

    ClothingGoodsSku selectByPrimaryKey(Integer id);

    List<ClothingGoodsSku> selectByGoodsId(@Param("goodsId") Integer goodsId);

    List<ClothingGoodsSku> selectByGoodsIdAndColor(@Param("goodsId") Integer goodsId, @Param("color") String color);

    ClothingGoodsSku selectByGoodsIdColorSize(@Param("goodsId") Integer goodsId, @Param("color") String color, @Param("size") String size);

    int reduceStock(@Param("id") Integer id, @Param("num") Integer num);

    int addStock(@Param("id") Integer id, @Param("num") Integer num);

    List<ClothingGoodsSku> selectSelective(ClothingGoodsSku record);

    int countSelective(ClothingGoodsSku record);

    int deleteByGoodsId(@Param("goodsId") Integer goodsId);

    // ==================== 新增方法 ====================

    /**
     * 查询 SKU 列表（支持分页和筛选）
     */
    List<ClothingGoodsSku> selectSkuList(@Param("status") String status,
                                          @Param("categoryId") Integer categoryId,
                                          @Param("color") String color,
                                          @Param("size") String size,
                                          @Param("keyword") String keyword,
                                          @Param("goodsId") Integer goodsId,
                                          @Param("hasGoods") Boolean hasGoods);

    /**
     * 统计 SKU 数量
     */
    int countSkuList(@Param("status") String status,
                     @Param("categoryId") Integer categoryId,
                     @Param("color") String color,
                     @Param("size") String size,
                     @Param("keyword") String keyword,
                     @Param("goodsId") Integer goodsId,
                     @Param("hasGoods") Boolean hasGoods);

    /**
     * 批量更新状态
     */
    int updateStatusBatch(@Param("ids") List<Integer> ids, @Param("status") String status);

    /**
     * 批量关联商品
     */
    int bindGoodsBatch(@Param("skuIds") List<Integer> skuIds, @Param("goodsId") Integer goodsId);

    /**
     * 解除商品关联
     */
    int unbindByGoodsId(@Param("goodsId") Integer goodsId);
}
