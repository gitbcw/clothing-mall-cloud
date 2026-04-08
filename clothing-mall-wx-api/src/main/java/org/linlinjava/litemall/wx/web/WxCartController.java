package org.linlinjava.litemall.wx.web;

import org.apache.commons.lang3.ObjectUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.linlinjava.litemall.core.system.FreightService;
import org.linlinjava.litemall.core.system.SystemConfig;
import org.linlinjava.litemall.core.util.JacksonUtil;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.domain.*;
import org.linlinjava.litemall.db.service.*;
import org.linlinjava.litemall.wx.annotation.LoginUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;

import static org.linlinjava.litemall.wx.util.WxResponseCode.GOODS_NO_STOCK;
import static org.linlinjava.litemall.wx.util.WxResponseCode.GOODS_UNSHELVE;

/**
 * 用户购物车服务
 */
@RestController
@RequestMapping("/wx/cart")
@Validated
public class WxCartController {
    private final Log logger = LogFactory.getLog(WxCartController.class);

    @Autowired
    private LitemallCartService cartService;
    @Autowired
    private LitemallGoodsService goodsService;
    @Autowired
    private LitemallGoodsProductService productService;
    @Autowired
    private LitemallAddressService addressService;
    @Autowired
    private LitemallCouponService couponService;
    @Autowired
    private LitemallCouponUserService couponUserService;
    @Autowired
    private CouponVerifyService couponVerifyService;
    @Autowired
    private ClothingGoodsSkuService skuService;
    @Autowired
    private FreightService freightService;
    @Autowired
    private ClothingStoreService clothingStoreService;

    /**
     * 用户购物车信息
     *
     * @param userId 用户ID
     * @return 用户购物车信息
     */
    @GetMapping("index")
    public Object index(@LoginUser Integer userId) {
        if (userId == null) {
            return ResponseUtil.unlogin();
        }

        List<LitemallCart> list = cartService.queryByUid(userId);
        List<LitemallCart> cartList = new ArrayList<>();
        // TODO
        // 如果系统检查商品已删除或已下架，则系统自动删除。
        // 更好的效果应该是告知用户商品失效，允许用户点击按钮来清除失效商品。
        for (LitemallCart cart : list) {
            LitemallGoods goods = goodsService.findById(cart.getGoodsId());
            if (goods == null || !LitemallGoods.STATUS_PUBLISHED.equals(goods.getStatus())) {
                cartService.deleteById(cart.getId());
                logger.debug("系统自动删除失效购物车商品 goodsId=" + cart.getGoodsId() + " productId=" + cart.getProductId());
            }
            else{
                cartList.add(cart);
            }
        }

        Integer goodsCount = 0;
        BigDecimal goodsAmount = new BigDecimal(0.00);
        Integer checkedGoodsCount = 0;
        BigDecimal checkedGoodsAmount = new BigDecimal(0.00);
        for (LitemallCart cart : cartList) {
            goodsCount += cart.getNumber();
            goodsAmount = goodsAmount.add(cart.getPrice().multiply(new BigDecimal(cart.getNumber())));
            if (cart.getChecked()) {
                checkedGoodsCount += cart.getNumber();
                checkedGoodsAmount = checkedGoodsAmount.add(cart.getPrice().multiply(new BigDecimal(cart.getNumber())));
            }
        }
        Map<String, Object> cartTotal = new HashMap<>();
        cartTotal.put("goodsCount", goodsCount);
        cartTotal.put("goodsAmount", goodsAmount);
        cartTotal.put("checkedGoodsCount", checkedGoodsCount);
        cartTotal.put("checkedGoodsAmount", checkedGoodsAmount);

        Map<String, Object> result = new HashMap<>();
        result.put("cartList", cartList);
        result.put("cartTotal", cartTotal);

        return ResponseUtil.ok(result);
    }

    /**
     * 加入商品到购物车
     * <p>
     * 服装店模式：用户只选尺码，价格按商品标价，不依赖 SKU 表。
     * 如果同一商品同一尺码已存在，则增加数量；否则添加新项。
     *
     * @param userId 用户ID
     * @param cart   购物车商品信息， { goodsId: xxx, number: xxx, size: xxx }
     * @return 加入购物车操作结果
     */
    @PostMapping("add")
    public Object add(@LoginUser Integer userId, @RequestBody LitemallCart cart) {
        if (userId == null) {
            return ResponseUtil.unlogin();
        }
        if (cart == null) {
            return ResponseUtil.badArgument();
        }

        Integer number = cart.getNumber().intValue();
        Integer goodsId = cart.getGoodsId();

        if (goodsId == null || number == null || number <= 0) {
            return ResponseUtil.badArgument();
        }

        // 判断商品是否可以购买
        LitemallGoods goods = goodsService.findById(goodsId);
        if (goods == null || !LitemallGoods.STATUS_PUBLISHED.equals(goods.getStatus())) {
            return ResponseUtil.fail(GOODS_UNSHELVE, "商品已下架");
        }

        // 按商品+尺码查找已有购物车项
        String size = cart.getSize();
        LitemallCart existCart = cartService.queryExistBySize(goodsId, size, userId);
        if (existCart == null) {
            cart.setId(null);
            cart.setGoodsSn(goods.getGoodsSn());
            cart.setGoodsName(goods.getName());
            cart.setPicUrl(goods.getPicUrl());
            // 价格：特价优先，否则取零售价
            if (Boolean.TRUE.equals(goods.getIsSpecialPrice()) && goods.getSpecialPrice() != null) {
                cart.setPrice(goods.getSpecialPrice());
            } else {
                cart.setPrice(goods.getRetailPrice());
            }
            cart.setUserId(userId);
            cart.setChecked(true);
            cart.setSize(size);
            cartService.add(cart);
        } else {
            int num = existCart.getNumber() + number;
            existCart.setNumber((short) num);
            if (cartService.updateById(existCart) == 0) {
                return ResponseUtil.updatedDataFailed();
            }
        }
        return goodscount(userId);
    }

    /**
     * 立即购买
     * <p>
     * 和add方法的区别在于：
     * 1. 如果购物车内已经存在购物车货品，前者的逻辑是数量添加，这里的逻辑是数量覆盖
     * 2. 添加成功以后，前者的逻辑是返回当前购物车商品数量，这里的逻辑是返回对应购物车项的ID
     *
     * @param userId 用户ID
     * @param cart   购物车商品信息， { goodsId: xxx, number: xxx, size: xxx }
     * @return 立即购买操作结果
     */
    @PostMapping("fastadd")
    public Object fastadd(@LoginUser Integer userId, @RequestBody LitemallCart cart) {
        if (userId == null) {
            return ResponseUtil.unlogin();
        }
        if (cart == null) {
            return ResponseUtil.badArgument();
        }

        Integer number = cart.getNumber().intValue();
        Integer goodsId = cart.getGoodsId();

        if (goodsId == null || number == null || number <= 0) {
            return ResponseUtil.badArgument();
        }

        // 判断商品是否可以购买
        LitemallGoods goods = goodsService.findById(goodsId);
        if (goods == null || !LitemallGoods.STATUS_PUBLISHED.equals(goods.getStatus())) {
            return ResponseUtil.fail(GOODS_UNSHELVE, "商品已下架");
        }

        // 按商品+尺码查找已有购物车项
        String size = cart.getSize();
        LitemallCart existCart = cartService.queryExistBySize(goodsId, size, userId);
        if (existCart == null) {
            cart.setId(null);
            cart.setGoodsSn(goods.getGoodsSn());
            cart.setGoodsName(goods.getName());
            cart.setPicUrl(goods.getPicUrl());
            if (Boolean.TRUE.equals(goods.getIsSpecialPrice()) && goods.getSpecialPrice() != null) {
                cart.setPrice(goods.getSpecialPrice());
            } else {
                cart.setPrice(goods.getRetailPrice());
            }
            cart.setUserId(userId);
            cart.setChecked(true);
            cart.setSize(size);
            cartService.add(cart);
            return ResponseUtil.ok(cart.getId());
        } else {
            existCart.setNumber(number.shortValue());
            if (cartService.updateById(existCart) == 0) {
                return ResponseUtil.updatedDataFailed();
            }
            return ResponseUtil.ok(existCart.getId());
        }
    }

    /**
     * 修改购物车商品货品数量
     *
     * @param userId 用户ID
     * @param cart   购物车商品信息， { id: xxx, goodsId: xxx, productId: xxx, number: xxx }
     * @return 修改结果
     */
    @PostMapping("update")
    public Object update(@LoginUser Integer userId, @RequestBody LitemallCart cart) {
        if (userId == null) {
            return ResponseUtil.unlogin();
        }
        Integer number = cart.getNumber().intValue();
        Integer goodsId = cart.getGoodsId();
        Integer id = cart.getId();
        if (!ObjectUtils.allNotNull(id, number, goodsId)) {
            return ResponseUtil.badArgument();
        }
        if (number <= 0) {
            return ResponseUtil.badArgument();
        }

        // 判断是否存在该购物车项
        LitemallCart existCart = cartService.findById(userId, id);
        if (existCart == null) {
            return ResponseUtil.badArgumentValue();
        }

        // 判断 goodsId 是否一致
        if (!existCart.getGoodsId().equals(goodsId)) {
            return ResponseUtil.badArgumentValue();
        }

        // 判断商品是否可购买
        LitemallGoods goods = goodsService.findById(goodsId);
        if (goods == null || !LitemallGoods.STATUS_PUBLISHED.equals(goods.getStatus())) {
            return ResponseUtil.fail(GOODS_UNSHELVE, "商品已下架");
        }

        existCart.setNumber(number.shortValue());
        if (cartService.updateById(existCart) == 0) {
            return ResponseUtil.updatedDataFailed();
        }
        return ResponseUtil.ok();
    }

    /**
     * 购物车商品货品勾选状态
     * <p>
     * 如果原来没有勾选，则设置勾选状态；如果商品已经勾选，则设置非勾选状态。
     *
     * @param userId 用户ID
     * @param body   购物车商品信息， { productIds: xxx, isChecked: 1/0 }
     * @return 购物车信息
     */
    @PostMapping("checked")
    public Object checked(@LoginUser Integer userId, @RequestBody String body) {
        if (userId == null) {
            return ResponseUtil.unlogin();
        }
        if (body == null) {
            return ResponseUtil.badArgument();
        }

        List<Integer> productIds = JacksonUtil.parseIntegerList(body, "productIds");
        if (productIds == null) {
            return ResponseUtil.badArgument();
        }

        Integer checkValue = JacksonUtil.parseInteger(body, "isChecked");
        if (checkValue == null) {
            return ResponseUtil.badArgument();
        }
        Boolean isChecked = (checkValue == 1);

        cartService.updateCheck(userId, productIds, isChecked);
        return index(userId);
    }

    /**
     * 购物车商品删除
     *
     * @param userId 用户ID
     * @param body   购物车商品信息， { productIds: xxx }
     * @return 购物车信息
     * 成功则
     * {
     * errno: 0,
     * errmsg: '成功',
     * data: xxx
     * }
     * 失败则 { errno: XXX, errmsg: XXX }
     */
    @PostMapping("delete")
    public Object delete(@LoginUser Integer userId, @RequestBody String body) {
        if (userId == null) {
            return ResponseUtil.unlogin();
        }
        if (body == null) {
            return ResponseUtil.badArgument();
        }

        List<Integer> productIds = JacksonUtil.parseIntegerList(body, "productIds");

        if (productIds == null || productIds.size() == 0) {
            return ResponseUtil.badArgument();
        }

        cartService.delete(productIds, userId);
        return index(userId);
    }

    /**
     * 购物车商品货品数量
     * <p>
     * 如果用户没有登录，则返回空数据。
     *
     * @param userId 用户ID
     * @return 购物车商品货品数量
     */
    @GetMapping("goodscount")
    public Object goodscount(@LoginUser Integer userId) {
        if (userId == null) {
            return ResponseUtil.ok(0);
        }

        int goodsCount = 0;
        List<LitemallCart> cartList = cartService.queryByUid(userId);
        for (LitemallCart cart : cartList) {
            goodsCount += cart.getNumber();
        }

        return ResponseUtil.ok(goodsCount);
    }

    /**
     * 购物车下单
     *
     * @param userId    用户ID
     * @param cartId    购物车商品ID：
     *                  如果购物车商品ID是空，则下单当前用户所有购物车商品；
     *                  如果购物车商品ID非空，则只下单当前购物车商品。
     * @param addressId 收货地址ID：
     *                  如果收货地址ID是空，则查询当前用户的默认地址。
     * @param couponId  优惠券ID：
     *                  如果优惠券ID是空，则自动选择合适的优惠券。
     * @return 购物车操作结果
     */
    @GetMapping("checkout")
    public Object checkout(@LoginUser Integer userId, Integer cartId, Integer addressId, Integer couponId, Integer userCouponId, String deliveryType) {
        if (userId == null) {
            return ResponseUtil.unlogin();
        }

        // 收货地址
        LitemallAddress checkedAddress = null;
        if (addressId != null && !addressId.equals(0)) {
            checkedAddress = addressService.query(userId, addressId);
        }
        if (checkedAddress == null) {
            checkedAddress = addressService.findDefault(userId);
            // 如果仍然没有地址，则是没有收货地址
            // 返回一个空的地址id=0，这样前端则会提醒添加地址
            if (checkedAddress == null) {
                checkedAddress = new LitemallAddress();
                checkedAddress.setId(0);
                addressId = 0;
            } else {
                addressId = checkedAddress.getId();
            }
        }

        // 商品价格
        List<LitemallCart> checkedGoodsList = null;
        if (cartId == null || cartId.equals(0)) {
            checkedGoodsList = cartService.queryByUidAndChecked(userId);
        } else {
            LitemallCart cart = cartService.findById(userId, cartId);
            if (cart == null) {
                return ResponseUtil.badArgumentValue();
            }
            checkedGoodsList = new ArrayList<>(1);
            checkedGoodsList.add(cart);
        }
        // 检查购物车中是否有已下架商品
        List<LitemallCart> unavailableCarts = new ArrayList<>();
        for (LitemallCart cart : checkedGoodsList) {
            LitemallGoods checkGoods = goodsService.findById(cart.getGoodsId());
            if (checkGoods == null || !LitemallGoods.STATUS_PUBLISHED.equals(checkGoods.getStatus())) {
                unavailableCarts.add(cart);
            }
        }
        if (!unavailableCarts.isEmpty()) {
            for (LitemallCart cart : unavailableCarts) {
                cartService.deleteById(cart.getId());
                checkedGoodsList.remove(cart);
            }
        }

        BigDecimal checkedGoodsPrice = new BigDecimal(0.00);
        for (LitemallCart cart : checkedGoodsList) {
            checkedGoodsPrice = checkedGoodsPrice.add(cart.getPrice().multiply(new BigDecimal(cart.getNumber())));
        }

        // 计算优惠券可用情况
        BigDecimal tmpCouponPrice = new BigDecimal(0.00);
        Integer tmpCouponId = 0;
        Integer tmpUserCouponId = 0;
        int tmpCouponLength = 0;
        List<LitemallCouponUser> couponUserList = couponUserService.queryAll(userId);
        for(LitemallCouponUser couponUser : couponUserList){
            LitemallCoupon coupon = couponVerifyService.checkCoupon(userId, couponUser.getCouponId(), couponUser.getId(), checkedGoodsPrice, checkedGoodsList);
            if(coupon == null){
                continue;
            }

            tmpCouponLength++;
            BigDecimal couponDiscount = couponVerifyService.calculateDiscount(coupon, checkedGoodsList);
            if(tmpCouponPrice.compareTo(couponDiscount) == -1){
                tmpCouponPrice = couponDiscount;
                tmpCouponId = coupon.getId();
                tmpUserCouponId = couponUser.getId();
            }
        }
        // 获取优惠券减免金额，优惠券可用数量
        int availableCouponLength = tmpCouponLength;
        BigDecimal couponPrice = new BigDecimal(0);
        // 这里存在三种情况
        // 1. 用户不想使用优惠券，则不处理
        // 2. 用户想自动使用优惠券，则选择合适优惠券
        // 3. 用户已选择优惠券，则测试优惠券是否合适
        if (couponId == null || couponId.equals(-1)){
            couponId = -1;
            userCouponId = -1;
        }
        else if (couponId.equals(0)) {
            couponPrice = tmpCouponPrice;
            couponId = tmpCouponId;
            userCouponId = tmpUserCouponId;
        }
        else {
            LitemallCoupon coupon = couponVerifyService.checkCoupon(userId, couponId, userCouponId, checkedGoodsPrice, checkedGoodsList);
            // 用户选择的优惠券有问题，则选择合适优惠券，否则使用用户选择的优惠券
            if(coupon == null){
                couponPrice = tmpCouponPrice;
                couponId = tmpCouponId;
                userCouponId = tmpUserCouponId;
            }
            else {
                couponPrice = couponVerifyService.calculateDiscount(coupon, checkedGoodsList);
            }
        }

        // 根据订单商品总价和件数计算运费，自提模式免运费
        BigDecimal freightPrice;
        if ("pickup".equals(deliveryType)) {
            freightPrice = BigDecimal.ZERO;
        } else {
            int totalPieceCount = 0;
            for (LitemallCart cart : checkedGoodsList) {
                totalPieceCount += cart.getNumber();
            }
            freightPrice = freightService.calculateFreight(checkedGoodsPrice, totalPieceCount);
        }

        // 可以使用的其他钱，例如用户积分
        BigDecimal integralPrice = new BigDecimal(0.00);

        // 订单费用
        BigDecimal orderTotalPrice = checkedGoodsPrice.add(freightPrice).subtract(couponPrice).max(new BigDecimal(0.00));

        BigDecimal actualPrice = orderTotalPrice.subtract(integralPrice);

        Map<String, Object> data = new HashMap<>();
        data.put("addressId", addressId);
        data.put("couponId", couponId);
        data.put("userCouponId", userCouponId);
        data.put("cartId", cartId);
        data.put("checkedAddress", checkedAddress);
        data.put("availableCouponLength", availableCouponLength);
        data.put("goodsTotalPrice", checkedGoodsPrice);
        data.put("freightPrice", freightPrice);
        data.put("couponPrice", couponPrice);
        data.put("orderTotalPrice", orderTotalPrice);
        data.put("actualPrice", actualPrice);
        data.put("checkedGoodsList", checkedGoodsList);
        data.put("deliveryType", deliveryType);
        if ("pickup".equals(deliveryType)) {
            data.put("stores", clothingStoreService.queryAll());
        }
        return ResponseUtil.ok(data);
    }
}
