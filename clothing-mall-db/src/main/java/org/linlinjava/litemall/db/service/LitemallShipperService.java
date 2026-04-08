package org.linlinjava.litemall.db.service;

import org.linlinjava.litemall.db.domain.LitemallShipper;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class LitemallShipperService {
    @Resource
    private JdbcTemplate jdbcTemplate;

    public List<LitemallShipper> listAll() {
        String sql = "SELECT id, code, name, enabled, sort_order, add_time, update_time, deleted FROM litemall_shipper WHERE deleted = 0 ORDER BY sort_order ASC, id ASC";
        return jdbcTemplate.query(sql, new BeanPropertyRowMapper<>(LitemallShipper.class));
    }

    public List<String> listEnabledNames() {
        String sql = "SELECT name FROM litemall_shipper WHERE deleted = 0 AND enabled = 1 ORDER BY sort_order ASC, id ASC";
        return jdbcTemplate.queryForList(sql, String.class);
    }

    public String codeByName(String name) {
        String sql = "SELECT code FROM litemall_shipper WHERE deleted = 0 AND enabled = 1 AND name = ? LIMIT 1";
        List<String> result = jdbcTemplate.queryForList(sql, String.class, name);
        return result.isEmpty() ? null : result.get(0);
    }

    public String nameByCode(String code) {
        String sql = "SELECT name FROM litemall_shipper WHERE deleted = 0 AND code = ? LIMIT 1";
        List<String> result = jdbcTemplate.queryForList(sql, String.class, code);
        return result.isEmpty() ? null : result.get(0);
    }

    public void create(LitemallShipper shipper) {
        String sql = "INSERT INTO litemall_shipper (code, name, enabled, sort_order, add_time, update_time) VALUES (?, ?, ?, ?, ?, ?)";
        jdbcTemplate.update(sql, shipper.getCode(), shipper.getName(),
                shipper.getEnabled() != null ? shipper.getEnabled() : true,
                shipper.getSortOrder() != null ? shipper.getSortOrder() : 0,
                LocalDateTime.now(), LocalDateTime.now());
    }

    public void update(LitemallShipper shipper) {
        String sql = "UPDATE litemall_shipper SET code = ?, name = ?, sort_order = ?, update_time = ? WHERE id = ? AND deleted = 0";
        jdbcTemplate.update(sql, shipper.getCode(), shipper.getName(),
                shipper.getSortOrder() != null ? shipper.getSortOrder() : 0,
                LocalDateTime.now(), shipper.getId());
    }

    public void toggle(Integer id, Boolean enabled) {
        String sql = "UPDATE litemall_shipper SET enabled = ?, update_time = ? WHERE id = ? AND deleted = 0";
        jdbcTemplate.update(sql, enabled, LocalDateTime.now(), id);
    }

    public void delete(Integer id) {
        String sql = "UPDATE litemall_shipper SET deleted = 1, update_time = ? WHERE id = ?";
        jdbcTemplate.update(sql, LocalDateTime.now(), id);
    }
}
