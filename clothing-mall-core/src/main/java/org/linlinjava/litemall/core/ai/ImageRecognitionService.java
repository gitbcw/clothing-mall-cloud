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
import java.util.*;

/**
 * 主图识别服务
 * 基于火山引擎 doubao Vision API，分析服装图片并返回商品名称、价格、简介、分类、场景等信息
 */
@Service
public class ImageRecognitionService {

    private static final Log logger = LogFactory.getLog(ImageRecognitionService.class);

    @Autowired
    private TagRecognitionProperties properties;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 识别服装图片
     *
     * @param imageBytes  图片字节数组
     * @param categories  可选分类名称列表（用于 AI 匹配）
     * @param scenes      可选场景名称列表（用于 AI 匹配）
     * @return 识别结果
     */
    public ImageRecognitionResult recognizeImage(byte[] imageBytes, List<String> categories, List<String> scenes) {
        if (!properties.isEnabled()) {
            logger.info("主图识别功能未启用，返回 Mock 数据");
            return getMockResult();
        }

        if (properties.getApiKey() == null || properties.getApiKey().isEmpty()) {
            throw new RuntimeException("AI 识别功能缺少 API Key，请配置 litemall.ai.tag.api-key");
        }

        return callDoubaoApi(imageBytes, categories, scenes);
    }

    private String buildPrompt(List<String> categories, List<String> scenes) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("你是一个专业的服装分析助手。你的任务是分析用户上传的服装图片，提取以下信息并以JSON格式返回：\n");
        prompt.append("{\n");
        prompt.append("  \"name\": \"商品名称（简洁描述，包含颜色、款式、材质等关键信息，如'黑色修身西装外套'）\",\n");
        prompt.append("  \"price\": 建议售价（数字，合理的市场零售价，单位：元），\n");
        prompt.append("  \"brief\": \"商品简介（一句话描述风格和特点，20字以内）\",\n");

        if (categories != null && !categories.isEmpty()) {
            prompt.append("  \"category\": \"分类（从以下选项中选择最匹配的：").append(String.join("、", categories)).append("）\",\n");
        } else {
            prompt.append("  \"category\": \"分类（如：上衣、裙子、裤子、外套、配饰等）\",\n");
        }

        if (scenes != null && !scenes.isEmpty()) {
            prompt.append("  \"scenes\": [\"适用场景\"]（从以下选项中选择所有适用的：").append(String.join("、", scenes)).append("）\n");
        } else {
            prompt.append("  \"scenes\": [\"适用场景\"]（如：通勤、约会、休闲、运动、正式、度假等）\n");
        }

        prompt.append("}\n");
        prompt.append("注意事项：\n");
        prompt.append("1. 必须返回合法的JSON格式\n");
        prompt.append("2. name 应简洁但具体，包含颜色、款式等关键信息\n");
        prompt.append("3. price 应为合理的市场零售价\n");
        prompt.append("4. brief 一句话概括风格和卖点\n");
        prompt.append("5. category 必须从提供的选项中选择最匹配的，如果都不匹配则返回空字符串\n");
        prompt.append("6. scenes 从提供的选项中选择所有适用的，如果没有匹配的则返回空数组\n");
        prompt.append("7. 只返回JSON，不要包含其他解释文字");

        return prompt.toString();
    }

    private ImageRecognitionResult callDoubaoApi(byte[] imageBytes, List<String> categories, List<String> scenes) {
        try {
            String prompt = buildPrompt(categories, scenes);

            ObjectNode requestBody = objectMapper.createObjectNode();
            requestBody.put("model", properties.getModel());

            ArrayNode messages = requestBody.putArray("messages");

            // system message
            ObjectNode systemMsg = messages.addObject();
            systemMsg.put("role", "system");
            systemMsg.put("content", prompt);

            // user message（OpenAI Vision 格式）
            ObjectNode userMsg = messages.addObject();
            userMsg.put("role", "user");
            ArrayNode contentArray = userMsg.putArray("content");

            ObjectNode textPart = contentArray.addObject();
            textPart.put("type", "text");
            textPart.put("text", "请分析这张服装图片，返回商品信息");

            ObjectNode imagePart = contentArray.addObject();
            imagePart.put("type", "image_url");
            ObjectNode imageUrlObj = imagePart.putObject("image_url");
            String base64Image = Base64.getEncoder().encodeToString(imageBytes);
            imageUrlObj.put("url", "data:image/jpeg;base64," + base64Image);

            String jsonBody = objectMapper.writeValueAsString(requestBody);

            logger.info("调用火山引擎 API（主图识别）: " + properties.getEndpoint());

            String response = sendPostRequest(properties.getEndpoint(), jsonBody, properties.getApiKey());

            logger.info("主图识别 API 响应: " + (response.length() > 500 ? response.substring(0, 500) + "..." : response));

            return parseResponse(response);

        } catch (Exception e) {
            logger.error("调用火山引擎 API 失败（主图识别）", e);
            throw new RuntimeException("主图识别失败: " + e.getMessage());
        }
    }

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

    private ImageRecognitionResult parseResponse(String response) {
        try {
            JsonNode root = objectMapper.readTree(response);

            if (root.has("error")) {
                String errorMsg = root.get("error").path("message").asText("未知错误");
                throw new RuntimeException("API 返回错误: " + errorMsg);
            }

            String content = root.path("choices").get(0).path("message").path("content").asText();

            // 清理 markdown 代码块标记
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

            JsonNode resultJson = objectMapper.readTree(content);

            ImageRecognitionResult result = new ImageRecognitionResult();
            if (resultJson.has("name") && !resultJson.get("name").isNull()) {
                result.setName(resultJson.get("name").asText());
            }
            if (resultJson.has("price") && !resultJson.get("price").isNull()) {
                result.setPrice(resultJson.get("price").asText());
            }
            if (resultJson.has("brief") && !resultJson.get("brief").isNull()) {
                result.setBrief(resultJson.get("brief").asText());
            }
            if (resultJson.has("category") && !resultJson.get("category").isNull()) {
                result.setCategory(resultJson.get("category").asText());
            }
            if (resultJson.has("scenes") && resultJson.get("scenes").isArray()) {
                List<String> sceneList = new ArrayList<>();
                for (JsonNode scene : resultJson.get("scenes")) {
                    sceneList.add(scene.asText());
                }
                result.setScenes(sceneList);
            }
            result.setMock(false);

            logger.info("主图识别结果: " + result);

            return result;

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            logger.error("解析主图识别 API 响应失败: " + response, e);
            throw new RuntimeException("解析主图识别结果失败: " + e.getMessage());
        }
    }

    private ImageRecognitionResult getMockResult() {
        ImageRecognitionResult result = new ImageRecognitionResult();
        result.setName("黑色修身西装外套");
        result.setPrice("399");
        result.setBrief("经典黑色修身剪裁，百搭商务单品");
        result.setCategory("外套");
        result.setScenes(Arrays.asList("通勤", "正式"));
        result.setMock(true);
        return result;
    }

    /**
     * 主图识别结果
     */
    public static class ImageRecognitionResult {
        private String name;
        private String price;
        private String brief;
        private String category;
        private List<String> scenes;
        private boolean mock;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getPrice() { return price; }
        public void setPrice(String price) { this.price = price; }

        public String getBrief() { return brief; }
        public void setBrief(String brief) { this.brief = brief; }

        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }

        public List<String> getScenes() { return scenes; }
        public void setScenes(List<String> scenes) { this.scenes = scenes; }

        public boolean isMock() { return mock; }
        public void setMock(boolean mock) { this.mock = mock; }

        public Map<String, Object> toMap() {
            Map<String, Object> map = new HashMap<>();
            map.put("name", name != null ? name : "");
            map.put("price", price != null ? price : "");
            map.put("brief", brief != null ? brief : "");
            map.put("category", category != null ? category : "");
            map.put("scenes", scenes != null ? scenes : Collections.emptyList());
            map.put("isMock", mock);
            return map;
        }

        @Override
        public String toString() {
            return "ImageRecognitionResult{name='" + name + "', price='" + price +
                    "', brief='" + brief + "', category='" + category +
                    "', scenes=" + scenes + ", mock=" + mock + "}";
        }
    }
}
