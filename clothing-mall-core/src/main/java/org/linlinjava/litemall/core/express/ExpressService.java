package org.linlinjava.litemall.core.express;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.linlinjava.litemall.core.express.config.ExpressProperties;
import org.linlinjava.litemall.core.express.dao.ExpressInfo;
import org.linlinjava.litemall.core.express.dao.Traces;
import org.linlinjava.litemall.core.util.HttpUtil;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 物流查询服务
 * <p>
 * 阿里云市场快递物流查询API
 * https://qryexpress.market.alicloudapi.com/lundear/expressTracking
 */
public class ExpressService {

    private final Log logger = LogFactory.getLog(ExpressService.class);
    private static final String API_HOST = "https://qryexpress.market.alicloudapi.com";
    private static final String TRACKING_PATH = "/lundear/expressTracking";

    private ExpressProperties properties;

    public ExpressProperties getProperties() {
        return properties;
    }

    public void setProperties(ExpressProperties properties) {
        this.properties = properties;
    }

    /**
     * 获取物流供应商名
     */
    public String getVendorName(String vendorCode) {
        for (Map<String, String> item : properties.getVendors()) {
            if (item.get("code").equals(vendorCode))
                return item.get("name");
        }
        return null;
    }

    public List<Map<String, String>> getVendors() {
        return properties.getVendors();
    }

    /**
     * 获取物流信息
     *
     * @param expCode 快递公司代码（可为空，API 支持自动识别）
     * @param expNo   快递单号
     */
    public ExpressInfo getExpressInfo(String expCode, String expNo) {
        return getExpressInfo(expCode, expNo, null);
    }

    /**
     * 获取物流信息
     *
     * @param expCode      快递公司代码（可为空，API 支持自动识别）
     * @param expNo        快递单号
     * @param mobileSuffix 收件人/寄件人手机号后4位（顺丰和丰网需要）
     */
    public ExpressInfo getExpressInfo(String expCode, String expNo, String mobileSuffix) {
        if (!properties.isEnable()) {
            return null;
        }

        try {
            String result = queryTracking(expCode, expNo, mobileSuffix);
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(result);

            int code = root.path("code").asInt(-1);
            if (code != 0) {
                logger.warn("快递查询失败: code=" + code + ", desc=" + root.path("desc").asText());
                ExpressInfo ei = new ExpressInfo();
                ei.setSuccess(false);
                ei.setReason(root.path("desc").asText("查询失败"));
                return ei;
            }

            JsonNode data = root.path("data");
            ExpressInfo ei = new ExpressInfo();
            ei.setLogisticCode(data.path("number").asText());
            ei.setShipperCode(data.path("com").asText());
            ei.setState(data.path("state").asText());
            ei.setSuccess(true);

            // 从 API 响应获取快递公司名，优先于本地 vendors 配置
            String nameFromApi = data.path("name").asText();
            if (nameFromApi != null && !nameFromApi.isEmpty()) {
                ei.setShipperName(nameFromApi);
            } else {
                ei.setShipperName(getVendorName(expCode));
            }

            // 映射轨迹数据：新 API 的 time/status -> AcceptTime/AcceptStation
            JsonNode listNode = data.path("list");
            if (listNode.isArray()) {
                List<Traces> traces = new ArrayList<>();
                for (JsonNode item : listNode) {
                    Traces trace = new Traces();
                    trace.setAcceptTime(item.path("time").asText());
                    trace.setAcceptStation(item.path("status").asText());
                    traces.add(trace);
                }
                ei.setTraces(traces);
            }

            return ei;
        } catch (Exception e) {
            logger.error("快递查询异常: " + e.getMessage(), e);
        }

        return null;
    }

    /**
     * 调用阿里云市场快递物流查询 API
     */
    private String queryTracking(String expCode, String expNo, String mobileSuffix) throws UnsupportedEncodingException {
        StringBuilder url = new StringBuilder(API_HOST + TRACKING_PATH);
        url.append("?number=").append(URLEncoder.encode(expNo, "UTF-8"));

        if (expCode != null && !expCode.isEmpty()) {
            url.append("&com=").append(URLEncoder.encode(expCode, "UTF-8"));
        }
        if (mobileSuffix != null && !mobileSuffix.isEmpty()) {
            url.append("&mobile=").append(URLEncoder.encode(mobileSuffix, "UTF-8"));
        }

        Map<String, String> headers = new HashMap<>();
        headers.put("Authorization", "APPCODE " + properties.getAppcode());

        return HttpUtil.getWithHeaders(url.toString(), headers);
    }
}
