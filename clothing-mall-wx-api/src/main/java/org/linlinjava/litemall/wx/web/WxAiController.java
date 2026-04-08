package org.linlinjava.litemall.wx.web;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.linlinjava.litemall.core.ai.ImageRecognitionService;
import org.linlinjava.litemall.core.ai.TagRecognitionProperties;
import org.linlinjava.litemall.core.ai.TagRecognitionService;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.domain.ClothingScene;
import org.linlinjava.litemall.db.domain.LitemallCategory;
import org.linlinjava.litemall.db.service.ClothingSceneService;
import org.linlinjava.litemall.db.service.LitemallCategoryService;
import org.linlinjava.litemall.wx.annotation.LoginUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * AI 吊牌识别控制器
 *
 * 使用火山引擎豆包视觉 API 识别吊牌信息。
 * 未启用时返回 Mock 数据。
 */
@RestController
@RequestMapping("/wx/ai")
@Validated
public class WxAiController {
    private final Log logger = LogFactory.getLog(WxAiController.class);

    @Autowired
    private TagRecognitionProperties tagProperties;

    @Autowired
    private TagRecognitionService tagRecognitionService;

    @Autowired
    private ImageRecognitionService imageRecognitionService;

    @Autowired
    private LitemallCategoryService categoryService;

    @Autowired
    private ClothingSceneService sceneService;

    /**
     * AI 服务状态检查
     */
    @GetMapping("status")
    public Object status() {
        Map<String, Object> result = new HashMap<>();
        result.put("enabled", tagProperties.isEnabled());
        result.put("provider", "doubao");
        result.put("message", tagProperties.isEnabled() ? "吊牌识别服务可用" : "吊牌识别未启用，使用 Mock 数据");
        return ResponseUtil.ok(result);
    }

    /**
     * 吊牌图片识别
     * 上传吊牌图片，识别商品名称和一口价
     */
    @PostMapping("recognizeTag")
    public Object recognizeTag(@LoginUser Integer userId, @RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseUtil.badArgument();
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseUtil.fail(400, "请上传图片文件");
        }

        try {
            byte[] imageBytes = file.getBytes();
            TagRecognitionService.TagRecognitionResult result = tagRecognitionService.recognizeTag(imageBytes);
            return ResponseUtil.ok(result.toMap());
        } catch (RuntimeException e) {
            logger.error("吊牌识别失败", e);
            return ResponseUtil.fail(500, "吊牌识别失败: " + e.getMessage());
        } catch (Exception e) {
            logger.error("吊牌识别失败", e);
            return ResponseUtil.fail(500, "吊牌识别失败");
        }
    }

    /**
     * 主图识别
     * 上传服装图片，AI 分析并返回商品名称、价格、简介、分类、场景等信息
     */
    @PostMapping("recognizeImage")
    public Object recognizeImage(@LoginUser Integer userId, @RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseUtil.badArgument();
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseUtil.fail(400, "请上传图片文件");
        }

        try {
            // 查询可用的分类和场景，提供给 AI 匹配
            List<LitemallCategory> categories = categoryService.queryL1();
            List<String> categoryNames = categories.stream()
                    .map(LitemallCategory::getName)
                    .collect(Collectors.toList());

            List<ClothingScene> enabledScenes = sceneService.queryEnabled();
            List<String> sceneNames = enabledScenes.stream()
                    .map(ClothingScene::getName)
                    .collect(Collectors.toList());

            byte[] imageBytes = file.getBytes();
            ImageRecognitionService.ImageRecognitionResult result =
                    imageRecognitionService.recognizeImage(imageBytes, categoryNames, sceneNames);
            return ResponseUtil.ok(result.toMap());
        } catch (RuntimeException e) {
            logger.error("主图识别失败", e);
            return ResponseUtil.fail(500, "主图识别失败: " + e.getMessage());
        } catch (Exception e) {
            logger.error("主图识别失败", e);
            return ResponseUtil.fail(500, "主图识别失败");
        }
    }
}
