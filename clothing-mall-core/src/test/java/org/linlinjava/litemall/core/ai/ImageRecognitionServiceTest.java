package org.linlinjava.litemall.core.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.Test;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

import static org.junit.Assert.*;

/**
 * 主图识别服务单元测试
 * 直接调用 doubao Vision API，不依赖 Spring 容器。
 *
 * 使用方法：
 *   mvn test -pl clothing-mall-core -Dtest=ImageRecognitionServiceTest
 */
public class ImageRecognitionServiceTest {

    private static final String API_KEY = "9835e477-52e3-4cbe-ab64-6abe0a6f7ba1";
    private static final String ENDPOINT = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
    private static final String MODEL = "ep-20260406233437-xddjl";
    private static final int TIMEOUT = 60000;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 测试：用 Downloads 目录下的真实服装图片调用 doubao Vision API
     */
    @Test
    public void testRecognizeClothingImage() throws Exception {
        // 查找测试图片
        Path imagePath = findTestImage();
        assertNotNull("未找到测试图片，请确认 ~/Downloads 下有 mmexport*.jpg 文件", imagePath);

        System.out.println("=== 使用图片: " + imagePath.getFileName() + " ===");

        byte[] imageBytes = Files.readAllBytes(imagePath);
        System.out.println("图片大小: " + (imageBytes.length / 1024) + " KB");

        // 模拟分类和场景列表
        List<String> categories = Arrays.asList("上衣", "裙子", "裤子", "外套", "套装", "配饰", "鞋靴");
        List<String> scenes = Arrays.asList("通勤", "约会", "休闲", "运动", "正式", "度假", "派对", "日常");

        // 调用 API
        long start = System.currentTimeMillis();
        String response = callDoubaoApi(imageBytes, categories, scenes);
        long elapsed = System.currentTimeMillis() - start;
        System.out.println("API 耗时: " + elapsed + "ms");

        // 解析响应
        System.out.println("\n=== API 原始响应 ===");
        System.out.println(response.length() > 1000 ? response.substring(0, 1000) + "..." : response);

        JsonNode root = objectMapper.readTree(response);

        // 检查错误
        if (root.has("error")) {
            String errorMsg = root.get("error").path("message").asText("未知错误");
            System.err.println("API 错误: " + errorMsg);
            fail("API 返回错误: " + errorMsg);
        }

        // 提取 content
        String content = root.path("choices").get(0).path("message").path("content").asText();
        System.out.println("\n=== AI 返回内容（原始） ===");
        System.out.println(content);

        // 清理 markdown 代码块
        content = content.trim();
        if (content.startsWith("```json")) content = content.substring(7);
        else if (content.startsWith("```")) content = content.substring(3);
        if (content.endsWith("```")) content = content.substring(0, content.length() - 3);
        content = content.trim();

        // 解析 JSON
        JsonNode resultJson = objectMapper.readTree(content);
        System.out.println("\n=== 解析后的 JSON ===");
        System.out.println(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(resultJson));

        // 断言
        assertTrue("应该包含 name 字段", resultJson.has("name"));
        assertNotNull("name 不应为 null", resultJson.get("name").asText());
        assertTrue("name 不应为空", resultJson.get("name").asText().length() > 0);

        System.out.println("\n=== 识别结果 ===");
        System.out.println("商品名称: " + resultJson.path("name").asText());
        System.out.println("建议价格: " + resultJson.path("price").asText());
        System.out.println("商品简介: " + resultJson.path("brief").asText());
        System.out.println("分类: " + resultJson.path("category").asText());
        System.out.println("场景: " + resultJson.path("scenes"));
    }

    /**
     * 测试：多张图片批量识别
     */
    @Test
    public void testRecognizeMultipleImages() throws Exception {
        List<Path> images = findAllTestImages();
        if (images.isEmpty()) {
            System.out.println("跳过：未找到测试图片");
            return;
        }

        List<String> categories = Arrays.asList("上衣", "裙子", "裤子", "外套", "套装", "配饰", "鞋靴");
        List<String> scenes = Arrays.asList("通勤", "约会", "休闲", "运动", "正式", "度假", "派对", "日常");

        int tested = 0;
        int maxTest = Math.min(images.size(), 5); // 最多测 5 张

        for (int i = 0; i < maxTest; i++) {
            Path imagePath = images.get(i);
            System.out.println("\n>>> 图片 " + (i + 1) + ": " + imagePath.getFileName());

            byte[] imageBytes = Files.readAllBytes(imagePath);
            String response = callDoubaoApi(imageBytes, categories, scenes);

            JsonNode root = objectMapper.readTree(response);
            if (root.has("error")) {
                System.err.println("  错误: " + root.get("error").path("message").asText());
                continue;
            }

            String content = root.path("choices").get(0).path("message").path("content").asText();
            content = cleanContent(content);

            try {
                JsonNode resultJson = objectMapper.readTree(content);
                System.out.println("  名称: " + resultJson.path("name").asText());
                System.out.println("  价格: " + resultJson.path("price").asText());
                System.out.println("  分类: " + resultJson.path("category").asText());
                System.out.println("  场景: " + resultJson.path("scenes"));
                tested++;
            } catch (Exception e) {
                System.err.println("  JSON 解析失败: " + e.getMessage());
                System.err.println("  原始内容: " + content);
            }
        }

        assertTrue("至少一张图片应识别成功", tested > 0);
        System.out.println("\n=== 批量测试完成: " + tested + "/" + maxTest + " 成功 ===");
    }

    /**
     * 测试：吊牌识别（TagRecognition）
     */
    @Test
    public void testRecognizeTag() throws Exception {
        Path imagePath = findTagImage();
        if (imagePath == null) {
            System.out.println("跳过：未找到吊牌图片 (Screenshot*.jpg)");
            return;
        }

        System.out.println("=== 吊牌图片: " + imagePath.getFileName() + " ===");

        byte[] imageBytes = Files.readAllBytes(imagePath);
        System.out.println("图片大小: " + (imageBytes.length / 1024) + " KB");

        String prompt = buildTagPrompt();
        String response = callDoubaoApiRaw(prompt, imageBytes);

        System.out.println("\n=== 吊牌识别结果 ===");
        JsonNode root = objectMapper.readTree(response);
        if (root.has("error")) {
            System.err.println("API 错误: " + root.get("error").path("message").asText());
            fail("吊牌识别 API 错误");
        }

        String content = root.path("choices").get(0).path("message").path("content").asText();
        System.out.println(content);
    }

    // ========== 工具方法 ==========

    private String callDoubaoApi(byte[] imageBytes, List<String> categories, List<String> scenes) throws Exception {
        String prompt = buildImagePrompt(categories, scenes);
        return callDoubaoApiRaw(prompt, imageBytes);
    }

    private String callDoubaoApiRaw(String prompt, byte[] imageBytes) throws Exception {
        ObjectNode requestBody = objectMapper.createObjectNode();
        requestBody.put("model", MODEL);

        ArrayNode messages = requestBody.putArray("messages");

        ObjectNode systemMsg = messages.addObject();
        systemMsg.put("role", "system");
        systemMsg.put("content", prompt);

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
        System.out.println("请求体大小: " + (jsonBody.length() / 1024) + " KB");

        return sendPostRequest(jsonBody);
    }

    private String sendPostRequest(String body) throws Exception {
        URL url = new URL(ENDPOINT);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();

        conn.setDoOutput(true);
        conn.setDoInput(true);
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("Authorization", "Bearer " + API_KEY);
        conn.setConnectTimeout(TIMEOUT);
        conn.setReadTimeout(TIMEOUT);

        try (OutputStream os = conn.getOutputStream()) {
            os.write(body.getBytes(StandardCharsets.UTF_8));
            os.flush();
        }

        int responseCode = conn.getResponseCode();
        InputStream inputStream = responseCode < 300 ? conn.getInputStream() : conn.getErrorStream();

        StringBuilder response = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                response.append(line);
            }
        }

        if (responseCode >= 300) {
            throw new RuntimeException("API 请求失败，状态码: " + responseCode + ", 响应: " + response);
        }

        return response.toString();
    }

    private String buildImagePrompt(List<String> categories, List<String> scenes) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("你是一个专业的服装分析助手。你的任务是分析用户上传的服装图片，提取以下信息并以JSON格式返回：\n");
        prompt.append("{\n");
        prompt.append("  \"name\": \"商品名称（简洁描述，包含颜色、款式、材质等关键信息，如'黑色修身西装外套'）\",\n");
        prompt.append("  \"price\": 建议售价（数字，合理的市场零售价，单位：元），\n");
        prompt.append("  \"brief\": \"商品简介（一句话描述风格和特点，20字以内）\",\n");
        prompt.append("  \"category\": \"分类（从以下选项中选择最匹配的：").append(String.join("、", categories)).append("）\",\n");
        prompt.append("  \"scenes\": [\"适用场景\"]（从以下选项中选择所有适用的：").append(String.join("、", scenes)).append("）\n");
        prompt.append("}\n");
        prompt.append("注意事项：\n");
        prompt.append("1. 必须返回合法的JSON格式\n");
        prompt.append("2. name 应简洁但具体，包含颜色、款式等关键信息\n");
        prompt.append("3. price 应为合理的市场零售价\n");
        prompt.append("4. brief 一句话概括风格和卖点\n");
        prompt.append("5. category 必须从提供的选项中选择最匹配的\n");
        prompt.append("6. scenes 从提供的选项中选择所有适用的\n");
        prompt.append("7. 只返回JSON，不要包含其他解释文字");
        return prompt.toString();
    }

    private String buildTagPrompt() {
        return "你是一个专业的吊牌识别助手。请分析用户上传的吊牌/标签图片，提取以下信息并以JSON格式返回：\n" +
                "{\n" +
                "  \"name\": \"商品名称（吊牌上的品名）\",\n" +
                "  \"price\": \"吊牌标价（数字，单位：元）\"\n" +
                "}\n" +
                "注意：只返回JSON，不要包含其他文字。如果无法识别，对应字段留空字符串。";
    }

    private String cleanContent(String content) {
        content = content.trim();
        if (content.startsWith("```json")) content = content.substring(7);
        else if (content.startsWith("```")) content = content.substring(3);
        if (content.endsWith("```")) content = content.substring(0, content.length() - 3);
        return content.trim();
    }

    private Path findTestImage() throws Exception {
        // 优先用 mmexport 图片（真实服装照片）
        List<Path> images = findAllTestImages();
        return images.isEmpty() ? null : images.get(0);
    }

    private List<Path> findAllTestImages() throws Exception {
        Path downloadsDir = Paths.get(System.getProperty("user.home"), "Downloads");
        if (!Files.exists(downloadsDir)) return Collections.emptyList();

        List<Path> result = new ArrayList<>();
        Files.list(downloadsDir)
                .filter(p -> {
                    String name = p.getFileName().toString().toLowerCase();
                    return name.startsWith("mmexport") && (name.endsWith(".jpg") || name.endsWith(".jpeg"));
                })
                .sorted()
                .limit(10)
                .forEach(result::add);

        return result;
    }

    private Path findTagImage() throws Exception {
        Path downloadsDir = Paths.get(System.getProperty("user.home"), "Downloads");
        if (!Files.exists(downloadsDir)) return null;

        return Files.list(downloadsDir)
                .filter(p -> {
                    String name = p.getFileName().toString().toLowerCase();
                    return name.startsWith("screenshot") && (name.endsWith(".jpg") || name.endsWith(".jpeg"));
                })
                .findFirst()
                .orElse(null);
    }
}
