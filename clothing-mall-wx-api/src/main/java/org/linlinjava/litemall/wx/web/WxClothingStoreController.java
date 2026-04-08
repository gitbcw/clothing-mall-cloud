package org.linlinjava.litemall.wx.web;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.domain.ClothingStore;
import org.linlinjava.litemall.db.service.ClothingStoreService;
import org.linlinjava.litemall.wx.annotation.LoginUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 小程序端 - 门店服务（用于到店自提）
 */
@RestController
@RequestMapping("/wx/clothing/store")
@Validated
public class WxClothingStoreController {
    private final Log logger = LogFactory.getLog(WxClothingStoreController.class);

    @Autowired
    private ClothingStoreService storeService;

    /**
     * 获取门店列表（仅返回营业中的门店）
     */
    @GetMapping("/list")
    public Object list() {
        List<ClothingStore> storeList = storeService.queryAll();
        return ResponseUtil.okList(storeList);
    }

    /**
     * 获取门店详情
     */
    @GetMapping("/detail")
    public Object detail(@NotNull Integer id) {
        ClothingStore store = storeService.findById(id);
        if (store == null) {
            return ResponseUtil.badArgumentValue();
        }
        return ResponseUtil.ok(store);
    }

    /**
     * 根据经纬度获取最近的门店
     */
    @GetMapping("/nearest")
    public Object nearest(@NotNull BigDecimal longitude, @NotNull BigDecimal latitude,
                          @RequestParam(defaultValue = "5") Integer limit) {
        List<ClothingStore> storeList = storeService.queryAll();

        // 按距离排序并返回最近的门店
        storeList.sort((a, b) -> {
            if (a.getLatitude() == null || a.getLongitude() == null) return 1;
            if (b.getLatitude() == null || b.getLongitude() == null) return -1;

            double distA = calculateDistance(latitude.doubleValue(), longitude.doubleValue(),
                    a.getLatitude().doubleValue(), a.getLongitude().doubleValue());
            double distB = calculateDistance(latitude.doubleValue(), longitude.doubleValue(),
                    b.getLatitude().doubleValue(), b.getLongitude().doubleValue());

            return Double.compare(distA, distB);
        });

        if (storeList.size() > limit) {
            storeList = storeList.subList(0, limit);
        }

        return ResponseUtil.okList(storeList);
    }

    /**
     * 计算两点之间的距离（使用 Haversine 公式）
     */
    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371; // 地球半径（公里）
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
