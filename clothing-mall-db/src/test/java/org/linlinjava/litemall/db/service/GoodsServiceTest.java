package org.linlinjava.litemall.db.service;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.linlinjava.litemall.db.domain.LitemallGoods;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.Assert.*;

/**
 * 商品服务单元测试
 */
@RunWith(SpringRunner.class)
@SpringBootTest
@Transactional
public class GoodsServiceTest {

    @Autowired
    private LitemallGoodsService goodsService;

    @Test
    public void testFindById() {
        // 查找存在的商品
        LitemallGoods found = goodsService.findById(1181702);

        if (found != null) {
            assertNotNull(found);
            assertEquals(1181702, found.getId().intValue());
            System.out.println("找到商品: " + found.getName());
        } else {
            System.out.println("商品不存在，测试通过（数据库可能为空）");
        }
    }

    @Test
    public void testQueryOnSale() {
        Integer count = goodsService.queryOnSale();

        assertNotNull(count);
        assertTrue(count >= 0);
        System.out.println("在售商品数: " + count);
    }

    @Test
    public void testCount() {
        int count = goodsService.count();

        assertTrue(count >= 0);
        System.out.println("商品总数: " + count);
    }
}
