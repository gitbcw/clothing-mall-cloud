package org.linlinjava.litemall.core;

import org.junit.Test;
import org.linlinjava.litemall.core.express.ExpressService;
import org.linlinjava.litemall.core.express.config.ExpressProperties;
import org.linlinjava.litemall.core.express.dao.ExpressInfo;
import org.linlinjava.litemall.core.express.dao.Traces;

import java.util.List;

import static org.junit.Assert.*;

/**
 * 快递物流查询测试
 * 独立构建 ExpressService，不依赖 Spring 容器
 */
public class ExpressTest {

    private static final String APPCODE = "6a8b631f4ea940c3b3440db715d0d740";
    private static final String TRACKING_NO = "YT8854349696964";

    private ExpressService createService() {
        ExpressProperties props = new ExpressProperties();
        props.setEnable(true);
        props.setAppcode(APPCODE);
        ExpressService service = new ExpressService();
        service.setProperties(props);
        return service;
    }

    @Test
    public void testAutoDetect() {
        ExpressService service = createService();
        ExpressInfo ei = service.getExpressInfo(null, TRACKING_NO);

        assertNotNull("查询结果不应为 null", ei);
        assertTrue("查询应成功", ei.getSuccess());
        assertEquals("圆通速递", ei.getShipperName());
        assertEquals("yuantong", ei.getShipperCode());
        assertEquals(TRACKING_NO, ei.getLogisticCode());

        List<Traces> traces = ei.getTraces();
        assertNotNull("轨迹不应为 null", traces);
        assertTrue("应有轨迹数据", traces.size() > 0);

        // 验证字段映射：新 API 的 time/status -> AcceptTime/AcceptStation
        Traces first = traces.get(0);
        assertNotNull("AcceptTime 不应为 null", first.getAcceptTime());
        assertNotNull("AcceptStation 不应为 null", first.getAcceptStation());
        assertTrue("AcceptTime 应有内容", first.getAcceptTime().length() > 0);
        assertTrue("AcceptStation 应有内容", first.getAcceptStation().length() > 0);

        System.out.println("===== 自动识别测试通过 =====");
        System.out.println("快递公司: " + ei.getShipperName());
        System.out.println("轨迹条数: " + traces.size());
        for (Traces t : traces) {
            System.out.println("  " + t.getAcceptTime() + " | " + t.getAcceptStation());
        }
    }

    @Test
    public void testWithCode() {
        ExpressService service = createService();
        ExpressInfo ei = service.getExpressInfo("yuantong", TRACKING_NO);

        assertNotNull(ei);
        assertTrue(ei.getSuccess());
        assertEquals("圆通速递", ei.getShipperName());

        System.out.println("===== 指定快递公司测试通过 =====");
    }
}
