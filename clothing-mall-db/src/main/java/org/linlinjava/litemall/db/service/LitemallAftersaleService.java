package org.linlinjava.litemall.db.service;

import com.github.pagehelper.PageHelper;
import org.linlinjava.litemall.db.dao.AftersaleMapper;
import org.linlinjava.litemall.db.dao.LitemallAftersaleMapper;
import org.linlinjava.litemall.db.domain.*;
import org.linlinjava.litemall.db.util.AftersaleConstant;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.annotation.Resource;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

@Service
public class LitemallAftersaleService {
    @Resource
    private LitemallAftersaleMapper litemallAftersaleMapper;
    @Resource
    private AftersaleMapper manualAftersaleMapper;

    public LitemallAftersale findById(Integer id) {
        return litemallAftersaleMapper.selectByPrimaryKey(id);
    }

    public Map<String, Long> getAftersaleStatusCounts() {
        List<Map> counts = manualAftersaleMapper.getAftersaleStatusCounts();
        Map<String, Long> statusCounts = new HashMap<>();
        long total = 0;
        for (Map map : counts) {
            Object statusObj = map.get("status");
            Object countObj = map.get("total");
            if (statusObj != null && countObj != null) {
                String status = statusObj.toString();
                Long count = Long.valueOf(countObj.toString());
                statusCounts.put(status, count);
                total += count;
            }
        }
        statusCounts.put("all", total);
        return statusCounts;
    }

    public LitemallAftersale findById(Integer userId, Integer id) {
        LitemallAftersaleExample example = new LitemallAftersaleExample();
        example.or().andIdEqualTo(id).andUserIdEqualTo(userId).andDeletedEqualTo(false);
        return litemallAftersaleMapper.selectOneByExample(example);
    }

    public List<LitemallAftersale> queryList(Integer userId, Short status, Integer page, Integer limit, String sort,
            String order) {
        LitemallAftersaleExample example = new LitemallAftersaleExample();
        LitemallAftersaleExample.Criteria criteria = example.or();
        criteria.andUserIdEqualTo(userId);
        if (status != null) {
            criteria.andStatusEqualTo(status);
        }
        criteria.andDeletedEqualTo(false);
        if (!StringUtils.isEmpty(sort) && !StringUtils.isEmpty(order)) {
            example.setOrderByClause(sort + " " + order);
        } else {
            example.setOrderByClause(LitemallAftersale.Column.addTime.desc());
        }

        PageHelper.startPage(page, limit);
        return litemallAftersaleMapper.selectByExample(example);
    }

    public List<LitemallAftersale> querySelective(Integer orderId, String aftersaleSn, Short status, List<Short> statusArray, Integer page,
            Integer limit, String sort, String order) {
        LitemallAftersaleExample example = new LitemallAftersaleExample();
        LitemallAftersaleExample.Criteria criteria = example.or();
        if (orderId != null) {
            criteria.andOrderIdEqualTo(orderId);
        }
        if (!StringUtils.isEmpty(aftersaleSn)) {
            criteria.andAftersaleSnEqualTo(aftersaleSn);
        }
        if (status != null) {
            criteria.andStatusEqualTo(status);
        }
        if (statusArray != null && !statusArray.isEmpty()) {
            criteria.andStatusIn(statusArray);
        }
        criteria.andDeletedEqualTo(false);
        if (!StringUtils.isEmpty(sort) && !StringUtils.isEmpty(order)) {
            example.setOrderByClause(sort + " " + order);
        } else {
            example.setOrderByClause(LitemallAftersale.Column.addTime.desc());
        }

        PageHelper.startPage(page, limit);
        return litemallAftersaleMapper.selectByExample(example);
    }

    private String getRandomNum(Integer num) {
        String base = "0123456789";
        Random random = new Random();
        StringBuffer sb = new StringBuffer();
        for (int i = 0; i < num; i++) {
            int number = random.nextInt(base.length());
            sb.append(base.charAt(number));
        }
        return sb.toString();
    }

    public int countByAftersaleSn(Integer userId, String aftersaleSn) {
        LitemallAftersaleExample example = new LitemallAftersaleExample();
        example.or().andUserIdEqualTo(userId).andAftersaleSnEqualTo(aftersaleSn).andDeletedEqualTo(false);
        return (int) litemallAftersaleMapper.countByExample(example);
    }

    // TODO 这里应该产生一个唯一的编号，但是实际上这里仍然存在两个售后编号相同的可能性
    public String generateAftersaleSn(Integer userId) {
        DateTimeFormatter df = DateTimeFormatter.ofPattern("yyyyMMdd");
        String now = df.format(LocalDate.now());
        String aftersaleSn = now + getRandomNum(6);
        while (countByAftersaleSn(userId, aftersaleSn) != 0) {
            aftersaleSn = now + getRandomNum(6);
        }
        return aftersaleSn;
    }

    public void add(LitemallAftersale aftersale) {
        aftersale.setAddTime(LocalDateTime.now());
        aftersale.setUpdateTime(LocalDateTime.now());
        litemallAftersaleMapper.insertSelective(aftersale);
    }

    public void deleteByIds(List<Integer> ids) {
        LitemallAftersaleExample example = new LitemallAftersaleExample();
        example.or().andIdIn(ids).andDeletedEqualTo(false);
        LitemallAftersale aftersale = new LitemallAftersale();
        aftersale.setUpdateTime(LocalDateTime.now());
        aftersale.setDeleted(true);
        litemallAftersaleMapper.updateByExampleSelective(aftersale, example);
    }

    public void deleteById(Integer id) {
        litemallAftersaleMapper.logicalDeleteByPrimaryKey(id);
    }

    public void deleteByOrderId(Integer userId, Integer orderId) {
        LitemallAftersaleExample example = new LitemallAftersaleExample();
        example.or().andOrderIdEqualTo(orderId).andUserIdEqualTo(userId).andDeletedEqualTo(false);
        LitemallAftersale aftersale = new LitemallAftersale();
        aftersale.setUpdateTime(LocalDateTime.now());
        aftersale.setDeleted(true);
        litemallAftersaleMapper.updateByExampleSelective(aftersale, example);
    }

    public void updateById(LitemallAftersale aftersale) {
        aftersale.setUpdateTime(LocalDateTime.now());
        litemallAftersaleMapper.updateByPrimaryKeySelective(aftersale);
    }

    public LitemallAftersale findByOrderId(Integer userId, Integer orderId) {
        LitemallAftersaleExample example = new LitemallAftersaleExample();
        example.or().andOrderIdEqualTo(orderId).andUserIdEqualTo(userId).andDeletedEqualTo(false);
        return litemallAftersaleMapper.selectOneByExample(example);
    }
}
