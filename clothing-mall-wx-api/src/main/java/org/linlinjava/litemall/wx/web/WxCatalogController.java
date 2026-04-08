package org.linlinjava.litemall.wx.web;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.domain.LitemallCategory;
import org.linlinjava.litemall.db.service.LitemallCategoryService;
import org.linlinjava.litemall.wx.service.HomeCacheManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 类目服务
 */
@RestController
@RequestMapping("/wx/catalog")
@Validated
public class WxCatalogController {
    private final Log logger = LogFactory.getLog(WxCatalogController.class);

    @Autowired
    private LitemallCategoryService categoryService;

    /**
     * 获取当前季节
     * @return 季节字符串: spring, summer, autumn, winter
     */
    private String getCurrentSeason() {
        LocalDate now = LocalDate.now();
        int month = now.getMonthValue();

        // 季节映射（北半球）: 3-5=春, 6-8=夏, 9-11=秋, 12-2=冬
        if (month >= 3 && month <= 5) {
            return "spring";
        } else if (month >= 6 && month <= 8) {
            return "summer";
        } else if (month >= 9 && month <= 11) {
            return "autumn";
        } else {
            return "winter";
        }
    }

    /**
     * 过滤分类列表 - 根据季节开关
     * @param categories 分类列表
     * @param season 当前季节
     * @return 过滤后的分类列表
     */
    private List<LitemallCategory> filterBySeason(List<LitemallCategory> categories, String season) {
        if (categories == null) {
            return null;
        }
        return categories.stream()
            .filter(cat -> {
                String seasonSwitch = cat.getSeasonSwitch();
                if (seasonSwitch == null || seasonSwitch.isEmpty()) {
                    return true; // 未设置则默认显示
                }
                // 季节开关支持多选（逗号分隔）和"all"
                String[] enabledSeasons = seasonSwitch.split(",");
                for (String s : enabledSeasons) {
                    String trimmed = s.trim();
                    if (trimmed.equals("all") || trimmed.equals(season)) {
                        return true;
                    }
                }
                return false;
            })
            .collect(Collectors.toList());
    }

    @GetMapping("/getfirstcategory")
    public Object getFirstCategory() {
        String currentSeason = getCurrentSeason();
        // 所有一级分类目录
        List<LitemallCategory> l1CatList = categoryService.queryL1();
        // 根据季节过滤
        l1CatList = filterBySeason(l1CatList, currentSeason);
        return ResponseUtil.ok(l1CatList);
    }

    @GetMapping("/getsecondcategory")
    public Object getSecondCategory(@NotNull Integer id) {
        String currentSeason = getCurrentSeason();
        // 所有二级分类目录
        List<LitemallCategory> currentSubCategory = categoryService.queryByPid(id);
        // 根据季节过滤
        currentSubCategory = filterBySeason(currentSubCategory, currentSeason);
        return ResponseUtil.ok(currentSubCategory);
    }

    /**
     * 分类详情
     *
     * @param id   分类类目ID。
     *             如果分类类目ID是空，则选择第一个分类类目。
     *             需要注意，这里分类类目是一级类目
     * @return 分类详情
     */
    @GetMapping("index")
    public Object index(Integer id) {

        String currentSeason = getCurrentSeason();

        // 所有一级分类目录
        List<LitemallCategory> l1CatList = categoryService.queryL1();
        // 根据季节过滤
        l1CatList = filterBySeason(l1CatList, currentSeason);

        // 当前一级分类目录
        LitemallCategory currentCategory = null;
        if (id != null) {
            currentCategory = categoryService.findById(id);
        } else {
             if (l1CatList.size() > 0) {
                currentCategory = l1CatList.get(0);
            }
        }

        // 当前一级分类目录对应的二级分类目录
        List<LitemallCategory> currentSubCategory = null;
        if (null != currentCategory) {
            currentSubCategory = categoryService.queryByPid(currentCategory.getId());
            // 根据季节过滤
            currentSubCategory = filterBySeason(currentSubCategory, currentSeason);
        }

        Map<String, Object> data = new HashMap<String, Object>();
        data.put("categoryList", l1CatList);
        data.put("currentCategory", currentCategory);
        data.put("currentSubCategory", currentSubCategory);
        return ResponseUtil.ok(data);
    }

    /**
     * 所有分类数据
     *
     * @return 所有分类数据
     */
    @GetMapping("all")
    public Object queryAll() {
        //优先从缓存中读取
        if (HomeCacheManager.hasData(HomeCacheManager.CATALOG)) {
            return ResponseUtil.ok(HomeCacheManager.getCacheData(HomeCacheManager.CATALOG));
        }


        // 所有一级分类目录
        List<LitemallCategory> l1CatList = categoryService.queryL1();

        //所有子分类列表
        Map<Integer, List<LitemallCategory>> allList = new HashMap<>();
        List<LitemallCategory> sub;
        for (LitemallCategory category : l1CatList) {
            sub = categoryService.queryByPid(category.getId());
            allList.put(category.getId(), sub);
        }

        // 当前一级分类目录
        LitemallCategory currentCategory = l1CatList.get(0);

        // 当前一级分类目录对应的二级分类目录
        List<LitemallCategory> currentSubCategory = null;
        if (null != currentCategory) {
            currentSubCategory = categoryService.queryByPid(currentCategory.getId());
        }

        Map<String, Object> data = new HashMap<String, Object>();
        data.put("categoryList", l1CatList);
        data.put("allList", allList);
        data.put("currentCategory", currentCategory);
        data.put("currentSubCategory", currentSubCategory);

        //缓存数据
        HomeCacheManager.loadData(HomeCacheManager.CATALOG, data);
        return ResponseUtil.ok(data);
    }

    /**
     * 当前分类栏目
     *
     * @param id 分类类目ID
     * @return 当前分类栏目
     */
    @GetMapping("current")
    public Object current(@NotNull Integer id) {
        // 当前分类
        LitemallCategory currentCategory = categoryService.findById(id);
        if(currentCategory == null){
            return ResponseUtil.badArgumentValue();
        }
        List<LitemallCategory> currentSubCategory = categoryService.queryByPid(currentCategory.getId());

        Map<String, Object> data = new HashMap<String, Object>();
        data.put("currentCategory", currentCategory);
        data.put("currentSubCategory", currentSubCategory);
        return ResponseUtil.ok(data);
    }
}
