package org.linlinjava.litemall.wx.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.Before;
import org.junit.Test;
import org.linlinjava.litemall.db.domain.LitemallOrder;
import org.linlinjava.litemall.db.domain.LitemallOrderGoods;
import org.linlinjava.litemall.db.domain.LitemallUser;
import org.linlinjava.litemall.db.service.LitemallGoodsProductService;
import org.linlinjava.litemall.db.service.LitemallOrderGoodsService;
import org.linlinjava.litemall.db.service.LitemallOrderService;
import org.linlinjava.litemall.db.service.LitemallUserService;
import org.linlinjava.litemall.db.util.OrderUtil;
import org.linlinjava.litemall.wx.annotation.support.LoginUserHandlerMethodArgumentResolver;
import org.linlinjava.litemall.wx.service.UserTokenManager;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * WxManagerOrderController 测试
 *
 * 使用简单的 Mock 服务替代 Mockito
 */
public class WxManagerOrderControllerTest {

    private MockMvc mvc;
    private MockUserService mockUserService;
    private MockOrderService mockOrderService;
    private MockOrderGoodsService mockOrderGoodsService;
    private MockGoodsProductService mockGoodsProductService;
    private WxManagerOrderController controller;
    private ObjectMapper objectMapper;

    /**
     * 简单的 Mock 用户服务
     */
    static class MockUserService extends LitemallUserService {
        private Map<Integer, LitemallUser> users = new HashMap<>();

        public void addUser(LitemallUser user) {
            users.put(user.getId(), user);
        }

        @Override
        public LitemallUser findById(Integer id) {
            return users.get(id);
        }
    }

    /**
     * 简单的 Mock 订单服务
     */
    static class MockOrderService extends LitemallOrderService {
        private Map<Integer, LitemallOrder> orders = new HashMap<>();

        public void addOrder(LitemallOrder order) {
            orders.put(order.getId(), order);
        }

        @Override
        public LitemallOrder findById(Integer id) {
            return orders.get(id);
        }

        @Override
        public int updateWithOptimisticLocker(LitemallOrder order) {
            orders.put(order.getId(), order);
            return 1;
        }
    }

    /**
     * 简单的 Mock 订单商品服务
     */
    static class MockOrderGoodsService extends LitemallOrderGoodsService {
        private Map<Integer, List<LitemallOrderGoods>> orderGoodsByOrderId = new HashMap<>();

        public void addOrderGoods(Integer orderId, LitemallOrderGoods orderGoods) {
            orderGoodsByOrderId.computeIfAbsent(orderId, k -> new ArrayList<>()).add(orderGoods);
        }

        @Override
        public List<LitemallOrderGoods> queryByOid(Integer orderId) {
            return orderGoodsByOrderId.getOrDefault(orderId, new ArrayList<>());
        }
    }

    /**
     * 简单的 Mock 商品规格服务
     */
    static class MockGoodsProductService extends LitemallGoodsProductService {
        private Map<Integer, Integer> productStock = new HashMap<>();

        @Override
        public int addStock(Integer id, Short num) {
            productStock.merge(id, (int) num, Integer::sum);
            return 1;
        }

        public int getStock(Integer id) {
            return productStock.getOrDefault(id, 0);
        }
    }

    @Before
    public void setup() {
        controller = new WxManagerOrderController();
        mockUserService = new MockUserService();
        mockOrderService = new MockOrderService();
        mockOrderGoodsService = new MockOrderGoodsService();
        mockGoodsProductService = new MockGoodsProductService();

        org.springframework.test.util.ReflectionTestUtils.setField(controller, "userService", mockUserService);
        org.springframework.test.util.ReflectionTestUtils.setField(controller, "orderService", mockOrderService);
        org.springframework.test.util.ReflectionTestUtils.setField(controller, "orderGoodsService", mockOrderGoodsService);
        org.springframework.test.util.ReflectionTestUtils.setField(controller, "goodsProductService", mockGoodsProductService);

        mvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new LoginUserHandlerMethodArgumentResolver())
                .build();

        objectMapper = new ObjectMapper();
    }

    /**
     * 生成测试用的 JWT Token
     */
    private String generateToken(Integer userId) {
        return UserTokenManager.generateToken(userId);
    }

    // ============ 权限测试 ============

    @Test
    public void testShip_unlogin() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("orderId", 1);

        mvc.perform(post("/wx/manager/order/ship")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.errno").value(501));
    }

    @Test
    public void testShip_normalUser_forbidden() throws Exception {
        // 普通用户
        LitemallUser user = new LitemallUser();
        user.setId(3);
        user.setRole("user");
        mockUserService.addUser(user);

        Map<String, Object> body = new HashMap<>();
        body.put("orderId", 1);

        mvc.perform(post("/wx/manager/order/ship")
                        .header("X-Litemall-Token", generateToken(3))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.errno").value(403));
    }

    // ============ 发货测试 ============

    @Test
    public void testShip_owner_success() throws Exception {
        // 店主
        LitemallUser owner = new LitemallUser();
        owner.setId(1);
        owner.setRole("owner");
        mockUserService.addUser(owner);

        // 已付款订单
        LitemallOrder order = new LitemallOrder();
        order.setId(100);
        order.setOrderStatus(OrderUtil.STATUS_PAY);
        mockOrderService.addOrder(order);

        Map<String, Object> body = new HashMap<>();
        body.put("orderId", 100);
        body.put("shipSn", "SF123456");
        body.put("shipChannel", "顺丰速运");

        mvc.perform(post("/wx/manager/order/ship")
                        .header("X-Litemall-Token", generateToken(1))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.errno").value(0));
    }

    @Test
    public void testShip_guide_success() throws Exception {
        // 导购
        LitemallUser guide = new LitemallUser();
        guide.setId(2);
        guide.setRole("guide");
        mockUserService.addUser(guide);

        // 已付款订单
        LitemallOrder order = new LitemallOrder();
        order.setId(100);
        order.setOrderStatus(OrderUtil.STATUS_PAY);
        mockOrderService.addOrder(order);

        Map<String, Object> body = new HashMap<>();
        body.put("orderId", 100);
        body.put("shipSn", "SF123456");
        body.put("shipChannel", "顺丰速运");

        mvc.perform(post("/wx/manager/order/ship")
                        .header("X-Litemall-Token", generateToken(2))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.errno").value(0));
    }

    @Test
    public void testShip_wrongStatus() throws Exception {
        // 店主
        LitemallUser owner = new LitemallUser();
        owner.setId(1);
        owner.setRole("owner");
        mockUserService.addUser(owner);

        // 待付款订单（不能发货）
        LitemallOrder order = new LitemallOrder();
        order.setId(101);
        order.setOrderStatus(OrderUtil.STATUS_CREATE);
        mockOrderService.addOrder(order);

        Map<String, Object> body = new HashMap<>();
        body.put("orderId", 101);

        mvc.perform(post("/wx/manager/order/ship")
                        .header("X-Litemall-Token", generateToken(1))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.errno").value(403));
    }

    // ============ 确认收货测试 ============

    @Test
    public void testConfirm_success() throws Exception {
        // 店主
        LitemallUser owner = new LitemallUser();
        owner.setId(1);
        owner.setRole("owner");
        mockUserService.addUser(owner);

        // 已发货订单
        LitemallOrder order = new LitemallOrder();
        order.setId(100);
        order.setOrderStatus(OrderUtil.STATUS_SHIP);
        mockOrderService.addOrder(order);

        Map<String, Object> body = new HashMap<>();
        body.put("orderId", 100);

        mvc.perform(post("/wx/manager/order/confirm")
                        .header("X-Litemall-Token", generateToken(1))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.errno").value(0));
    }

    @Test
    public void testConfirm_wrongStatus() throws Exception {
        // 店主
        LitemallUser owner = new LitemallUser();
        owner.setId(1);
        owner.setRole("owner");
        mockUserService.addUser(owner);

        // 待付款订单（不能确认收货）
        LitemallOrder order = new LitemallOrder();
        order.setId(101);
        order.setOrderStatus(OrderUtil.STATUS_CREATE);
        mockOrderService.addOrder(order);

        Map<String, Object> body = new HashMap<>();
        body.put("orderId", 101);

        mvc.perform(post("/wx/manager/order/confirm")
                        .header("X-Litemall-Token", generateToken(1))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.errno").value(403));
    }

    // ============ 取消订单测试 ============

    @Test
    public void testCancel_success() throws Exception {
        // 店主
        LitemallUser owner = new LitemallUser();
        owner.setId(1);
        owner.setRole("owner");
        mockUserService.addUser(owner);

        // 待付款订单
        LitemallOrder order = new LitemallOrder();
        order.setId(100);
        order.setOrderStatus(OrderUtil.STATUS_CREATE);
        mockOrderService.addOrder(order);

        Map<String, Object> body = new HashMap<>();
        body.put("orderId", 100);

        mvc.perform(post("/wx/manager/order/cancel")
                        .header("X-Litemall-Token", generateToken(1))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.errno").value(0));
    }

    @Test
    public void testCancel_alreadyPaid() throws Exception {
        // 店主
        LitemallUser owner = new LitemallUser();
        owner.setId(1);
        owner.setRole("owner");
        mockUserService.addUser(owner);

        // 已付款订单（不能取消）
        LitemallOrder order = new LitemallOrder();
        order.setId(101);
        order.setOrderStatus(OrderUtil.STATUS_PAY);
        mockOrderService.addOrder(order);

        Map<String, Object> body = new HashMap<>();
        body.put("orderId", 101);

        mvc.perform(post("/wx/manager/order/cancel")
                        .header("X-Litemall-Token", generateToken(1))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.errno").value(403));
    }

    // ============ 订单详情测试 ============

    @Test
    public void testDetail_success() throws Exception {
        // 店主
        LitemallUser owner = new LitemallUser();
        owner.setId(1);
        owner.setRole("owner");
        mockUserService.addUser(owner);

        // 订单
        LitemallOrder order = new LitemallOrder();
        order.setId(100);
        order.setOrderStatus(OrderUtil.STATUS_PAY);
        mockOrderService.addOrder(order);

        mvc.perform(get("/wx/manager/order/detail")
                        .header("X-Litemall-Token", generateToken(1))
                        .param("orderId", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.errno").value(0))
                .andExpect(jsonPath("$.data.id").value(100));
    }

    @Test
    public void testDetail_notFound() throws Exception {
        // 店主
        LitemallUser owner = new LitemallUser();
        owner.setId(1);
        owner.setRole("owner");
        mockUserService.addUser(owner);

        // 订单不存在（不添加）

        mvc.perform(get("/wx/manager/order/detail")
                        .header("X-Litemall-Token", generateToken(1))
                        .param("orderId", "999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.errno").value(402));
    }
}
