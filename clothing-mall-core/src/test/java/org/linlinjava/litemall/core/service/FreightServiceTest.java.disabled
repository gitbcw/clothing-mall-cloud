package org.linlinjava.litemall.core.service;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.linlinjava.litemall.core.system.FreightService;
import org.linlinjava.litemall.core.system.SystemConfig;
import org.mockito.InjectMocks;
import org.mockito.MockedStatic;
import org.mockito.junit.MockitoJUnitRunner;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * 运费计算服务测试
 */
@RunWith(MockitoJUnitRunner.class)
public class FreightServiceTest {

    @InjectMocks
    private FreightService freightService;

    // ==================== 固定运费模式测试 ====================

    @Test
    public void testCalculateFreight_FixedFreight_BelowLimit() {
        try (MockedStatic<SystemConfig> mockedConfig = mockStatic(SystemConfig.class)) {
            // Given: 固定运费10元，满99包邮，订单金额50
            mockedConfig.when(SystemConfig::getFreight).thenReturn(new BigDecimal("10.00"));
            mockedConfig.when(SystemConfig::getFreightLimit).thenReturn(new BigDecimal("99.00"));
            mockedConfig.when(() -> SystemConfig.getConfigValue("litemall_express_freight_type")).thenReturn("0");

            // When
            BigDecimal freight = freightService.calculateFreight(new BigDecimal("50.00"));

            // Then
            assertThat(freight).isEqualByComparingTo("10.00");
        }
    }

    @Test
    public void testCalculateFreight_FixedFreight_ExceedsLimit_FreeShipping() {
        try (MockedStatic<SystemConfig> mockedConfig = mockStatic(SystemConfig.class)) {
            // Given: 固定运费10元，满99包邮，订单金额100
            mockedConfig.when(SystemConfig::getFreight).thenReturn(new BigDecimal("10.00"));
            mockedConfig.when(SystemConfig::getFreightLimit).thenReturn(new BigDecimal("99.00"));

            // When
            BigDecimal freight = freightService.calculateFreight(new BigDecimal("100.00"));

            // Then: 满额包邮
            assertThat(freight).isEqualByComparingTo(BigDecimal.ZERO);
        }
    }

    @Test
    public void testCalculateFreight_FixedFreight_ExactlyAtLimit_FreeShipping() {
        try (MockedStatic<SystemConfig> mockedConfig = mockStatic(SystemConfig.class)) {
            // Given: 固定运费10元，满99包邮，订单金额刚好99
            mockedConfig.when(SystemConfig::getFreight).thenReturn(new BigDecimal("10.00"));
            mockedConfig.when(SystemConfig::getFreightLimit).thenReturn(new BigDecimal("99.00"));

            // When
            BigDecimal freight = freightService.calculateFreight(new BigDecimal("99.00"));

            // Then: 刚好满足门槛，包邮
            assertThat(freight).isEqualByComparingTo(BigDecimal.ZERO);
        }
    }

    @Test
    public void testCalculateFreight_NoFreeShippingLimit() {
        try (MockedStatic<SystemConfig> mockedConfig = mockStatic(SystemConfig.class)) {
            // Given: 固定运费10元，无满额包邮限制
            mockedConfig.when(SystemConfig::getFreight).thenReturn(new BigDecimal("10.00"));
            mockedConfig.when(SystemConfig::getFreightLimit).thenReturn(null);

            // When: 大额订单
            BigDecimal freight = freightService.calculateFreight(new BigDecimal("10000.00"));

            // Then: 仍然收运费
            assertThat(freight).isEqualByComparingTo("10.00");
        }
    }

    // ==================== 按件数计费模式测试 ====================

    @Test
    public void testCalculateFreight_ByPiece_FirstUnitOnly() {
        try (MockedStatic<SystemConfig> mockedConfig = mockStatic(SystemConfig.class)) {
            // Given: 首件10元，续件5元/件，首件1件，满99包邮
            mockedConfig.when(SystemConfig::getFreight).thenReturn(new BigDecimal("10.00"));
            mockedConfig.when(SystemConfig::getFreightLimit).thenReturn(new BigDecimal("99.00"));
            mockedConfig.when(() -> SystemConfig.getConfigValue("litemall_express_freight_type")).thenReturn("1");
            mockedConfig.when(() -> SystemConfig.getConfigValue("litemall_express_freight_additional")).thenReturn("5.00");
            mockedConfig.when(() -> SystemConfig.getConfigValue("litemall_express_freight_first_unit")).thenReturn("1");
            mockedConfig.when(() -> SystemConfig.getConfigValue("litemall_express_freight_additional_unit")).thenReturn("1");

            // When: 1件商品，订单金额50
            BigDecimal freight = freightService.calculateFreight(new BigDecimal("50.00"), 1);

            // Then: 首件运费
            assertThat(freight).isEqualByComparingTo("10.00");
        }
    }

    @Test
    public void testCalculateFreight_ByPiece_MultiplePieces() {
        try (MockedStatic<SystemConfig> mockedConfig = mockStatic(SystemConfig.class)) {
            // Given: 首件10元，续件5元/件
            mockedConfig.when(SystemConfig::getFreight).thenReturn(new BigDecimal("10.00"));
            mockedConfig.when(SystemConfig::getFreightLimit).thenReturn(new BigDecimal("99.00"));
            mockedConfig.when(() -> SystemConfig.getConfigValue("litemall_express_freight_type")).thenReturn("1");
            mockedConfig.when(() -> SystemConfig.getConfigValue("litemall_express_freight_additional")).thenReturn("5.00");
            mockedConfig.when(() -> SystemConfig.getConfigValue("litemall_express_freight_first_unit")).thenReturn("1");
            mockedConfig.when(() -> SystemConfig.getConfigValue("litemall_express_freight_additional_unit")).thenReturn("1");

            // When: 3件商品，订单金额50（不满包邮）
            // 计算：首件10 + (3-1)*5 = 20
            BigDecimal freight = freightService.calculateFreight(new BigDecimal("50.00"), 3);

            // Then
            assertThat(freight).isEqualByComparingTo("20.00");
        }
    }

    @Test
    public void testCalculateFreight_ByPiece_WithFirstUnitMultiple() {
        try (MockedStatic<SystemConfig> mockedConfig = mockStatic(SystemConfig.class)) {
            // Given: 首件2件内10元，续件每件5元
            mockedConfig.when(SystemConfig::getFreight).thenReturn(new BigDecimal("10.00"));
            mockedConfig.when(SystemConfig::getFreightLimit).thenReturn(new BigDecimal("99.00"));
            mockedConfig.when(() -> SystemConfig.getConfigValue("litemall_express_freight_type")).thenReturn("1");
            mockedConfig.when(() -> SystemConfig.getConfigValue("litemall_express_freight_additional")).thenReturn("5.00");
            mockedConfig.when(() -> SystemConfig.getConfigValue("litemall_express_freight_first_unit")).thenReturn("2");
            mockedConfig.when(() -> SystemConfig.getConfigValue("litemall_express_freight_additional_unit")).thenReturn("1");

            // When: 5件商品
            // 计算：首件2件内10元 + 超出3件*5元 = 25
            BigDecimal freight = freightService.calculateFreight(new BigDecimal("50.00"), 5);

            // Then
            assertThat(freight).isEqualByComparingTo("25.00");
        }
    }

    @Test
    public void testCalculateFreight_ByPiece_FreeShipping() {
        try (MockedStatic<SystemConfig> mockedConfig = mockStatic(SystemConfig.class)) {
            // Given: 按件数计费，满99包邮
            mockedConfig.when(SystemConfig::getFreight).thenReturn(new BigDecimal("10.00"));
            mockedConfig.when(SystemConfig::getFreightLimit).thenReturn(new BigDecimal("99.00"));
            mockedConfig.when(() -> SystemConfig.getConfigValue("litemall_express_freight_type")).thenReturn("1");
            mockedConfig.when(() -> SystemConfig.getConfigValue("litemall_express_freight_additional")).thenReturn("5.00");
            mockedConfig.when(() -> SystemConfig.getConfigValue("litemall_express_freight_first_unit")).thenReturn("1");
            mockedConfig.when(() -> SystemConfig.getConfigValue("litemall_express_freight_additional_unit")).thenReturn("1");

            // When: 满额包邮
            BigDecimal freight = freightService.calculateFreight(new BigDecimal("100.00"), 5);

            // Then
            assertThat(freight).isEqualByComparingTo(BigDecimal.ZERO);
        }
    }

    // ==================== 边界情况测试 ====================

    @Test
    public void testCalculateFreight_ZeroOrder() {
        try (MockedStatic<SystemConfig> mockedConfig = mockStatic(SystemConfig.class)) {
            // Given
            mockedConfig.when(SystemConfig::getFreight).thenReturn(new BigDecimal("10.00"));
            mockedConfig.when(SystemConfig::getFreightLimit).thenReturn(new BigDecimal("99.00"));

            // When: 订单金额为0
            BigDecimal freight = freightService.calculateFreight(BigDecimal.ZERO);

            // Then: 仍需付运费
            assertThat(freight).isEqualByComparingTo("10.00");
        }
    }

    @Test
    public void testCalculateFreight_NegativeOrder() {
        try (MockedStatic<SystemConfig> mockedConfig = mockStatic(SystemConfig.class)) {
            // Given
            mockedConfig.when(SystemConfig::getFreight).thenReturn(new BigDecimal("10.00"));
            mockedConfig.when(SystemConfig::getFreightLimit).thenReturn(new BigDecimal("99.00"));

            // When: 订单金额为负（异常情况）
            BigDecimal freight = freightService.calculateFreight(new BigDecimal("-10.00"));

            // Then: 仍需付运费
            assertThat(freight).isEqualByComparingTo("10.00");
        }
    }

    @Test
    public void testCalculateFreight_InvalidFreightType_DefaultsToFixed() {
        try (MockedStatic<SystemConfig> mockedConfig = mockStatic(SystemConfig.class)) {
            // Given: 无效的运费类型
            mockedConfig.when(SystemConfig::getFreight).thenReturn(new BigDecimal("10.00"));
            mockedConfig.when(SystemConfig::getFreightLimit).thenReturn(new BigDecimal("99.00"));
            mockedConfig.when(() -> SystemConfig.getConfigValue("litemall_express_freight_type")).thenReturn("invalid");

            // When
            BigDecimal freight = freightService.calculateFreight(new BigDecimal("50.00"), 3);

            // Then: 降级为固定运费
            assertThat(freight).isEqualByComparingTo("10.00");
        }
    }
}
