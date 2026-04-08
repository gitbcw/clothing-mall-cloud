package org.linlinjava.litemall.core.notify;

import cn.binarywang.wx.miniapp.api.WxMaService;
import cn.binarywang.wx.miniapp.bean.WxMaSubscribeMessage;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.mail.MailSender;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.scheduling.annotation.Async;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 商城通知服务类
 */
public class NotifyService {
    private final Log logger = LogFactory.getLog(NotifyService.class);
    private MailSender mailSender;
    private String sendFrom;
    private String sendTo;

    private SmsSender smsSender;
    private List<Map<String, String>> smsTemplate = new ArrayList<>();

    private WxMaService wxMaService;
    private List<Map<String, String>> wxTemplate = new ArrayList<>();

    public boolean isMailEnable() {
        return mailSender != null;
    }

    public boolean isSmsEnable() {
        return smsSender != null;
    }

    public boolean isWxEnable() {
        return wxMaService != null;
    }

    /**
     * 短信消息通知
     *
     * @param phoneNumber 接收通知的电话号码
     * @param message     短消息内容，这里短消息内容必须已经在短信平台审核通过
     */
    @Async
    public void notifySms(String phoneNumber, String message) {
        if (smsSender == null)
            return;

        smsSender.send(phoneNumber, message);
    }

    /**
     * 短信模版消息通知
     *
     * @param phoneNumber 接收通知的电话号码
     * @param notifyType  通知类别，通过该枚举值在配置文件中获取相应的模版ID
     * @param params      通知模版内容里的参数，类似"您的验证码为{1}"中{1}的值
     */
    @Async
    public void notifySmsTemplate(String phoneNumber, NotifyType notifyType, String[] params) {
        if (smsSender == null) {
            return;
        }

        String templateIdStr = getTemplateId(notifyType, smsTemplate);
        if (templateIdStr == null) {
            return;
        }

        smsSender.sendWithTemplate(phoneNumber, templateIdStr, params);
    }

    /**
     * 以同步的方式发送短信模版消息通知
     *
     * @param phoneNumber 接收通知的电话号码
     * @param notifyType  通知类别，通过该枚举值在配置文件中获取相应的模版ID
     * @param params      通知模版内容里的参数，类似"您的验证码为{1}"中{1}的值
     * @return
     */
    public SmsResult notifySmsTemplateSync(String phoneNumber, NotifyType notifyType, String[] params) {
        if (smsSender == null)
            return null;

        return smsSender.sendWithTemplate(phoneNumber, getTemplateId(notifyType, smsTemplate), params);
    }

    /**
     * 邮件消息通知,
     * 接收者在spring.mail.sendto中指定
     *
     * @param subject 邮件标题
     * @param content 邮件内容
     */
    @Async
    public void notifyMail(String subject, String content) {
        if (mailSender == null)
            return;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(sendFrom);
        message.setTo(sendTo);
        message.setSubject(subject);
        message.setText(content);
        mailSender.send(message);
    }

    /**
     * 微信小程序订阅消息通知（异步）
     *
     * @param openId     接收用户的 openId
     * @param notifyType 通知类别，通过枚举值在配置中获取对应的模板ID
     * @param dataMap    模板数据，key 为模板字段标识（如 character_string1），value 为对应值
     */
    @Async
    public void notifyWxSubscribeMsg(String openId, NotifyType notifyType, Map<String, String> dataMap) {
        if (wxMaService == null) {
            return;
        }

        String templateId = getTemplateId(notifyType, wxTemplate);
        if (templateId == null) {
            logger.warn("微信订阅消息模板未配置: " + notifyType.getType());
            return;
        }

        try {
            WxMaSubscribeMessage message = new WxMaSubscribeMessage();
            message.setToUser(openId);
            message.setTemplateId(templateId);

            for (Map.Entry<String, String> entry : dataMap.entrySet()) {
                message.addData(new WxMaSubscribeMessage.MsgData(entry.getKey(), entry.getValue()));
            }

            wxMaService.getMsgService().sendSubscribeMsg(message);
            logger.info("微信订阅消息发送成功: openId=" + openId + ", type=" + notifyType.getType());
        } catch (Exception e) {
            logger.warn("微信订阅消息发送失败: openId=" + openId + ", type=" + notifyType.getType()
                    + ", error=" + e.getMessage());
        }
    }

    private String getTemplateId(NotifyType notifyType, List<Map<String, String>> values) {
        for (Map<String, String> item : values) {
            String notifyTypeStr = notifyType.getType();

            if (item.get("name").equals(notifyTypeStr))
                return item.get("templateId");
        }
        return null;
    }

    public void setMailSender(MailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void setSendFrom(String sendFrom) {
        this.sendFrom = sendFrom;
    }

    public void setSendTo(String sendTo) {
        this.sendTo = sendTo;
    }

    public void setSmsSender(SmsSender smsSender) {
        this.smsSender = smsSender;
    }

    public void setSmsTemplate(List<Map<String, String>> smsTemplate) {
        this.smsTemplate = smsTemplate;
    }

    public void setWxTemplate(List<Map<String, String>> wxTemplate) {
        this.wxTemplate = wxTemplate;
    }

    public void setWxMaService(WxMaService wxMaService) {
        this.wxMaService = wxMaService;
    }
}
