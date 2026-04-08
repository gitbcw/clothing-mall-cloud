package org.linlinjava.litemall.core.ai.config;

import org.linlinjava.litemall.core.ai.TagRecognitionProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * AI 吊牌识别自动配置
 */
@Configuration
@EnableConfigurationProperties({TagRecognitionProperties.class})
public class AiAutoConfiguration {
    // TagRecognitionService 通过 @Service 注解自动注册
}
