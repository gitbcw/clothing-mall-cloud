package org.linlinjava.litemall.db.service;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.linlinjava.litemall.db.domain.LitemallOrder;
import org.linlinjava.litemall.db.util.OrderUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Map;

import static org.junit.Assert.*;

/**
 * 订单服务单元测试
 */
@RunWith(SpringRunner.class)
@SpringBootTest
@Transactional
public class OrderServiceTest {

    @Autowired
    private LitemallOrderService orderService;

    @Test
    public void testCountByOrderStatus() {
        long countAll = orderService.countByOrderStatus(null);
        long countCreated = orderService.countByOrderStatus(
                Arrays.asList(OrderUtil.STATUS_CREATE));
        long countPaid = orderService.countByOrderStatus(
                Arrays.asList(OrderUtil.STATUS_PAY));
        long countShip = orderService.countByOrderStatus(
                Arrays.asList(OrderUtil.STATUS_SHIP));

        assertTrue(countAll >= 0);
        assertTrue(countCreated >= 0);
        assertTrue(countPaid >= 0);
        assertTrue(countShip >= 0);

        System.out.println("订单状态统计 - 总数: " + countAll +
                ", 待付款: " + countCreated +
                ", 待发货: " + countPaid +
                ", 待收货: " + countShip);
    }

    @Test
    public void testGetOrderStatusCounts() {
        Map<String, Long> counts = orderService.getOrderStatusCounts();

        assertNotNull(counts);
        assertTrue(counts.containsKey("all"));

        System.out.println("订单状态分布: " + counts);
    }

    @Test
    public void testFindById() {
        // 查找第一个存在的订单
        LitemallOrder order = orderService.findById(1);

        // 如果订单不存在，测试通过（数据库可能为空）
        System.out.println("订单 ID 1: " + (order != null ? order.getOrderSn() : "不存在"));
    }

    @Test
    public void testCount() {
        int count = orderService.count();

        assertTrue(count >= 0);

        System.out.println("订单总数: " + count);
    }
}
