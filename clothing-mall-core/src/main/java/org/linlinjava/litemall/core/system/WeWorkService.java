package org.linlinjava.litemall.core.system;

import org.linlinjava.litemall.core.util.HttpUtil;
import org.linlinjava.litemall.core.util.JacksonUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.*;

/**
 * 企业微信客户消息推送服务
 */
@Service
public class WeWorkService {

    private static final Logger logger = LoggerFactory.getLogger(WeWorkService.class);

    // Token 缓存
    private String cachedAccessToken;
    private long tokenExpireTime;

    /**
     * 获取access_token
     */
    private String getAccessToken() {
        String corpId = SystemConfig.getWeWorkCorpId();
        String secret = SystemConfig.getWeWorkContactSecret();

        if (corpId == null || corpId.isEmpty() || secret == null || secret.isEmpty()) {
            logger.warn("企业微信配置缺失：corpId 或 secret");
            return null;
        }

        // 检查缓存
        if (cachedAccessToken != null && tokenExpireTime > System.currentTimeMillis() / 1000) {
            return cachedAccessToken;
        }

        // 刷新token
        String url = "https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=" + corpId + "&corpsecret=" + secret;
        try {
            String response = HttpUtil.get(url);
            Map<String, Object> result = JacksonUtil.fromJson(response, Map.class);
            if (result != null && result.get("errcode") != null && result.get("errcode").equals(0)) {
                cachedAccessToken = (String) result.get("access_token");
                tokenExpireTime = System.currentTimeMillis() / 1000 + 7000; // 约2小时有效期
                logger.info("获取企微access_token成功");
                return cachedAccessToken;
            } else {
                logger.error("获取企微access_token失败: {}", result);
            }
        } catch (Exception e) {
            logger.error("获取企微access_token异常", e);
        }

        return null;
    }

    /**
     * 发送订单发货通知
     *
     * @param externalUserId 客户的外部联系人ID
     * @param orderSn        订单号
     * @param shipChannel    快递公司
     * @param shipSn         快递单号
     * @return 是否发送成功
     */
    public boolean sendShipNotification(String externalUserId, String orderSn,
                                         String shipChannel, String shipSn) {
        String accessToken = getAccessToken();
        if (accessToken == null) {
            logger.warn("企微推送失败：无法获取access_token");
            return false;
        }

        String sender = SystemConfig.getWeWorkSenderId();
        if (sender == null || sender.isEmpty()) {
            logger.warn("企微推送失败：未配置发送者账号");
            return false;
        }

        Map<String, Object> message = new HashMap<>();
        message.put("chat_type", "single");
        message.put("external_userid", Collections.singletonList(externalUserId));
        message.put("sender", sender);

        Map<String, String> text = new HashMap<>();
        text.put("content", String.format(
                "您好，您的订单 %s 已发货！\n快递公司：%s\n快递单号：%s",
                orderSn, shipChannel, shipSn));
        message.put("text", text);

        return postMessageTemplate(accessToken, message);
    }

    /**
     * 按标签群发活动消息
     *
     * @param tagId   标签ID
     * @param content 消息内容
     * @return 是否发送成功
     */
    public boolean sendPromotionByTag(String tagId, String content) {
        String accessToken = getAccessToken();
        if (accessToken == null) {
            logger.warn("企微推送失败：无法获取access_token");
            return false;
        }

        String sender = SystemConfig.getWeWorkSenderId();
        if (sender == null || sender.isEmpty()) {
            logger.warn("企微推送失败：未配置发送者账号");
            return false;
        }

        Map<String, Object> message = new HashMap<>();
        message.put("chat_type", "single");
        message.put("sender", sender);

        // 按标签筛选客户
        Map<String, Object> filter = new HashMap<>();
        filter.put("tag_list", Collections.singletonList(tagId));
        message.put("filter", filter);

        Map<String, String> text = new HashMap<>();
        text.put("content", content);
        message.put("text", text);

        return postMessageTemplate(accessToken, message);
    }

    /**
     * 发送生日祝福
     *
     * @param externalUserId 客户的外部联系人ID
     * @param userName       用户名
     * @return 是否发送成功
     */
    public boolean sendBirthdayGreeting(String externalUserId, String userName) {
        String accessToken = getAccessToken();
        if (accessToken == null) {
            logger.warn("企微推送失败：无法获取access_token");
            return false;
        }

        String sender = SystemConfig.getWeWorkSenderId();
        if (sender == null || sender.isEmpty()) {
            logger.warn("企微推送失败：未配置发送者账号");
            return false;
        }

        Map<String, Object> message = new HashMap<>();
        message.put("chat_type", "single");
        message.put("external_userid", Collections.singletonList(externalUserId));
        message.put("sender", sender);

        Map<String, String> text = new HashMap<>();
        text.put("content", String.format("亲爱的 %s，祝您生日快乐！🎂\n专属生日优惠券已发放到您的账户，快来选购心仪的商品吧！", userName));
        message.put("text", text);

        return postMessageTemplate(accessToken, message);
    }

    /**
     * 调用企微消息模板API
     */
    private boolean postMessageTemplate(String accessToken, Map<String, Object> message) {
        String url = "https://qyapi.weixin.qq.com/cgi-bin/externalcontact/add_msg_template?access_token=" + accessToken;
        try {
            String body = JacksonUtil.toJson(message);
            String response = HttpUtil.post(url, body);
            Map<String, Object> result = JacksonUtil.fromJson(response, Map.class);
            if (result != null && result.get("errcode") != null && result.get("errcode").equals(0)) {
                logger.info("企微消息推送成功");
                return true;
            } else {
                logger.error("企微消息推送失败: {}", result);
            }
        } catch (Exception e) {
            logger.error("企微消息推送异常", e);
        }
        return false;
    }

    // ================== 小程序卡片推送 ==================

    /**
     * 上传临时素材到企业微信
     *
     * @param inputStream    文件输入流
     * @param filename       文件名
     * @param contentLength  文件大小
     * @param type           媒体类型（image/voice/video/file）
     * @return media_id，失败返回 null
     */
    public String uploadMedia(InputStream inputStream, String filename,
                              long contentLength, String type) {
        String accessToken = getAccessToken();
        if (accessToken == null) {
            logger.warn("企微上传素材失败：无法获取access_token");
            return null;
        }

        String boundary = "----WebKitFormBoundary" + System.currentTimeMillis();
        String url = "https://qyapi.weixin.qq.com/cgi-bin/media/upload?access_token=" + accessToken + "&type=" + type;

        try {
            URL realUrl = new URL(url);
            HttpURLConnection conn = (HttpURLConnection) realUrl.openConnection();
            conn.setDoOutput(true);
            conn.setDoInput(true);
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);
            conn.connect();

            OutputStream outputStream = conn.getOutputStream();
            PrintWriter writer = new PrintWriter(new OutputStreamWriter(outputStream, "UTF-8"), true);

            // 添加文件部分
            writer.append("--").append(boundary).append("\r\n");
            writer.append("Content-Disposition: form-data; name=\"media\"; filename=\"")
                  .append(filename).append("\"\r\n");
            writer.append("Content-Type: ").append(getMimeType(filename)).append("\r\n\r\n");
            writer.flush();

            // 写入文件内容
            byte[] buffer = new byte[4096];
            int bytesRead;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, bytesRead);
            }
            outputStream.flush();
            inputStream.close();

            writer.append("\r\n--").append(boundary).append("--\r\n");
            writer.close();

            // 读取响应
            int responseCode = conn.getResponseCode();
            InputStream responseStream = responseCode == 200 ? conn.getInputStream() : conn.getErrorStream();
            BufferedReader reader = new BufferedReader(new InputStreamReader(responseStream, "UTF-8"));
            StringBuilder response = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                response.append(line);
            }
            reader.close();

            Map<String, Object> result = JacksonUtil.fromJson(response.toString(), Map.class);
            if (result != null && result.get("media_id") != null) {
                String mediaId = (String) result.get("media_id");
                logger.info("企微素材上传成功，media_id: {}", mediaId);
                return mediaId;
            } else {
                logger.error("企微素材上传失败: {}", result);
            }
        } catch (Exception e) {
            logger.error("企微素材上传异常", e);
        }
        return null;
    }

    /**
     * 根据文件名获取 MIME 类型
     */
    private String getMimeType(String filename) {
        if (filename == null) return "application/octet-stream";
        String lower = filename.toLowerCase();
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".bmp")) return "image/bmp";
        return "application/octet-stream";
    }

    /**
     * 发送小程序卡片（单发）
     *
     * @param externalUserId 客户的外部联系人ID
     * @param title          卡片标题
     * @param mediaId        封面图片的 media_id
     * @param appid          小程序 AppID（可选，为空则使用系统配置）
     * @param page           小程序页面路径
     * @return 是否发送成功
     */
    public boolean sendMiniProgramCard(String externalUserId, String title,
                                        String mediaId, String appid, String page) {
        String accessToken = getAccessToken();
        if (accessToken == null) {
            logger.warn("企微小程序卡片推送失败：无法获取access_token");
            return false;
        }

        String sender = SystemConfig.getWeWorkSenderId();
        if (sender == null || sender.isEmpty()) {
            logger.warn("企微小程序卡片推送失败：未配置发送者账号");
            return false;
        }

        // 使用传入的 appid，如果为空则使用系统配置
        String effectiveAppId = (appid != null && !appid.isEmpty()) ? appid : SystemConfig.getWeWorkMiniProgramAppId();
        if (effectiveAppId == null || effectiveAppId.isEmpty()) {
            logger.warn("企微小程序卡片推送失败：未配置小程序 AppID");
            return false;
        }

        Map<String, Object> message = new HashMap<>();
        message.put("chat_type", "single");
        message.put("external_userid", Collections.singletonList(externalUserId));
        message.put("sender", sender);

        Map<String, Object> miniprogram = new HashMap<>();
        miniprogram.put("title", title);
        miniprogram.put("thumb_media_id", mediaId);
        miniprogram.put("appid", effectiveAppId);
        miniprogram.put("page", page);
        message.put("miniprogram", miniprogram);

        return postMessageTemplate(accessToken, message);
    }

    /**
     * 按标签群发小程序卡片
     *
     * @param tagId   标签ID
     * @param title   卡片标题
     * @param mediaId 封面图片的 media_id
     * @param appid   小程序 AppID（可选，为空则使用系统配置）
     * @param page    小程序页面路径
     * @return 是否发送成功
     */
    public boolean sendMiniProgramCardByTag(String tagId, String title,
                                             String mediaId, String appid, String page) {
        String accessToken = getAccessToken();
        if (accessToken == null) {
            logger.warn("企微小程序卡片推送失败：无法获取access_token");
            return false;
        }

        String sender = SystemConfig.getWeWorkSenderId();
        if (sender == null || sender.isEmpty()) {
            logger.warn("企微小程序卡片推送失败：未配置发送者账号");
            return false;
        }

        // 使用传入的 appid，如果为空则使用系统配置
        String effectiveAppId = (appid != null && !appid.isEmpty()) ? appid : SystemConfig.getWeWorkMiniProgramAppId();
        if (effectiveAppId == null || effectiveAppId.isEmpty()) {
            logger.warn("企微小程序卡片推送失败：未配置小程序 AppID");
            return false;
        }

        Map<String, Object> message = new HashMap<>();
        message.put("chat_type", "single");
        message.put("sender", sender);

        // 按标签筛选客户
        Map<String, Object> filter = new HashMap<>();
        filter.put("tag_list", Collections.singletonList(tagId));
        message.put("filter", filter);

        Map<String, Object> miniprogram = new HashMap<>();
        miniprogram.put("title", title);
        miniprogram.put("thumb_media_id", mediaId);
        miniprogram.put("appid", effectiveAppId);
        miniprogram.put("page", page);
        message.put("miniprogram", miniprogram);

        return postMessageTemplate(accessToken, message);
    }

    // ================== 标签管理 ==================

    /**
     * 获取企业客户标签列表
     *
     * @return 标签列表，失败返回 null
     */
    public List<Map<String, Object>> getCorpTagList() {
        String accessToken = getAccessToken();
        if (accessToken == null) {
            logger.warn("获取企微标签列表失败：无法获取access_token");
            return null;
        }

        String url = "https://qyapi.weixin.qq.com/cgi-bin/externalcontact/get_corp_tag_list?access_token=" + accessToken;
        try {
            // 传空参数获取所有标签组
            String body = "{\"tag_id\":[]}";
            String response = HttpUtil.post(url, body);
            Map<String, Object> result = JacksonUtil.fromJson(response, Map.class);
            if (result != null && result.get("errcode") != null && result.get("errcode").equals(0)) {
                List<Map<String, Object>> tagGroups = (List<Map<String, Object>>) result.get("tag_group");
                List<Map<String, Object>> allTags = new ArrayList<>();

                // 扁平化标签列表，保留分组信息
                if (tagGroups != null) {
                    for (Map<String, Object> group : tagGroups) {
                        String groupName = (String) group.get("name");
                        List<Map<String, Object>> tags = (List<Map<String, Object>>) group.get("tag");
                        if (tags != null) {
                            for (Map<String, Object> tag : tags) {
                                Map<String, Object> tagInfo = new HashMap<>();
                                tagInfo.put("id", tag.get("id"));
                                tagInfo.put("name", tag.get("name"));
                                tagInfo.put("groupName", groupName);
                                allTags.add(tagInfo);
                            }
                        }
                    }
                }
                logger.info("获取企微标签列表成功，共 {} 个标签", allTags.size());
                return allTags;
            } else {
                logger.error("获取企微标签列表失败: {}", result);
            }
        } catch (Exception e) {
            logger.error("获取企微标签列表异常", e);
        }
        return null;
    }
}
