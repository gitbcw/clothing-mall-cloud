package org.linlinjava.litemall.core.service;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.linlinjava.litemall.core.system.FullReductionService;
import org.linlinjava.litemall.core.system.SystemConfig;
import org.linlinjava.litemall.db.domain.LitemallFullReduction;
import org.linlinjava.litemall.db.service.LitemallFullReductionService;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.MockitoJUnitRunner;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * 满减规则计算服务测试
 */
@RunWith(MockitoJUnitRunner.class)
public class FullReductionServiceTest {

    @Mock
    private LitemallFullReductionService fullReductionService;

    @InjectMocks
    private FullReductionService service;

    private LitemallFullReduction createReduction(BigDecimal threshold, BigDecimal discount) {
        LitemallFullReduction reduction = new LitemallFullReduction();
        reduction.setThreshold(threshold);
        reduction.setDiscount(discount);
        reduction.setStatus((byte) 1);
        return reduction;
    }

    // ==================== calculateDiscount 测试 ====================

    @Test
    public void testCalculateDiscount_EmptyRules_ReturnsZero() {
        // Given: 没有启用的满减规则
        when(fullReductionService.queryEnabled()).thenReturn(Collections.emptyList());

        // When
        BigDecimal discount = service.calculateDiscount(new BigDecimal("100.00"));

        // Then
        assertThat(discount).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    public void testCalculateDiscount_NullRules_ReturnsZero() {
        // Given: 规则列表为 null
        when(fullReductionService.queryEnabled()).thenReturn(null);

        // When
        BigDecimal discount = service.calculateDiscount(new BigDecimal("100.00"));

        // Then
        assertThat(discount).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    public void testCalculateDiscount_BelowThreshold_ReturnsZero() {
        // Given: 满200减20规则，订单金额100
        List<LitemallFullReduction> rules = Arrays.asList(
                createReduction(new BigDecimal("200.00"), new BigDecimal("20.00"))
        );
        when(fullReductionService.queryEnabled()).thenReturn(rules);

        // When
        BigDecimal discount = service.calculateDiscount(new BigDecimal("100.00"));

        // Then
        assertThat(discount).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    public void testCalculateDiscount_ReachesThreshold_ReturnsDiscount() {
        // Given: 满200减20规则，订单金额200
        List<LitemallFullReduction> rules = Arrays.asList(
                createReduction(new BigDecimal("200.00"), new BigDecimal("20.00"))
        );
        when(fullReductionService.queryEnabled()).thenReturn(rules);

        // When
        BigDecimal discount = service.calculateDiscount(new BigDecimal("200.00"));

        // Then
        assertThat(discount).isEqualByComparingTo("20.00");
    }

    @Test
    public void testCalculateDiscount_ExceedsThreshold_ReturnsDiscount() {
        // Given: 满200减20规则，订单金额500
        List<LitemallFullReduction> rules = Arrays.asList(
                createReduction(new BigDecimal("200.00"), new BigDecimal("20.00"))
        );
        when(fullReductionService.queryEnabled()).thenReturn(rules);

        // When
        BigDecimal discount = service.calculateDiscount(new BigDecimal("500.00"));

        // Then
        assertThat(discount).isEqualByComparingTo("20.00");
    }

    @Test
    public void testCalculateDiscount_MultipleRules_ReturnsMaxDiscount() {
        // Given: 多个满减规则（满100减10，满200减20，满300减35）
        List<LitemallFullReduction> rules = Arrays.asList(
                createReduction(new BigDecimal("100.00"), new BigDecimal("10.00")),
                createReduction(new BigDecimal("200.00"), new BigDecimal("20.00")),
                createReduction(new BigDecimal("300.00"), new BigDecimal("35.00"))
        );
        when(fullReductionService.queryEnabled()).thenReturn(rules);

        // When: 订单金额250，应该匹配满200减20
        BigDecimal discount = service.calculateDiscount(new BigDecimal("250.00"));

        // Then: 应该返回最高可用的优惠（满200减20）
        assertThat(discount).isEqualByComparingTo("20.00");
    }

    @Test
    public void testCalculateDiscount_MultipleRules_HighestThreshold() {
        // Given: 多个满减规则
        List<LitemallFullReduction> rules = Arrays.asList(
                createReduction(new BigDecimal("100.00"), new BigDecimal("10.00")),
                createReduction(new BigDecimal("200.00"), new BigDecimal("20.00")),
                createReduction(new BigDecimal("300.00"), new BigDecimal("35.00"))
        );
        when(fullReductionService.queryEnabled()).thenReturn(rules);

        // When: 订单金额350，应该匹配满300减35
        BigDecimal discount = service.calculateDiscount(new BigDecimal("350.00"));

        // Then
        assertThat(discount).isEqualByComparingTo("35.00");
    }

    @Test
    public void testCalculateDiscount_BoundaryTest() {
        // Given: 满200减20
        List<LitemallFullReduction> rules = Arrays.asList(
                createReduction(new BigDecimal("200.00"), new BigDecimal("20.00"))
        );
        when(fullReductionService.queryEnabled()).thenReturn(rules);

        // When: 边界值测试 - 刚好199.99
        BigDecimal discount1 = service.calculateDiscount(new BigDecimal("199.99"));

        // Then: 不满足门槛
        assertThat(discount1).isEqualByComparingTo(BigDecimal.ZERO);

        // When: 边界值测试 - 刚好200.00
        BigDecimal discount2 = service.calculateDiscount(new BigDecimal("200.00"));

        // Then: 满足门槛
        assertThat(discount2).isEqualByComparingTo("20.00");
    }

    // ==================== isStackWithCoupon 测试 ====================

    @Test
    public void testIsStackWithCoupon() {
        try (MockedStatic<SystemConfig> mockedConfig = mockStatic(SystemConfig.class)) {
            // Given: 配置允许叠加
            mockedConfig.when(SystemConfig::isFullReductionStackWithCoupon).thenReturn(true);

            // When & Then
            assertThat(service.isStackWithCoupon()).isTrue();

            // Given: 配置不允许叠加
            mockedConfig.when(SystemConfig::isFullReductionStackWithCoupon).thenReturn(false);

            // When & Then
            assertThat(service.isStackWithCoupon()).isFalse();
        }
    }

    // ==================== queryEnabled 测试 ====================

    @Test
    public void testQueryEnabled() {
        // Given
        List<LitemallFullReduction> expected = Arrays.asList(
                createReduction(new BigDecimal("100.00"), new BigDecimal("10.00"))
        );
        when(fullReductionService.queryEnabled()).thenReturn(expected);

        // When
        List<LitemallFullReduction> result = service.queryEnabled();

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getThreshold()).isEqualByComparingTo("100.00");
    }
}
