package org.linlinjava.litemall.wx.web;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.domain.ClothingScene;
import org.linlinjava.litemall.db.domain.LitemallCategory;
import org.linlinjava.litemall.db.domain.LitemallSearchHistory;
import org.linlinjava.litemall.db.service.ClothingSceneService;
import org.linlinjava.litemall.db.service.LitemallCategoryService;
import org.linlinjava.litemall.db.service.LitemallGoodsService;
import org.linlinjava.litemall.db.service.LitemallSearchHistoryService;
import org.linlinjava.litemall.wx.annotation.LoginUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.constraints.NotEmpty;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 商品搜索服务
 * <p>
 * 注意：目前搜索功能非常简单，只是基于关键字匹配。
 */
@RestController
@RequestMapping("/wx/search")
@Validated
public class WxSearchController {
    private final Log logger = LogFactory.getLog(WxSearchController.class);

    @Autowired
    private LitemallSearchHistoryService searchHistoryService;
    @Autowired
    private LitemallCategoryService categoryService;
    @Autowired
    private ClothingSceneService sceneService;
    @Autowired
    private LitemallGoodsService goodsService;

    /**
     * 搜索页面信息
     * <p>
     * 如果用户已登录，则给出用户历史搜索记录；
     * 如果没有登录，则给出空历史搜索记录。
     *
     * @param userId 用户ID，可选
     * @return 搜索页面信息
     */
    @GetMapping("index")
    public Object index(@LoginUser Integer userId) {
        // 取出热门关键词（基于搜索历史频次自动生成）
        List<Map<String, Object>> hotKeywordList = searchHistoryService.queryHotKeywords(10);

        // 默认关键词：取热门第1条，无数据时用固定文案
        Map<String, String> defaultKeyword = new HashMap<>();
        if (!hotKeywordList.isEmpty()) {
            defaultKeyword.put("keyword", (String) hotKeywordList.get(0).get("keyword"));
        } else {
            defaultKeyword.put("keyword", "搜索商品");
        }

        List<LitemallSearchHistory> historyList = null;
        if (userId != null) {
            historyList = searchHistoryService.queryByUid(userId);
        } else {
            historyList = new ArrayList<>(0);
        }

        Map<String, Object> data = new HashMap<String, Object>();
        data.put("defaultKeyword", defaultKeyword);
        data.put("historyKeywordList", historyList);
        data.put("hotKeywordList", hotKeywordList);

        // L1 分类列表
        List<LitemallCategory> categoryList = categoryService.queryL1();
        data.put("categoryList", categoryList);

        // 启用的场景列表
        List<ClothingScene> sceneList = sceneService.queryEnabled();
        data.put("sceneList", sceneList);

        return ResponseUtil.ok(data);
    }

    /**
     * 关键字提醒
     * <p>
     * 当用户输入关键字一部分时，可以推荐系统中合适的关键字。
     *
     * @param keyword 关键字
     * @return 合适的关键字
     */
    @GetMapping("helper")
    public Object helper(@NotEmpty String keyword,
                         @RequestParam(defaultValue = "1") Integer page,
                         @RequestParam(defaultValue = "10") Integer limit) {
        List<String> suggestions = goodsService.searchKeywordSuggestions(keyword, limit);
        return ResponseUtil.ok(suggestions);
    }

    /**
     * 清除用户搜索历史
     *
     * @param userId 用户ID
     * @return 清理是否成功
     */
    @PostMapping("clearhistory")
    public Object clearhistory(@LoginUser Integer userId) {
        if (userId == null) {
            return ResponseUtil.unlogin();
        }

        searchHistoryService.deleteByUid(userId);
        return ResponseUtil.ok();
    }
}
