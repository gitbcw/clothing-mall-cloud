package org.linlinjava.litemall.core.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * 吊牌识别服务
 * 基于火山引擎 doubao-seed-2-0-mini 多模态模型，识别吊牌中的商品名称和价格
 */
@Service
public class TagRecognitionService {

    private static final Log logger = LogFactory.getLog(TagRecognitionService.class);

    private static final String TAG_SYSTEM_PROMPT =
            "你是一个专业的吊牌信息识别助手。你的任务是分析用户上传的吊牌/价格标签图片，提取以下信息并以JSON格式返回：\n" +
            "{\n" +
            "  \"name\": \"商品名称（吊牌上名称字段的值）\",\n" +
            "  \"price\": \"一口价（吊牌上一口价字段的数值，纯数字字符串）\"\n" +
            "}\n" +
            "注意事项：\n" +
            "1. 必须返回合法的JSON格式\n" +
            "2. name 提取吊牌上\"名称\"字段的值\n" +
            "3. price 提取吊牌上\"一口价\"字段的数值，只保留数字\n" +
            "4. 如果某些信息无法识别，对应字段返回空字符串\n" +
            "5. 只返回JSON，不要包含其他解释文字";

    @Autowired
    private TagRecognitionProperties properties;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 识别吊牌图片
     *
     * @param imageBytes 图片字节数组
     * @return 识别结果
     */
    public TagRecognitionResult recognizeTag(byte[] imageBytes) {
        if (!properties.isEnabled()) {
            logger.info("吊牌识别功能未启用，返回 Mock 数据");
            return getMockResult();
        }

        if (properties.getApiKey() == null || properties.getApiKey().isEmpty()) {
            throw new RuntimeException("吊牌识别功能缺少 API Key，请配置 litemall.ai.tag.api-key");
        }

        return callDoubaoApi(imageBytes);
    }

    /**
     * 调用火山引擎 doubao Vision API
     * 使用标准 OpenAI Vision 格式（content 为数组，包含 image_url 对象）
     */
    private TagRecognitionResult callDoubaoApi(byte[] imageBytes) {
        try {
            ObjectNode requestBody = objectMapper.createObjectNode();
            requestBody.put("model", properties.getModel());

            ArrayNode messages = requestBody.putArray("messages");

            // system message
            ObjectNode systemMsg = messages.addObject();
            systemMsg.put("role", "system");
            systemMsg.put("content", TAG_SYSTEM_PROMPT);

            // user message（OpenAI Vision 格式：content 为数组）
            ObjectNode userMsg = messages.addObject();
            userMsg.put("role", "user");
            ArrayNode contentArray = userMsg.putArray("content");

            // 文本部分
            ObjectNode textPart = contentArray.addObject();
            textPart.put("type", "text");
            textPart.put("text", "请识别这张吊牌图片，提取商品名称和一口价");

            // 图片部分（base64 data URI）
            ObjectNode imagePart = contentArray.addObject();
            imagePart.put("type", "image_url");
            ObjectNode imageUrlObj = imagePart.putObject("image_url");
            String base64Image = Base64.getEncoder().encodeToString(imageBytes);
            imageUrlObj.put("url", "data:image/jpeg;base64," + base64Image);

            String jsonBody = objectMapper.writeValueAsString(requestBody);

            logger.info("调用火山引擎 API: " + properties.getEndpoint());

            String response = sendPostRequest(properties.getEndpoint(), jsonBody, properties.getApiKey());

            logger.info("火山引擎 API 响应: " + (response.length() > 500 ? response.substring(0, 500) + "..." : response));

            return parseResponse(response);

        } catch (Exception e) {
            logger.error("调用火山引擎 API 失败", e);
            throw new RuntimeException("吊牌识别失败: " + e.getMessage());
        }
    }

    /**
     * 发送 POST 请求（带 Authorization 头）
     */
    private String sendPostRequest(String urlStr, String body, String apiKey) throws Exception {
        URL url = new URL(urlStr);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();

        conn.setDoOutput(true);
        conn.setDoInput(true);
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("Authorization", "Bearer " + apiKey);
        conn.setConnectTimeout(properties.getTimeout());
        conn.setReadTimeout(properties.getTimeout());

        try (OutputStream os = conn.getOutputStream()) {
            os.write(body.getBytes(StandardCharsets.UTF_8));
            os.flush();
        }

        int responseCode = conn.getResponseCode();
        InputStream inputStream;

        if (responseCode >= 200 && responseCode < 300) {
            inputStream = conn.getInputStream();
        } else {
            inputStream = conn.getErrorStream();
        }

        StringBuilder response = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                response.append(line);
            }
        }

        if (responseCode >= 200 && responseCode < 300) {
            return response.toString();
        } else {
            logger.error("火山引擎 API 错误响应: " + response);
            throw new RuntimeException("API 请求失败，状态码: " + responseCode + ", 响应: " + response);
        }
    }

    /**
     * 解析火山引擎 API 响应（标准 OpenAI 格式）
     */
    private TagRecognitionResult parseResponse(String response) {
        try {
            JsonNode root = objectMapper.readTree(response);

            // 检查错误（火山引擎标准错误格式）
            if (root.has("error")) {
                String errorMsg = root.get("error").path("message").asText("未知错误");
                throw new RuntimeException("API 返回错误: " + errorMsg);
            }

            // 提取 AI 返回的内容
            String content = root.path("choices").get(0).path("message").path("content").asText();

            // 清理可能的 markdown 代码块标记
            content = content.trim();
            if (content.startsWith("```json")) {
                content = content.substring(7);
            } else if (content.startsWith("```")) {
                content = content.substring(3);
            }
            if (content.endsWith("```")) {
                content = content.substring(0, content.length() - 3);
            }
            content = content.trim();

            // 解析 JSON 内容
            JsonNode resultJson = objectMapper.readTree(content);

            TagRecognitionResult result = new TagRecognitionResult();
            if (resultJson.has("name") && !resultJson.get("name").isNull()) {
                result.setName(resultJson.get("name").asText());
            }
            if (resultJson.has("price") && !resultJson.get("price").isNull()) {
                result.setPrice(resultJson.get("price").asText());
            }
            result.setMock(false);

            logger.info("吊牌识别结果: " + result);

            result.setMock(false);
            return result;

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            logger.error("解析火山引擎 API 响应失败: " + response, e);
            throw new RuntimeException("解析吊牌识别结果失败: " + e.getMessage());
        }
    }

    /**
     * Mock 识别结果（用于前端开发测试）
     */
    private TagRecognitionResult getMockResult() {
        TagRecognitionResult result = new TagRecognitionResult();
        result.setName("100 亚麻提花竖条衬衣");
        result.setPrice("599");
        result.setMock(true);
        return result;
    }

    /**
     * 吊牌识别结果
     */
    public static class TagRecognitionResult {
        private String name;
        private String price;
        private boolean mock;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getPrice() { return price; }
        public void setPrice(String price) { this.price = price; }

        public boolean isMock() { return mock; }
        public void setMock(boolean mock) { this.mock = mock; }

        public Map<String, Object> toMap() {
            Map<String, Object> map = new HashMap<>();
            map.put("name", name != null ? name : "");
            map.put("price", price != null ? price : "");
            map.put("isMock", mock);
            return map;
        }

        @Override
        public String toString() {
            return "TagRecognitionResult{name='" + name + "', price='" + price + "', mock=" + mock + "}";
        }
    }
}
