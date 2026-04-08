package org.linlinjava.litemall.admin.service;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.linlinjava.litemall.admin.dto.GoodsAllinone;
import org.linlinjava.litemall.admin.vo.CatVo;
import org.linlinjava.litemall.core.qcode.QCodeService;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.domain.*;
import org.linlinjava.litemall.db.service.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.linlinjava.litemall.admin.util.AdminResponseCode.GOODS_NAME_EXIST;

@Service
public class AdminGoodsService {
    private final Log logger = LogFactory.getLog(AdminGoodsService.class);

    @Autowired
    private LitemallGoodsService goodsService;
    @Autowired
    private LitemallGoodsSpecificationService specificationService;
    @Autowired
    private LitemallGoodsAttributeService attributeService;
    @Autowired
    private LitemallGoodsProductService productService;
    @Autowired
    private LitemallCategoryService categoryService;
    @Autowired
    private LitemallBrandService brandService;
    @Autowired
    private LitemallCartService cartService;
    @Autowired
    private QCodeService qCodeService;

    public Object list(Integer goodsId, String goodsSn, String name, String status,
                       Integer page, Integer limit, String sort, String order) {
        List<LitemallGoods> goodsList = goodsService.querySelective(goodsId, goodsSn, name, status, page, limit, sort, order);
        return ResponseUtil.okList(goodsList);
    }

    private Object validate(GoodsAllinone goodsAllinone) {
        LitemallGoods goods = goodsAllinone.getGoods();
        String name = goods.getName();
        if (StringUtils.isEmpty(name)) {
            return ResponseUtil.badArgument();
        }
        String goodsSn = goods.getGoodsSn();
        if (StringUtils.isEmpty(goodsSn)) {
            return ResponseUtil.badArgument();
        }
        // 品牌商可以不设置，如果设置则需要验证品牌商存在
        Integer brandId = goods.getBrandId();
        if (brandId != null && brandId != 0) {
            if (brandService.findById(brandId) == null) {
                return ResponseUtil.badArgumentValue();
            }
        }
        // 分类可以不设置，如果设置则需要验证分类存在
        Integer categoryId = goods.getCategoryId();
        if (categoryId != null && categoryId != 0) {
            if (categoryService.findById(categoryId) == null) {
                return ResponseUtil.badArgumentValue();
            }
        }

        LitemallGoodsAttribute[] attributes = goodsAllinone.getAttributes();
        for (LitemallGoodsAttribute attribute : attributes) {
            String attr = attribute.getAttribute();
            if (StringUtils.isEmpty(attr)) {
                return ResponseUtil.badArgument();
            }
            String value = attribute.getValue();
            if (StringUtils.isEmpty(value)) {
                return ResponseUtil.badArgument();
            }
        }

        LitemallGoodsSpecification[] specifications = goodsAllinone.getSpecifications();
        for (LitemallGoodsSpecification specification : specifications) {
            String spec = specification.getSpecification();
            if (StringUtils.isEmpty(spec)) {
                return ResponseUtil.badArgument();
            }
            String value = specification.getValue();
            if (StringUtils.isEmpty(value)) {
                return ResponseUtil.badArgument();
            }
        }

        LitemallGoodsProduct[] products = goodsAllinone.getProducts();
        for (LitemallGoodsProduct product : products) {
            Integer number = product.getNumber();
            if (number == null || number < 0) {
                return ResponseUtil.badArgument();
            }

            BigDecimal price = product.getPrice();
            if (price == null) {
                return ResponseUtil.badArgument();
            }

            String[] productSpecifications = product.getSpecifications();
            if (productSpecifications.length == 0) {
                return ResponseUtil.badArgument();
            }
        }

        return null;
    }

    /**
     * 编辑商品
     *
     * NOTE：
     * 由于商品涉及到四个表，特别是litemall_goods_product表依赖litemall_goods_specification表，
     * 这导致允许所有字段都是可编辑会带来一些问题，因此这里商品编辑功能是受限制：
     * （1）litemall_goods表可以编辑字段；
     * （2）litemall_goods_specification表只能编辑pic_url字段，其他操作不支持；
     * （3）litemall_goods_product表只能编辑price, number和url字段，其他操作不支持；
     * （4）litemall_goods_attribute表支持编辑、添加和删除操作。
     *
     * NOTE2:
     * 前后端这里使用了一个小技巧：
     * 如果前端传来的update_time字段是空，则说明前端已经更新了某个记录，则这个记录会更新；
     * 否则说明这个记录没有编辑过，无需更新该记录。
     *
     * NOTE3:
     * （1）购物车缓存了一些商品信息，因此需要及时更新。
     * 目前这些字段是goods_sn, goods_name, price, pic_url。
     * （2）但是订单里面的商品信息则是不会更新。
     * 如果订单是未支付订单，此时仍然以旧的价格支付。
     */
    @Transactional
    public Object update(GoodsAllinone goodsAllinone) {
        Object error = validate(goodsAllinone);
        if (error != null) {
            return error;
        }

        LitemallGoods goods = goodsAllinone.getGoods();
        LitemallGoodsAttribute[] attributes = goodsAllinone.getAttributes();
        LitemallGoodsSpecification[] specifications = goodsAllinone.getSpecifications();
        LitemallGoodsProduct[] products = goodsAllinone.getProducts();

        // retailPrice：前端传入则直接使用，否则从规格中取最低价
        BigDecimal retailPrice = goods.getRetailPrice();
        if (retailPrice == null || retailPrice.compareTo(BigDecimal.ZERO) <= 0) {
            if (products != null && products.length > 0) {
                retailPrice = new BigDecimal(Integer.MAX_VALUE);
                for (LitemallGoodsProduct product : products) {
                    BigDecimal productPrice = product.getPrice();
                    if (retailPrice.compareTo(productPrice) == 1) {
                        retailPrice = productPrice;
                    }
                }
            } else {
                retailPrice = BigDecimal.ZERO;
            }
        }
        goods.setRetailPrice(retailPrice);

        // counterPrice（专柜价/划线价）：按零售价自动上浮30%
        BigDecimal counterPrice = goods.getCounterPrice();
        if (counterPrice == null || counterPrice.compareTo(BigDecimal.ZERO) <= 0) {
            goods.setCounterPrice(retailPrice.multiply(new BigDecimal("1.3")).setScale(2, BigDecimal.ROUND_HALF_UP));
        }

        // 场景标签：将名称数组转为 JSON 字符串存入 scene_tags 字段
        String[] sceneTags = goodsAllinone.getSceneTags();
        if (sceneTags != null && sceneTags.length > 0) {
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < sceneTags.length; i++) {
                if (i > 0) sb.append(",");
                sb.append("\"").append(sceneTags[i].replace("\"", "\\\"")).append("\"");
            }
            goods.setSceneTags(sb.append("]").toString());
        } else {
            goods.setSceneTags(null);
        }

        // 商品基本信息表litemall_goods
        if (goodsService.updateById(goods) == 0) {
            throw new RuntimeException("更新数据失败");
        }

        Integer gid = goods.getId();

        // 商品规格表litemall_goods_specification
        for (LitemallGoodsSpecification specification : specifications) {
            // 目前只支持更新规格表的图片字段
            if(specification.getUpdateTime() == null){
                specification.setSpecification(null);
                specification.setValue(null);
                specificationService.updateById(specification);
            }
        }

        // 商品货品表litemall_product
        for (LitemallGoodsProduct product : products) {
            if(product.getUpdateTime() == null) {
                productService.updateById(product);
            }
        }

        // 商品参数表litemall_goods_attribute
        for (LitemallGoodsAttribute attribute : attributes) {
            if (attribute.getId() == null || attribute.getId().equals(0)){
                attribute.setGoodsId(goods.getId());
                attributeService.add(attribute);
            }
            else if(attribute.getDeleted()){
                attributeService.deleteById(attribute.getId());
            }
            else if(attribute.getUpdateTime() == null){
                attributeService.updateById(attribute);
            }
        }

        // 这里需要注意的是购物车litemall_cart有些字段是拷贝商品的一些字段，因此需要及时更新
        // 目前这些字段是goods_sn, goods_name, price, pic_url
        for (LitemallGoodsProduct product : products) {
            cartService.updateProduct(product.getId(), goods.getGoodsSn(), goods.getName(), product.getPrice(), product.getUrl());
        }

        return ResponseUtil.ok();
    }

    @Transactional
    public Object delete(LitemallGoods goods) {
        Integer id = goods.getId();
        if (id == null) {
            return ResponseUtil.badArgument();
        }

        Integer gid = goods.getId();
        goodsService.deleteById(gid);
        specificationService.deleteByGid(gid);
        attributeService.deleteByGid(gid);
        productService.deleteByGid(gid);
        return ResponseUtil.ok();
    }

    @Transactional
    public Object create(GoodsAllinone goodsAllinone) {
        Object error = validate(goodsAllinone);
        if (error != null) {
            return error;
        }

        LitemallGoods goods = goodsAllinone.getGoods();
        LitemallGoodsAttribute[] attributes = goodsAllinone.getAttributes();
        LitemallGoodsSpecification[] specifications = goodsAllinone.getSpecifications();
        LitemallGoodsProduct[] products = goodsAllinone.getProducts();

        String name = goods.getName();
        if (goodsService.checkExistByName(name)) {
            return ResponseUtil.fail(GOODS_NAME_EXIST, "商品名已经存在");
        }

        // retailPrice：前端传入则直接使用，否则从规格中取最低价
        BigDecimal retailPrice = goods.getRetailPrice();
        if (retailPrice == null || retailPrice.compareTo(BigDecimal.ZERO) <= 0) {
            if (products != null && products.length > 0) {
                retailPrice = new BigDecimal(Integer.MAX_VALUE);
                for (LitemallGoodsProduct product : products) {
                    BigDecimal productPrice = product.getPrice();
                    if (retailPrice.compareTo(productPrice) == 1) {
                        retailPrice = productPrice;
                    }
                }
            } else {
                retailPrice = BigDecimal.ZERO;
            }
        }
        goods.setRetailPrice(retailPrice);

        // counterPrice（专柜价/划线价）：按零售价自动上浮30%
        BigDecimal counterPrice = goods.getCounterPrice();
        if (counterPrice == null || counterPrice.compareTo(BigDecimal.ZERO) <= 0) {
            goods.setCounterPrice(retailPrice.multiply(new BigDecimal("1.3")).setScale(2, BigDecimal.ROUND_HALF_UP));
        }

        // 商品基本信息表litemall_goods
        goodsService.add(goods);

        // 商品规格表litemall_goods_specification
        // 从products数组自动生成规格表记录
        // 提取规格名称列表（按出现顺序去重）
        String[] specNames = extractSpecificationNames(specifications);
        generateSpecificationsFromProducts(goods.getId(), products, specNames);

        // 商品规格表litemall_goods_specification（兼容旧数据，如果前端仍传规格则处理）
        for (LitemallGoodsSpecification specification : specifications) {
            specification.setGoodsId(goods.getId());
            specificationService.add(specification);
        }

        // 商品参数表litemall_goods_attribute
        for (LitemallGoodsAttribute attribute : attributes) {
            attribute.setGoodsId(goods.getId());
            attributeService.add(attribute);
        }

        // 商品货品表litemall_product
        for (LitemallGoodsProduct product : products) {
            product.setGoodsId(goods.getId());
            productService.add(product);
        }

        return ResponseUtil.ok();
    }

    public Object list2() {
        // http://element-cn.eleme.io/#/zh-CN/component/select
        // 管理员设置“所属分类”
        List<LitemallCategory> l1CatList = categoryService.queryL1();
        List<CatVo> categoryList = new ArrayList<>(l1CatList.size());

        for (LitemallCategory l1 : l1CatList) {
            CatVo l1CatVo = new CatVo();
            l1CatVo.setValue(l1.getId());
            l1CatVo.setLabel(l1.getName());
            categoryList.add(l1CatVo);
        }

        // http://element-cn.eleme.io/#/zh-CN/component/select
        // 管理员设置“所属品牌商”
        List<LitemallBrand> list = brandService.all();
        List<Map<String, Object>> brandList = new ArrayList<>(l1CatList.size());
        for (LitemallBrand brand : list) {
            Map<String, Object> b = new HashMap<>(2);
            b.put("value", brand.getId());
            b.put("label", brand.getName());
            brandList.add(b);
        }

        Map<String, Object> data = new HashMap<>();
        data.put("categoryList", categoryList);
        data.put("brandList", brandList);
        return ResponseUtil.ok(data);
    }

    public Object detail(Integer id) {
        LitemallGoods goods = goodsService.findById(id);
        List<LitemallGoodsProduct> products = productService.queryByGid(id);
        List<LitemallGoodsSpecification> specifications = specificationService.queryByGid(id);
        List<LitemallGoodsAttribute> attributes = attributeService.queryByGid(id);

        Integer categoryId = goods.getCategoryId();
        LitemallCategory category = categoryService.findById(categoryId);
        Integer[] categoryIds = new Integer[]{};
        if (category != null) {
            categoryIds = new Integer[]{categoryId};
        }

        Map<String, Object> data = new HashMap<>();
        data.put("goods", goods);
        data.put("specifications", specifications);
        data.put("products", products);
        data.put("attributes", attributes);
        data.put("categoryIds", categoryIds);

        return ResponseUtil.ok(data);
    }

    /**
     * 根据款号查询商品
     *
     * @param goodsSn 商品款号
     * @return 商品详情（复用 detail 方法的返回格式）
     */
    public Object findBySn(String goodsSn) {
        if (StringUtils.isEmpty(goodsSn)) {
            return ResponseUtil.badArgument();
        }

        LitemallGoods goods = goodsService.findByGoodsSn(goodsSn);
        if (goods == null) {
            return ResponseUtil.fail(404, "商品不存在");
        }

        // 复用 detail 方法的逻辑
        return detail(goods.getId());
    }

    /**
     * 手动生成商品分享海报
     *
     * @param id 商品ID
     * @return
     */
    public Object generateShareImage(Integer id) {
        LitemallGoods goods = goodsService.findById(id);
        if (goods == null) {
            return ResponseUtil.badArgumentValue();
        }

        // 生成分享海报
        String shareUrl = qCodeService.createGoodShareImage(id.toString(), goods.getPicUrl(), goods.getName());
        if (StringUtils.isEmpty(shareUrl)) {
            return ResponseUtil.fail(500, "生成分享海报失败");
        }

        // 更新商品分享图URL
        goods.setShareUrl(shareUrl);
        if (goodsService.updateById(goods) == 0) {
            return ResponseUtil.updatedDataFailed();
        }

        Map<String, Object> data = new HashMap<>();
        data.put("shareUrl", shareUrl);
        return ResponseUtil.ok(data);
    }

    public Object publish(List<Integer> ids) {
        goodsService.updateStatusBatch(ids, LitemallGoods.STATUS_PUBLISHED);
        return ResponseUtil.ok();
    }

    public Object unpublish(List<Integer> ids) {
        goodsService.updateStatusBatch(ids, LitemallGoods.STATUS_PENDING);
        return ResponseUtil.ok();
    }

    public Object unpublishAll() {
        goodsService.updateAllStatus(LitemallGoods.STATUS_PENDING);
        return ResponseUtil.ok();
    }

    /**
     * 从products数组自动生成goods_specification表记录
     * specifications数组格式：
     *   - 新格式(带规格名): ["颜色:红色,尺码:S", "颜色:蓝色,尺码:M"]
     *   - 旧格式(纯值): ["红色", "S"] (需要结合specificationsNames参数)
     *
     * @param goodsId 商品ID
     * @param products SKU数组
     * @param specificationsNames 规格名称数组，用于旧格式纯值解析，如["颜色", "尺码"]
     */
    private void generateSpecificationsFromProducts(Integer goodsId, LitemallGoodsProduct[] products, String[] specificationsNames) {
        // 使用Map存储规格名->规格值集合的去重结果
        Map<String, Set<String>> specMap = new HashMap<>();

        for (LitemallGoodsProduct product : products) {
            String[] specs = product.getSpecifications();
            if (specs == null || specs.length == 0) {
                continue;
            }

            for (int i = 0; i < specs.length; i++) {
                String specStr = specs[i];

                // 格式1: "颜色:红色,尺码:S" (新格式，带规格名和值)
                if (specStr.contains(":") && specStr.contains(",")) {
                    String[] parts = specStr.split(",");
                    for (String part : parts) {
                        parseAndAddSpec(specMap, part.trim());
                    }
                }
                // 格式2: "颜色:红色" (新格式，单个带规格名)
                else if (specStr.contains(":")) {
                    parseAndAddSpec(specMap, specStr.trim());
                }
                // 格式3: "红色" (旧格式纯值，需要结合规格名称)
                else if (specificationsNames != null && i < specificationsNames.length) {
                    String specName = specificationsNames[i];
                    String specValue = specStr.trim();
                    if (!specName.isEmpty() && !specValue.isEmpty()) {
                        specMap.computeIfAbsent(specName, k -> new HashSet<>()).add(specValue);
                    }
                }
            }
        }

        // 将去重后的规格写入数据库
        for (Map.Entry<String, Set<String>> entry : specMap.entrySet()) {
            String specName = entry.getKey();
            for (String specValue : entry.getValue()) {
                LitemallGoodsSpecification spec = new LitemallGoodsSpecification();
                spec.setGoodsId(goodsId);
                spec.setSpecification(specName);
                spec.setValue(specValue);
                specificationService.add(spec);
            }
        }
    }

    /**
     * 从products数组自动生成goods_specification表记录(重载，默认不使用规格名解析)
     */
    private void generateSpecificationsFromProducts(Integer goodsId, LitemallGoodsProduct[] products) {
        generateSpecificationsFromProducts(goodsId, products, null);
    }

    /**
     * 解析单个规格字符串并添加到Map
     * 格式: "颜色:红色" -> {颜色: 红色}
     */
    private void parseAndAddSpec(Map<String, Set<String>> specMap, String specStr) {
        if (specStr == null || specStr.isEmpty() || !specStr.contains(":")) {
            return;
        }
        String[] parts = specStr.split(":");
        if (parts.length >= 2) {
            String specName = parts[0].trim();
            String specValue = parts[1].trim();
            if (!specName.isEmpty() && !specValue.isEmpty()) {
                specMap.computeIfAbsent(specName, k -> new HashSet<>()).add(specValue);
            }
        }
    }

    /**
     * 从规格数组中提取规格名称列表（按出现顺序去重）
     * 输入: [{specification: '颜色', value: '红色'}, {specification: '颜色', value: '蓝色'}, {specification: '尺码', value: 'S'}]
     * 输出: ['颜色', '尺码']
     */
    private String[] extractSpecificationNames(LitemallGoodsSpecification[] specifications) {
        if (specifications == null || specifications.length == 0) {
            return new String[0];
        }
        List<String> names = new ArrayList<>();
        Set<String> nameSet = new HashSet<>();
        for (LitemallGoodsSpecification spec : specifications) {
            String name = spec.getSpecification();
            if (name != null && !nameSet.contains(name)) {
                nameSet.add(name);
                names.add(name);
            }
        }
        return names.toArray(new String[0]);
    }

}
