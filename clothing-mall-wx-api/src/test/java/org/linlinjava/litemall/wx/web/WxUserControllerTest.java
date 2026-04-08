package org.linlinjava.litemall.wx.web;

import org.junit.Before;
import org.junit.Test;
import org.linlinjava.litemall.db.domain.LitemallUser;
import org.linlinjava.litemall.db.service.LitemallUserService;
import org.linlinjava.litemall.wx.annotation.support.LoginUserHandlerMethodArgumentResolver;
import org.linlinjava.litemall.wx.service.UserTokenManager;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.HashMap;
import java.util.Map;

import static org.junit.Assert.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * WxUserController 测试
 *
 * 使用简单的 MockUserService 替代 Mockito
 */
public class WxUserControllerTest {

    private MockMvc mvc;
    private MockUserService mockUserService;
    private WxUserController controller;

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

    @Before
    public void setup() {
        controller = new WxUserController();
        mockUserService = new MockUserService();

        // 使用反射注入 service
        org.springframework.test.util.ReflectionTestUtils.setField(controller, "userService", mockUserService);

        mvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new LoginUserHandlerMethodArgumentResolver())
                .build();
    }

    /**
     * 生成测试用的 JWT Token
     */
    private String generateToken(Integer userId) {
        return UserTokenManager.generateToken(userId);
    }

    // ============ info 接口测试 ============

    @Test
    public void testInfo_unlogin() throws Exception {
        mvc.perform(get("/wx/user/info"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.errno").value(501));
    }

    @Test
    public void testInfo_owner() throws Exception {
        LitemallUser user = new LitemallUser();
        user.setId(1);
        user.setNickname("店主");
        user.setRole("owner");
        mockUserService.addUser(user);

        mvc.perform(get("/wx/user/info").header("X-Litemall-Token", generateToken(1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role").value("owner"));
    }

    @Test
    public void testInfo_guide() throws Exception {
        LitemallUser user = new LitemallUser();
        user.setId(2);
        user.setNickname("导购");
        user.setRole("guide");
        mockUserService.addUser(user);

        mvc.perform(get("/wx/user/info").header("X-Litemall-Token", generateToken(2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role").value("guide"));
    }

    @Test
    public void testInfo_normalUser() throws Exception {
        LitemallUser user = new LitemallUser();
        user.setId(3);
        user.setNickname("普通用户");
        user.setRole("user");
        mockUserService.addUser(user);

        mvc.perform(get("/wx/user/info").header("X-Litemall-Token", generateToken(3)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role").value("user"));
    }

    @Test
    public void testInfo_roleNull_defaultsToUser() throws Exception {
        LitemallUser user = new LitemallUser();
        user.setId(4);
        user.setNickname("无角色用户");
        user.setRole(null);
        mockUserService.addUser(user);

        mvc.perform(get("/wx/user/info").header("X-Litemall-Token", generateToken(4)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role").value("user"));
    }

    // ============ role 接口测试 ============

    @Test
    public void testGetRole_owner() throws Exception {
        LitemallUser user = new LitemallUser();
        user.setId(1);
        user.setRole("owner");
        mockUserService.addUser(user);

        mvc.perform(get("/wx/user/role").header("X-Litemall-Token", generateToken(1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role").value("owner"))
                .andExpect(jsonPath("$.data.isOwner").value(true))
                .andExpect(jsonPath("$.data.isGuide").value(false))
                .andExpect(jsonPath("$.data.isManager").value(true));
    }

    @Test
    public void testGetRole_guide() throws Exception {
        LitemallUser user = new LitemallUser();
        user.setId(2);
        user.setRole("guide");
        mockUserService.addUser(user);

        mvc.perform(get("/wx/user/role").header("X-Litemall-Token", generateToken(2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role").value("guide"))
                .andExpect(jsonPath("$.data.isOwner").value(false))
                .andExpect(jsonPath("$.data.isGuide").value(true))
                .andExpect(jsonPath("$.data.isManager").value(true));
    }

    @Test
    public void testGetRole_normalUser() throws Exception {
        LitemallUser user = new LitemallUser();
        user.setId(3);
        user.setRole("user");
        mockUserService.addUser(user);

        mvc.perform(get("/wx/user/role").header("X-Litemall-Token", generateToken(3)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role").value("user"))
                .andExpect(jsonPath("$.data.isOwner").value(false))
                .andExpect(jsonPath("$.data.isGuide").value(false))
                .andExpect(jsonPath("$.data.isManager").value(false));
    }

    // ============ isManager 接口测试 ============

    @Test
    public void testIsManager_owner() throws Exception {
        LitemallUser user = new LitemallUser();
        user.setId(1);
        user.setRole("owner");
        mockUserService.addUser(user);

        mvc.perform(get("/wx/user/isManager").header("X-Litemall-Token", generateToken(1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isManager").value(true));
    }

    @Test
    public void testIsManager_guide() throws Exception {
        LitemallUser user = new LitemallUser();
        user.setId(2);
        user.setRole("guide");
        mockUserService.addUser(user);

        mvc.perform(get("/wx/user/isManager").header("X-Litemall-Token", generateToken(2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isManager").value(true));
    }

    @Test
    public void testIsManager_normalUser() throws Exception {
        LitemallUser user = new LitemallUser();
        user.setId(3);
        user.setRole("user");
        mockUserService.addUser(user);

        mvc.perform(get("/wx/user/isManager").header("X-Litemall-Token", generateToken(3)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isManager").value(false));
    }

    @Test
    public void testIsManager_roleNull() throws Exception {
        LitemallUser user = new LitemallUser();
        user.setId(4);
        user.setRole(null);
        mockUserService.addUser(user);

        mvc.perform(get("/wx/user/isManager").header("X-Litemall-Token", generateToken(4)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isManager").value(false))
                .andExpect(jsonPath("$.data.role").value("user"));
    }
}
