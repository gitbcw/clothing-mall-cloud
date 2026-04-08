package org.linlinjava.litemall.wx.web;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.core.validator.Order;
import org.linlinjava.litemall.core.validator.Sort;
import org.linlinjava.litemall.db.domain.LitemallIssue;
import org.linlinjava.litemall.db.domain.LitemallUser;
import org.linlinjava.litemall.db.service.LitemallIssueService;
import org.linlinjava.litemall.db.service.LitemallUserService;
import org.linlinjava.litemall.wx.annotation.LoginUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 小程序管理端常见问题管理控制器
 */
@RestController
@RequestMapping("/wx/manager/issue")
@Validated
public class WxManagerIssueController {
    private final Log logger = LogFactory.getLog(WxManagerIssueController.class);

    @Autowired
    private LitemallIssueService issueService;

    @Autowired
    private LitemallUserService userService;

    private Object checkManager(Integer userId) {
        if (userId == null) {
            return ResponseUtil.unlogin();
        }
        LitemallUser user = userService.findById(userId);
        if (user == null) {
            return ResponseUtil.badArgumentValue();
        }
        String role = user.getRole();
        if (role == null) {
            role = "user";
        }
        if (!"owner".equals(role)) {
            return ResponseUtil.fail(403, "无管理权限");
        }
        return null;
    }

    @GetMapping("/list")
    public Object list(@LoginUser Integer userId,
                       String question,
                       @RequestParam(defaultValue = "1") Integer page,
                       @RequestParam(defaultValue = "10") Integer limit,
                       @Sort @RequestParam(defaultValue = "add_time") String sort,
                       @Order @RequestParam(defaultValue = "desc") String order) {
        Object error = checkManager(userId);
        if (error != null) return error;

        List<LitemallIssue> issueList = issueService.querySelective(question, page, limit, sort, order);
        return ResponseUtil.okList(issueList);
    }

    @PostMapping("/create")
    public Object create(@LoginUser Integer userId, @RequestBody LitemallIssue issue) {
        Object error = checkManager(userId);
        if (error != null) return error;

        if (StringUtils.isEmpty(issue.getQuestion())) {
            return ResponseUtil.fail(401, "问题不能为空");
        }
        if (StringUtils.isEmpty(issue.getAnswer())) {
            return ResponseUtil.fail(401, "回答不能为空");
        }
        issueService.add(issue);
        return ResponseUtil.ok(issue);
    }

    @PostMapping("/update")
    public Object update(@LoginUser Integer userId, @RequestBody LitemallIssue issue) {
        Object error = checkManager(userId);
        if (error != null) return error;

        if (issue.getId() == null) {
            return ResponseUtil.badArgument();
        }
        if (StringUtils.isEmpty(issue.getQuestion())) {
            return ResponseUtil.fail(401, "问题不能为空");
        }
        if (StringUtils.isEmpty(issue.getAnswer())) {
            return ResponseUtil.fail(401, "回答不能为空");
        }
        if (issueService.updateById(issue) == 0) {
            return ResponseUtil.updatedDataFailed();
        }
        return ResponseUtil.ok(issue);
    }

    @PostMapping("/delete")
    public Object delete(@LoginUser Integer userId, @RequestBody LitemallIssue issue) {
        Object error = checkManager(userId);
        if (error != null) return error;

        Integer id = issue.getId();
        if (id == null) {
            return ResponseUtil.badArgument();
        }
        issueService.deleteById(id);
        return ResponseUtil.ok();
    }
}
