package org.linlinjava.litemall.wx.web;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.domain.LitemallUser;
import org.linlinjava.litemall.db.service.LitemallUserService;
import org.linlinjava.litemall.wx.annotation.LoginUser;
import org.linlinjava.litemall.wx.service.UserInfoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 小程序端 - 会员服务
 */
@RestController
@RequestMapping("/wx/clothing/user")
@Validated
public class WxClothingUserController {
    private final Log logger = LogFactory.getLog(WxClothingUserController.class);

    @Autowired
    private LitemallUserService userService;

    /**
     * 获取会员信息
     */
    @GetMapping("/info")
    public Object info(@LoginUser Integer userId) {
        if (userId == null) {
            return ResponseUtil.unlogin();
        }

        LitemallUser user = userService.findById(userId);
        if (user == null) {
            return ResponseUtil.badArgumentValue();
        }

        Map<String, Object> result = new HashMap<>();
        result.put("nickname", user.getNickname());
        result.put("avatar", user.getAvatar());
        result.put("mobile", user.getMobile());
        result.put("totalPoints", user.getTotalPoints());
        result.put("availablePoints", user.getAvailablePoints());
        result.put("guideId", user.getGuideId());
        result.put("storeId", user.getStoreId());

        return ResponseUtil.ok(result);
    }

    /**
     * 绑定导购
     */
    @PostMapping("/bindGuide")
    public Object bindGuide(@LoginUser Integer userId, @RequestBody Map<String, Integer> params) {
        if (userId == null) {
            return ResponseUtil.unlogin();
        }

        Integer guideId = params.get("guideId");
        if (guideId == null) {
            return ResponseUtil.badArgument();
        }

        LitemallUser user = userService.findById(userId);
        if (user == null) {
            return ResponseUtil.badArgumentValue();
        }

        // 更新绑定的导购
        user.setGuideId(guideId);
        userService.updateById(user);

        return ResponseUtil.ok();
    }
}
