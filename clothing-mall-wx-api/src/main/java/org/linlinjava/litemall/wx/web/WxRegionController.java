package org.linlinjava.litemall.wx.web;

import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.domain.LitemallRegion;
import org.linlinjava.litemall.db.service.LitemallRegionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 区域查询接口
 */
@RestController
@RequestMapping("/wx/region")
public class WxRegionController {

    @Autowired
    private LitemallRegionService regionService;

    /**
     * 区域列表
     * pid=0 查所有省，pid=110000 查北京市下的市
     */
    @GetMapping("list")
    public Object list(@RequestParam(defaultValue = "0") Integer pid) {
        List<LitemallRegion> regionList = regionService.queryByPid(pid);
        return ResponseUtil.ok(regionList);
    }
}
