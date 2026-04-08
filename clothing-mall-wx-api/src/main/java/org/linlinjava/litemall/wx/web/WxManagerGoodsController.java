package org.linlinjava.litemall.wx.web;

import com.github.pagehelper.PageInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.domain.ClothingGoodsSku;
import org.linlinjava.litemall.db.domain.LitemallGoods;
import org.linlinjava.litemall.db.domain.LitemallUser;
import org.linlinjava.litemall.db.service.ClothingGoodsSkuService;
import org.linlinjava.litemall.db.service.LitemallCategoryService;
import org.linlinjava.litemall.db.service.LitemallGoodsService;
import org.linlinjava.litemall.db.service.LitemallUserService;
import org.linlinjava.litemall.wx.annotation.LoginUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 小程序管理端商品控制器
 * 提供给店主使用的商品管理接口
 */
@RestController
@RequestMapping("/wx/manager/goods")
@Validated
public class WxManagerGoodsController {
    private final Log logger = LogFactory.getLog(WxManagerGoodsController.class);
    private static final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private LitemallGoodsService goodsService;

    @Autowired
    private LitemallUserService userService;

    @Autowired
    private ClothingGoodsSkuService clothingGoodsSkuService;

    @Autowired
    private LitemallCategoryService categoryService;

    // ========== 权限校验 ==========

    /**
     * 检查用户是否有管理权限（仅店主）
     */
    private Object checkManager(Integer userId) {
        if (userId == null) {
            return ResponseUtil.unlogin();
        }
        LitemallUser user = userService.findById(userId);
        if (user == null) {
            return ResponseUtil.badArgumentValue();
        }
        String role = user.getRole();
        if (role == null) {
            role = "user";
        }
        if (!"owner".equals(role)) {
            return ResponseUtil.fail(403, "无管理权限");
        }
        return null;
    }

    // ========== API 接口 ==========

    /**
     * 获取商品分类列表（管理端）
     */
    @GetMapping("category")
    public Object category(@LoginUser Integer userId) {
        Object error = checkManager(userId);
        if (error != null) return error;
        return ResponseUtil.okList(categoryService.querySelective(null, null, 1, 100, "sort_order", "asc"));
    }

    /**
     * 商品列表（管理端）
     *
     * @param userId 用户ID
     * @param status all/draft/pending/on_sale
     * @param page   页码
     * @param limit  每页数量
     * @return 分页商品列表 + 各 tab 数量统计
     */
    @GetMapping("list")
    public Object list(@LoginUser Integer userId,
                       @RequestParam(defaultValue = "all") String status,
                       @RequestParam(required = false) String keyword,
                       @RequestParam(defaultValue = "1") Integer page,
                       @RequestParam(defaultValue = "20") Integer limit) {
        Object error = checkManager(userId);
        if (error != null) {
            return error;
        }

        // status → 查询条件映射
        String queryStatus = null;
        Boolean queryOnSale = null;
        switch (status) {
            case "draft":
                queryStatus = LitemallGoods.STATUS_DRAFT;
                break;
            case "pending":
                queryStatus = LitemallGoods.STATUS_PENDING;
                break;
            case "on_sale":
                queryStatus = LitemallGoods.STATUS_PUBLISHED;
                queryOnSale = true;
                break;
            case "all":
                // 不过滤
                break;
            default:
                return ResponseUtil.badArgumentValue();
        }

        List<LitemallGoods> goodsList = goodsService.querySelectiveForManager(
                queryStatus, queryOnSale, keyword, page, limit, "update_time", "desc");
        long total = PageInfo.of(goodsList).getTotal();

        // 各 tab 数量
        Map<String, Object> data = new HashMap<>();
        data.put("list", goodsList);
        data.put("total", total);
        data.put("pages", (total + limit - 1) / limit);
        data.put("allCount", goodsService.countByCondition(null, null));
        data.put("draftCount", goodsService.countByCondition(LitemallGoods.STATUS_DRAFT, null));
        data.put("pendingCount", goodsService.countByCondition(LitemallGoods.STATUS_PENDING, null));
        data.put("onSaleCount", goodsService.countByCondition(LitemallGoods.STATUS_PUBLISHED, true));

        return ResponseUtil.ok(data);
    }

    /**
     * 商品详情（管理端）
     *
     * @param userId  用户ID
     * @param goodsId 商品ID
     * @return 商品详情 + SKU 列表
     */
    @GetMapping("detail")
    public Object detail(@LoginUser Integer userId, @RequestParam("id") @NotNull Integer goodsId) {
        Object error = checkManager(userId);
        if (error != null) {
            return error;
        }

        LitemallGoods goods = goodsService.findById(goodsId);
        if (goods == null) {
            return ResponseUtil.badArgumentValue();
        }

        List<ClothingGoodsSku> skuList = clothingGoodsSkuService.queryByGoodsId(goodsId);

        Map<String, Object> data = new HashMap<>();
        data.put("goods", goods);
        data.put("skuList", skuList);
        return ResponseUtil.ok(data);
    }

    /**
     * 编辑商品
     *
     * @param userId 用户ID
     * @param body   商品信息
     */
    @Transactional
    @PostMapping("edit")
    public Object edit(@LoginUser Integer userId, @RequestBody Map<String, Object> body) {
        Object error = checkManager(userId);
        if (error != null) {
            return error;
        }

        Object idObj = body.get("id");
        if (idObj == null) {
            return ResponseUtil.badArgument();
        }
        Integer goodsId = ((Number) idObj).intValue();

        LitemallGoods goods = goodsService.findById(goodsId);
        if (goods == null) {
            return ResponseUtil.badArgumentValue();
        }

        // 更新基本信息
        if (body.containsKey("name")) {
            String name = (String) body.get("name");
            if (name != null && !name.trim().isEmpty()) {
                goods.setName(name.trim());
            }
        }
        if (body.containsKey("brief")) {
            goods.setBrief((String) body.get("brief"));
        }
        if (body.containsKey("categoryId")) {
            Object catId = body.get("categoryId");
            if (catId != null) {
                goods.setCategoryId(((Number) catId).intValue());
            }
        }
        if (body.containsKey("brandId")) {
            Object brandId = body.get("brandId");
            if (brandId != null) {
                goods.setBrandId(((Number) brandId).intValue());
            }
        }
        if (body.containsKey("counterPrice")) {
            // 前端不再传 counterPrice，此处保留兼容：如果传了空值则触发自动计算
            Object price = body.get("counterPrice");
            if (price != null) {
                goods.setCounterPrice(new BigDecimal(price.toString()));
            }
        }
        if (body.containsKey("retailPrice")) {
            Object price = body.get("retailPrice");
            if (price != null) {
                goods.setRetailPrice(new BigDecimal(price.toString()));
            }
            // counterPrice（专柜价/划线价）：按零售价自动上浮30%
            if (goods.getCounterPrice() == null || goods.getCounterPrice().compareTo(BigDecimal.ZERO) <= 0) {
                BigDecimal rp = goods.getRetailPrice();
                if (rp != null && rp.compareTo(BigDecimal.ZERO) > 0) {
                    goods.setCounterPrice(rp.multiply(new BigDecimal("1.3")).setScale(2, BigDecimal.ROUND_HALF_UP));
                }
            }
        }
        if (body.containsKey("picUrl")) {
            goods.setPicUrl((String) body.get("picUrl"));
        }
        if (body.containsKey("gallery")) {
            Object galleryObj = body.get("gallery");
            if (galleryObj instanceof List) {
                @SuppressWarnings("unchecked")
                List<String> galleryList = (List<String>) galleryObj;
                goods.setGallery(galleryList.toArray(new String[0]));
            }
        }
        if (body.containsKey("detail")) {
            goods.setDetail((String) body.get("detail"));
        }
        if (body.containsKey("keywords")) {
            goods.setKeywords((String) body.get("keywords"));
        }
        if (body.containsKey("specialPrice")) {
            Object specialPriceObj = body.get("specialPrice");
            if (specialPriceObj != null) {
                goods.setSpecialPrice(new BigDecimal(specialPriceObj.toString()));
                goods.setIsSpecialPrice(true);
            } else {
                goods.setSpecialPrice(null);
                goods.setIsSpecialPrice(false);
            }
        }

        // 场景标签：JSON 数组存储
        if (body.containsKey("scenes")) {
            Object scenesObj = body.get("scenes");
            if (scenesObj instanceof List) {
                try {
                    goods.setSceneTags(objectMapper.writeValueAsString(scenesObj));
                } catch (Exception e) {
                    logger.error("序列化 scenes 失败", e);
                }
            }
        }

        // 商品参数：JSON 数组存储
        if (body.containsKey("params")) {
            Object paramsObj = body.get("params");
            if (paramsObj instanceof List) {
                try {
                    goods.setGoodsParams(objectMapper.writeValueAsString(paramsObj));
                } catch (Exception e) {
                    logger.error("序列化 params 失败", e);
                }
            }
        }

        goodsService.updateById(goods);

        // 更新 SKU 列表（可选）
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> skus = (List<Map<String, Object>>) body.get("skus");
        if (skus != null) {
            updateSkus(goodsId, skus);
        }

        return ResponseUtil.ok();
    }

    /**
     * 上架商品（支持批量）
     *
     * @param userId 用户ID
     * @param body   { id: 123 } 或 { ids: [1,2,3] }
     */
    @PostMapping("publish")
    public Object publish(@LoginUser Integer userId, @RequestBody Map<String, Object> body) {
        Object error = checkManager(userId);
        if (error != null) {
            return error;
        }

        List<Integer> ids = extractIds(body);
        if (ids.isEmpty()) {
            return ResponseUtil.badArgument();
        }

        goodsService.updateStatusBatch(ids, LitemallGoods.STATUS_PUBLISHED);
        return ResponseUtil.ok();
    }

    /**
     * 下架商品（支持批量，status 改为 pending）
     *
     * @param userId 用户ID
     * @param body   { id: 123 } 或 { ids: [1,2,3] }
     */
    @PostMapping("unpublish")
    public Object unpublish(@LoginUser Integer userId, @RequestBody Map<String, Object> body) {
        Object error = checkManager(userId);
        if (error != null) {
            return error;
        }

        List<Integer> ids = extractIds(body);
        if (ids.isEmpty()) {
            return ResponseUtil.badArgument();
        }

        goodsService.updateStatusBatch(ids, LitemallGoods.STATUS_PENDING);
        return ResponseUtil.ok();
    }

    /**
     * 批量软删除商品
     *
     * @param userId 用户ID
     * @param body   { ids: [1,2,3] }
     */
    @PostMapping("batchDelete")
    public Object batchDelete(@LoginUser Integer userId, @RequestBody Map<String, Object> body) {
        Object error = checkManager(userId);
        if (error != null) {
            return error;
        }

        List<Integer> ids = extractIds(body);
        if (ids.isEmpty()) {
            return ResponseUtil.badArgument();
        }

        for (Integer id : ids) {
            goodsService.deleteById(id);
        }
        return ResponseUtil.ok();
    }

    /**
     * 一键下架全部商品（换季下架）
     */
    @PostMapping("unpublishAll")
    public Object unpublishAll(@LoginUser Integer userId) {
        Object error = checkManager(userId);
        if (error != null) {
            return error;
        }
        goodsService.updateAllStatus(LitemallGoods.STATUS_PENDING);
        return ResponseUtil.ok();
    }

    /**
     * 快速创建商品草稿（手机端拍照录入）
     */
    @Transactional
    @PostMapping("create")
    public Object create(@LoginUser Integer userId, @RequestBody Map<String, Object> body) {
        Object error = checkManager(userId);
        if (error != null) {
            return error;
        }

        String name = (String) body.get("name");
        if (name == null || name.trim().isEmpty()) {
            return ResponseUtil.badArgument();
        }

        LitemallGoods goods = new LitemallGoods();
        goods.setName(name.trim());

        Object categoryIdObj = body.get("categoryId");
        if (categoryIdObj != null) {
            goods.setCategoryId(((Number) categoryIdObj).intValue());
        }

        goods.setBrief((String) body.get("brief"));
        goods.setDetail((String) body.get("detail"));
        goods.setKeywords((String) body.get("keywords"));

        Object counterPriceObj = body.get("counterPrice");
        if (counterPriceObj != null) {
            goods.setCounterPrice(new BigDecimal(counterPriceObj.toString()));
        }

        Object retailPriceObj = body.get("retailPrice");
        if (retailPriceObj != null) {
            BigDecimal retailPrice = new BigDecimal(retailPriceObj.toString());
            goods.setRetailPrice(retailPrice);
            // counterPrice（专柜价/划线价）：按零售价自动上浮30%
            if (goods.getCounterPrice() == null || goods.getCounterPrice().compareTo(BigDecimal.ZERO) <= 0) {
                goods.setCounterPrice(retailPrice.multiply(new BigDecimal("1.3")).setScale(2, BigDecimal.ROUND_HALF_UP));
            }
        }

        Object specialPriceObj = body.get("specialPrice");
        if (specialPriceObj != null) {
            BigDecimal specialPrice = new BigDecimal(specialPriceObj.toString());
            goods.setSpecialPrice(specialPrice);
            goods.setIsSpecialPrice(true);
        }

        String picUrl = (String) body.get("picUrl");
        String sourceImage = (String) body.get("sourceImage");
        if (picUrl != null && !picUrl.isEmpty()) {
            goods.setPicUrl(picUrl);
        } else if (sourceImage != null && !sourceImage.isEmpty()) {
            goods.setPicUrl(sourceImage);
        }

        Object galleryObj = body.get("gallery");
        if (galleryObj instanceof List) {
            @SuppressWarnings("unchecked")
            List<String> galleryList = (List<String>) galleryObj;
            goods.setGallery(galleryList.toArray(new String[0]));
        }

        // 场景标签：JSON 数组存储
        Object scenesObj = body.get("scenes");
        if (scenesObj instanceof List) {
            try {
                goods.setSceneTags(objectMapper.writeValueAsString(scenesObj));
            } catch (Exception e) {
                logger.error("序列化 scenes 失败", e);
            }
        }

        // 商品参数：JSON 数组存储
        Object paramsObj = body.get("params");
        if (paramsObj instanceof List) {
            try {
                goods.setGoodsParams(objectMapper.writeValueAsString(paramsObj));
            } catch (Exception e) {
                logger.error("序列化 params 失败", e);
            }
        }

        goods.setStatus(LitemallGoods.STATUS_DRAFT);
        goods.setDeleted(false);
        goodsService.add(goods);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> skus = (List<Map<String, Object>>) body.get("skus");
        if (skus != null && !skus.isEmpty()) {
            BigDecimal minPrice = null;
            for (Map<String, Object> skuMap : skus) {
                ClothingGoodsSku sku = new ClothingGoodsSku();
                sku.setGoodsId(goods.getId());
                sku.setColor((String) skuMap.get("color"));
                sku.setSize((String) skuMap.get("size"));

                Object priceObj = skuMap.get("price");
                if (priceObj != null) {
                    BigDecimal price = new BigDecimal(priceObj.toString());
                    sku.setPrice(price);
                    if (minPrice == null || minPrice.compareTo(price) > 0) {
                        minPrice = price;
                    }
                }

                Object stockObj = skuMap.get("stock");
                if (stockObj != null) {
                    sku.setStock(((Number) stockObj).intValue());
                }

                sku.setStatus(ClothingGoodsSku.STATUS_ACTIVE);
                sku.setDeleted(false);
                clothingGoodsSkuService.add(sku);
            }

            if (minPrice != null) {
                goods.setRetailPrice(minPrice);
                // SKU 最低价覆盖了零售价，同步更新 counterPrice
                if (goods.getCounterPrice() == null || goods.getCounterPrice().compareTo(BigDecimal.ZERO) <= 0) {
                    goods.setCounterPrice(minPrice.multiply(new BigDecimal("1.3")).setScale(2, BigDecimal.ROUND_HALF_UP));
                }
                goodsService.updateById(goods);
            }
        }

        return ResponseUtil.ok(goods.getId());
    }

    // ========== 私有方法 ==========

    /**
     * 从请求体提取商品 ID 列表
     * 支持 { id: 123 } 和 { ids: [1,2,3] } 两种格式
     */
    @SuppressWarnings("unchecked")
    private List<Integer> extractIds(Map<String, Object> body) {
        List<Integer> ids = new ArrayList<>();
        Object idsObj = body.get("ids");
        if (idsObj instanceof List) {
            for (Object id : (List<Object>) idsObj) {
                ids.add(((Number) id).intValue());
            }
        } else {
            Object idObj = body.get("id");
            if (idObj != null) {
                ids.add(((Number) idObj).intValue());
            }
        }
        return ids;
    }

    /**
     * 更新商品 SKU 列表（全量覆盖）
     * 提交的 SKU 无 id → 新增，有 id → 更新，已有但未提交 → 删除
     */
    private void updateSkus(Integer goodsId, List<Map<String, Object>> skus) {
        // 获取现有 SKU
        List<ClothingGoodsSku> existingSkus = clothingGoodsSkuService.queryByGoodsId(goodsId);

        // 提交的 SKU ID 集合
        java.util.Set<Integer> submittedIds = new java.util.HashSet<>();

        BigDecimal minPrice = null;
        for (Map<String, Object> skuMap : skus) {
            ClothingGoodsSku sku = new ClothingGoodsSku();
            sku.setGoodsId(goodsId);
            sku.setColor((String) skuMap.get("color"));
            sku.setSize((String) skuMap.get("size"));

            Object priceObj = skuMap.get("price");
            if (priceObj != null) {
                BigDecimal price = new BigDecimal(priceObj.toString());
                sku.setPrice(price);
                if (minPrice == null || minPrice.compareTo(price) > 0) {
                    minPrice = price;
                }
            }

            Object stockObj = skuMap.get("stock");
            if (stockObj != null) {
                sku.setStock(((Number) stockObj).intValue());
            }

            sku.setStatus(ClothingGoodsSku.STATUS_ACTIVE);
            sku.setDeleted(false);

            Object skuIdObj = skuMap.get("id");
            if (skuIdObj != null) {
                // 更新已有 SKU
                sku.setId(((Number) skuIdObj).intValue());
                clothingGoodsSkuService.update(sku);
                submittedIds.add(sku.getId());
            } else {
                // 新增 SKU
                clothingGoodsSkuService.add(sku);
            }
        }

        // 删除未提交的已有 SKU
        for (ClothingGoodsSku existing : existingSkus) {
            if (!submittedIds.contains(existing.getId())) {
                clothingGoodsSkuService.delete(existing.getId());
            }
        }

        // 更新商品最低零售价
        if (minPrice != null) {
            LitemallGoods goods = new LitemallGoods();
            goods.setId(goodsId);
            goods.setRetailPrice(minPrice);
            goodsService.updateById(goods);
        }
    }
}
