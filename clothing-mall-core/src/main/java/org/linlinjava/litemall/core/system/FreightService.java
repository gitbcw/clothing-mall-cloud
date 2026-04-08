package org.linlinjava.litemall.core.system;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

/**
 * 运费计算服务
 *
 * 支持多种运费计算模式：
 * 1. 固定运费 + 满额包邮（默认）
 * 2. 按件数计费
 * 3. 按重量计费（需商品支持重量字段）
 *
 * 配置项：
 * - litemall_express_freight_type: 运费类型 (0=固定, 1=按件数, 2=按重量)
 * - litemall_express_freight_value: 基础运费/首件运费/首重运费
 * - litemall_express_freight_min: 满额包邮金额
 * - litemall_express_freight_additional: 续件/续重运费（按件数/重量时使用）
 * - litemall_express_freight_first_unit: 首件数量/首重重量
 * - litemall_express_freight_additional_unit: 续件数量/续重重量
 */
@Service
public class FreightService {

    // 运费类型常量
    public static final int FREIGHT_TYPE_FIXED = 0;      // 固定运费
    public static final int FREIGHT_TYPE_BY_PIECE = 1;   // 按件数
    public static final int FREIGHT_TYPE_BY_WEIGHT = 2;  // 按重量

    /**
     * 计算运费（按件数）
     *
     * @param checkedGoodsPrice 商品总价
     * @param totalPieceCount   商品总件数
     * @return 运费金额
     */
    public BigDecimal calculateFreight(BigDecimal checkedGoodsPrice, int totalPieceCount) {
        // 满额包邮检查
        BigDecimal freightMin = SystemConfig.getFreightLimit();
        if (freightMin != null && checkedGoodsPrice.compareTo(freightMin) >= 0) {
            return BigDecimal.ZERO;
        }

        // 获取运费类型，默认固定运费
        int freightType = getFreightType();

        switch (freightType) {
            case FREIGHT_TYPE_BY_PIECE:
                return calculateByPiece(totalPieceCount);
            case FREIGHT_TYPE_BY_WEIGHT:
                // 按重量暂不支持，降级为按件数
                return calculateByPiece(totalPieceCount);
            case FREIGHT_TYPE_FIXED:
            default:
                return SystemConfig.getFreight();
        }
    }

    /**
     * 快递配送运费计算（简化版，只根据商品总价，固定运费模式）
     */
    public BigDecimal calculateFreight(BigDecimal checkedGoodsPrice) {
        // 满额包邮检查
        BigDecimal freightMin = SystemConfig.getFreightLimit();
        if (freightMin != null && checkedGoodsPrice.compareTo(freightMin) >= 0) {
            return BigDecimal.ZERO;
        }

        // 固定运费
        return SystemConfig.getFreight();
    }

    /**
     * 按件数计算运费
     */
    private BigDecimal calculateByPiece(int totalCount) {
        BigDecimal firstFreight = SystemConfig.getFreight();
        BigDecimal additionalFreight = getAdditionalFreight();
        int firstUnit = getFirstUnit();
        int additionalUnit = getAdditionalUnit();

        if (totalCount <= firstUnit) {
            return firstFreight;
        }

        int additionalCount = totalCount - firstUnit;
        int additionalUnits = (int) Math.ceil((double) additionalCount / additionalUnit);

        return firstFreight.add(additionalFreight.multiply(BigDecimal.valueOf(additionalUnits)));
    }

    /**
     * 获取运费类型
     */
    private int getFreightType() {
        String type = SystemConfig.getConfigValue("litemall_express_freight_type");
        if (type == null || type.isEmpty()) {
            return FREIGHT_TYPE_FIXED;
        }
        try {
            return Integer.parseInt(type);
        } catch (NumberFormatException e) {
            return FREIGHT_TYPE_FIXED;
        }
    }

    /**
     * 获取续件/续重运费
     */
    private BigDecimal getAdditionalFreight() {
        String value = SystemConfig.getConfigValue("litemall_express_freight_additional");
        if (value == null || value.isEmpty()) {
            return BigDecimal.ZERO;
        }
        try {
            return new BigDecimal(value);
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }

    /**
     * 获取首件/首重单位
     */
    private int getFirstUnit() {
        String value = SystemConfig.getConfigValue("litemall_express_freight_first_unit");
        if (value == null || value.isEmpty()) {
            return 1;
        }
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return 1;
        }
    }

    /**
     * 获取续件/续重单位
     */
    private int getAdditionalUnit() {
        String value = SystemConfig.getConfigValue("litemall_express_freight_additional_unit");
        if (value == null || value.isEmpty()) {
            return 1;
        }
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return 1;
        }
    }
}
