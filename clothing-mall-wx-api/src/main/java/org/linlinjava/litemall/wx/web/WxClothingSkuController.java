package org.linlinjava.litemall.wx.web;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.domain.ClothingGoodsSku;
import org.linlinjava.litemall.db.service.ClothingGoodsSkuService;
import org.linlinjava.litemall.wx.annotation.LoginUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.constraints.NotNull;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 小程序端 - 商品 SKU 服务
 */
@RestController
@RequestMapping("/wx/clothing/sku")
@Validated
public class WxClothingSkuController {
    private final Log logger = LogFactory.getLog(WxClothingSkuController.class);

    @Autowired
    private ClothingGoodsSkuService skuService;

    /**
     * 获取商品的 SKU 列表
     */
    @GetMapping("/list")
    public Object list(@NotNull Integer goodsId) {
        List<ClothingGoodsSku> skuList = skuService.queryByGoodsId(goodsId);

        // 提取颜色列表（去重）
        List<Map<String, Object>> colors = skuList.stream()
                .collect(Collectors.groupingBy(ClothingGoodsSku::getColor))
                .keySet().stream()
                .map(color -> {
                    Map<String, Object> colorMap = new HashMap<>();
                    colorMap.put("name", color);
                    // 取该颜色的第一个 SKU 图片
                    ClothingGoodsSku firstSku = skuList.stream()
                            .filter(s -> color.equals(s.getColor()))
                            .findFirst().orElse(null);
                    if (firstSku != null) {
                        colorMap.put("image", firstSku.getColorImage() != null ?
                                firstSku.getColorImage() : firstSku.getImageUrl());
                    }
                    return colorMap;
                })
                .collect(Collectors.toList());

        // 提取尺码列表（去重）
        List<String> sizes = skuList.stream()
                .map(ClothingGoodsSku::getSize)
                .distinct()
                .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("skuList", skuList);
        result.put("colors", colors);
        result.put("sizes", sizes);

        return ResponseUtil.ok(result);
    }

    /**
     * 获取指定颜色下的尺码列表
     */
    @GetMapping("/sizes")
    public Object getSizes(@NotNull Integer goodsId, @NotNull String color) {
        List<ClothingGoodsSku> skuList = skuService.queryByGoodsIdAndColor(goodsId, color);
        return ResponseUtil.ok(skuList);
    }

    /**
     * 获取单个 SKU 详情
     */
    @GetMapping("/detail")
    public Object detail(@NotNull Integer id) {
        ClothingGoodsSku sku = skuService.findById(id);
        if (sku == null) {
            return ResponseUtil.badArgumentValue();
        }
        return ResponseUtil.ok(sku);
    }

    /**
     * 根据商品ID、颜色、尺码获取 SKU
     */
    @GetMapping("/query")
    public Object query(@NotNull Integer goodsId, @NotNull String color, @NotNull String size) {
        ClothingGoodsSku sku = skuService.queryByGoodsIdColorSize(goodsId, color, size);
        if (sku == null) {
            return ResponseUtil.badArgumentValue();
        }
        return ResponseUtil.ok(sku);
    }

    /**
     * 检查库存
     */
    @GetMapping("/checkStock")
    public Object checkStock(@NotNull Integer id, @NotNull Integer num) {
        ClothingGoodsSku sku = skuService.findById(id);
        if (sku == null) {
            return ResponseUtil.badArgumentValue();
        }

        Map<String, Object> result = new HashMap<>();
        result.put("inStock", sku.getStock() >= num);
        result.put("stock", sku.getStock());

        return ResponseUtil.ok(result);
    }
}
