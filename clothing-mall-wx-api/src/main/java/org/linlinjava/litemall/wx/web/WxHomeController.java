package org.linlinjava.litemall.wx.web;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.linlinjava.litemall.core.system.SystemConfig;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.domain.LitemallGoods;
import org.linlinjava.litemall.db.domain.LitemallOutfit;
import org.linlinjava.litemall.db.domain.ClothingHoliday;
import org.linlinjava.litemall.db.domain.ClothingScene;
import org.linlinjava.litemall.db.service.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.linlinjava.litemall.wx.annotation.LoginUser;
import org.linlinjava.litemall.wx.service.HomeCacheManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.constraints.NotNull;
import java.util.*;
import java.util.concurrent.*;

/**
 * 首页服务
 */
@RestController
@RequestMapping("/wx/home")
@Validated
public class WxHomeController {
    private final Log logger = LogFactory.getLog(WxHomeController.class);

    @Autowired
    private LitemallGoodsService goodsService;

    @Autowired
    private LitemallOutfitService outfitService;

    @Autowired
    private ClothingHolidayService holidayService;

    @Autowired
    private ClothingHolidayGoodsService holidayGoodsService;

    @Autowired
    private ClothingGoodsSceneService goodsSceneService;

    @Autowired
    private ClothingSceneService sceneService;

    private final static ArrayBlockingQueue<Runnable> WORK_QUEUE = new ArrayBlockingQueue<>(3);

    private final static RejectedExecutionHandler HANDLER = new ThreadPoolExecutor.CallerRunsPolicy();

    private static ThreadPoolExecutor executorService = new ThreadPoolExecutor(3, 3, 1000, TimeUnit.MILLISECONDS, WORK_QUEUE, HANDLER);

    @GetMapping("/cache")
    public Object cache(@NotNull String key) {
        if (!key.equals("litemall_cache")) {
            return ResponseUtil.fail();
        }

        // 清除缓存
        HomeCacheManager.clearAll();
        return ResponseUtil.ok("缓存已清除");
    }

    /**
     * 首页数据
     * @param userId 当用户已经登录时，非空。为登录状态为null
     * @return 首页数据
     */
    @GetMapping("/index")
    public Object index(@LoginUser Integer userId) {
        //优先从缓存中读取
        if (HomeCacheManager.hasData(HomeCacheManager.INDEX)) {
            return ResponseUtil.ok(HomeCacheManager.getCacheData(HomeCacheManager.INDEX));
        }
        //相当于每次都是new的线程池 没意义
        //ExecutorService executorService = Executors.newFixedThreadPool(10);

        Callable<List> hotGoodsListCallable = () -> goodsService.queryAllPublished(0, 50);

        Callable<List> outfitListCallable = this::getOutfitList;

        FutureTask<List> hotGoodsListTask = new FutureTask<>(hotGoodsListCallable);
        FutureTask<List> outfitListTask = new FutureTask<>(outfitListCallable);

        executorService.submit(hotGoodsListTask);
        executorService.submit(outfitListTask);

        Map<String, Object> entity = new HashMap<>();
        try {
            entity.put("hotGoodsList", hotGoodsListTask.get());
            entity.put("outfitList", outfitListTask.get());

            // 添加活动位配置
            Map<String, Object> activity = buildHomeActivity();
            if (activity != null) {
                entity.put("homeActivity", activity);
            }

            //缓存数据
            HomeCacheManager.loadData(HomeCacheManager.INDEX, entity);
        }
        catch (Exception e) {
            e.printStackTrace();
        }
//        finally {
//            executorService.shutdown();
//        }
        return ResponseUtil.ok(entity);
    }

    /**
     * 构建首页活动位数据
     */
    private Map<String, Object> buildHomeActivity() {
        List<Map<String, Object>> result = new ArrayList<>();
        Set<Integer> addedIds = new HashSet<>();
        int limit = 8;
        String titleType = "weekly"; // 默认每周上新

        // 1. 节日商品
        List<ClothingHoliday> activeHolidays = holidayService.queryActive();
        for (ClothingHoliday holiday : activeHolidays) {
            List<Integer> goodsIds = holidayGoodsService.queryGoodsIdsByHolidayId(holiday.getId());
            int count = 0;
            for (Integer goodsId : goodsIds) {
                if (addedIds.contains(goodsId) || count >= limit) continue;
                LitemallGoods goods = goodsService.findById(goodsId);
                if (goods != null && LitemallGoods.STATUS_PUBLISHED.equals(goods.getStatus())) {
                    result.add(goodsToMap(goods));
                    addedIds.add(goodsId);
                    count++;
                }
            }
        }
        if (!result.isEmpty()) {
            titleType = "holiday"; // 有节日商品
        }

        // 2. 特价商品
        if (result.size() < limit) {
            List<LitemallGoods> specialGoods = goodsService.queryBySpecialPrice(0, limit);
            int specialCount = 0;
            for (LitemallGoods goods : specialGoods) {
                if (addedIds.contains(goods.getId()) || specialCount >= limit) continue;
                result.add(goodsToMap(goods));
                addedIds.add(goods.getId());
                specialCount++;
            }
            if (specialCount > 0 && "holiday".equals(titleType)) {
                // 既有节日商品又有特价商品，优先显示节日
            } else if (specialCount > 0) {
                titleType = "special"; // 主要是特价商品
            }
        }

        // 3. 兜底：从所有商品中随机抽取
        if (result.isEmpty()) {
            List<LitemallGoods> allGoods = goodsService.queryAllPublished(0, limit * 2);
            Collections.shuffle(allGoods);
            int fallbackCount = 0;
            for (LitemallGoods goods : allGoods) {
                if (fallbackCount >= limit) break;
                result.add(goodsToMap(goods));
                addedIds.add(goods.getId());
                fallbackCount++;
            }
            titleType = "weekly"; // 兜底是每周上新
        }

        if (result.isEmpty()) {
            return null;
        }

        Map<String, Object> activity = new HashMap<>();
        activity.put("goods", result);
        activity.put("titleType", titleType);
        return activity;
    }

    private Map<String, Object> goodsToMap(LitemallGoods goods) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", goods.getId());
        map.put("name", goods.getName());
        map.put("picUrl", goods.getPicUrl());
        map.put("retailPrice", goods.getRetailPrice());
        map.put("counterPrice", goods.getCounterPrice());
        map.put("specialPrice", goods.getSpecialPrice());
        return map;
    }

    /**
     * 获取穿搭推荐列表（包含关联商品信息）
     */
    private List<Map<String, Object>> getOutfitList() {
        List<LitemallOutfit> outfits = outfitService.queryEnabled();
        List<Map<String, Object>> result = new ArrayList<>();

        ObjectMapper mapper = new ObjectMapper();
        for (LitemallOutfit outfit : outfits) {
            Map<String, Object> outfitMap = new HashMap<>();
            outfitMap.put("id", outfit.getId());
            outfitMap.put("title", outfit.getTitle());
            outfitMap.put("coverPic", outfit.getCoverPic());
            outfitMap.put("brandColor", outfit.getBrandColor());
            outfitMap.put("brandPosition", outfit.getBrandPosition());
            outfitMap.put("floatPosition", outfit.getFloatPosition());
            outfitMap.put("sortOrder", outfit.getSortOrder());

            // 解析 goodsIds JSON 并查询商品
            List<Map<String, Object>> goodsList = new ArrayList<>();
            String goodsIdsJson = outfit.getGoodsIds();
            if (goodsIdsJson != null && !goodsIdsJson.isEmpty()) {
                try {
                    List<Integer> goodsIds = mapper.readValue(goodsIdsJson, new TypeReference<List<Integer>>() {});
                    for (Integer goodsId : goodsIds) {
                        LitemallGoods goods = goodsService.findById(goodsId);
                        if (goods != null && LitemallGoods.STATUS_PUBLISHED.equals(goods.getStatus())) {
                            Map<String, Object> goodsMap = new HashMap<>();
                            goodsMap.put("id", goods.getId());
                            goodsMap.put("name", goods.getName());
                            goodsMap.put("picUrl", goods.getPicUrl());
                            goodsMap.put("retailPrice", goods.getRetailPrice());
                            goodsList.add(goodsMap);
                        }
                    }
                } catch (Exception e) {
                    logger.error("解析穿搭商品ID失败: " + goodsIdsJson, e);
                }
            }
            outfitMap.put("goods", goodsList);
            result.add(outfitMap);
        }
        return result;
    }

    /**
     * 商城介绍信息
     * @return 商城介绍信息
     */
    @GetMapping("/about")
    public Object about() {
        Map<String, Object> about = new HashMap<>();
        about.put("name", SystemConfig.getMallName());
        about.put("address", SystemConfig.getMallAddress());
        about.put("phone", SystemConfig.getMallPhone());
        about.put("qq", SystemConfig.getMallQQ());
        about.put("longitude", SystemConfig.getMallLongitude());
        about.put("latitude", SystemConfig.getMallLatitude());
        return ResponseUtil.ok(about);
    }
}