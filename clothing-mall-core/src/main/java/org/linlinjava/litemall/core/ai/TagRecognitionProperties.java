package org.linlinjava.litemall.core.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 吊牌识别配置（火山引擎 doubao-seed-2-0-mini）
 */
@ConfigurationProperties(prefix = "litemall.ai.tag")
public class TagRecognitionProperties {

    /**
     * 是否启用吊牌识别功能
     */
    private boolean enabled = false;

    /**
     * 火山引擎 API Key
     */
    private String apiKey;

    /**
     * API 端点（火山引擎 OpenAI 兼容格式）
     */
    private String endpoint = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

    /**
     * 模型名称
     */
    private String model = "ep-20260406233437-xddjl";

    /**
     * 请求超时时间（毫秒）
     */
    private int timeout = 30000;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getEndpoint() {
        return endpoint;
    }

    public void setEndpoint(String endpoint) {
        this.endpoint = endpoint;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public int getTimeout() {
        return timeout;
    }

    public void setTimeout(int timeout) {
        this.timeout = timeout;
    }
}
