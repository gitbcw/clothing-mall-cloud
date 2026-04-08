package org.linlinjava.litemall.admin.job;

import org.springframework.context.annotation.Configuration;
/**
 * 生日优惠券任务配置
 * 用于启动时注册 BirthdayCouponJob Bean
 */
@Configuration
public class BirthdayCouponJobConfig {
    // 无需额外配置， BirthdayCouponJob 已通过 @Component 和 @Scheduled 注解自动注册
}
