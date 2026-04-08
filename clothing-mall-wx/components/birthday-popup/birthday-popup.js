/**
 * 生日填写弹窗组件
 * 用于新用户登录后引导填写生日
 */
const util = require('../../utils/util.js');
const api = require('../../config/api.js');

Component({
  properties: {
    // 是否显示弹窗
    show: {
      type: Boolean,
      value: false
    }
  },

  data: {
    // 生日日期
    birthday: '',
    // 最小日期（100年前）
    minDate: new Date(1920, 0, 1).getTime(),
    // 最大日期（今天）
    maxDate: new Date().getTime(),
    // 格式化后的显示日期
    displayDate: '请选择生日',
    // 是否正在加载
    loading: false
  },

  methods: {
    /**
     * 日期选择变化
     */
    onDateChange: function(e) {
      const timestamp = e.detail;
      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const birthday = `${year}-${month}-${day}`;

      this.setData({
        birthday: birthday,
        displayDate: `${year}年${month}月${day}日`
      });
    },

    /**
     * 跳过，暂不填写
     */
    onSkip: function() {
      this.triggerEvent('skip');
    },

    /**
     * 提交生日
     */
    onSubmit: function() {
      if (!this.data.birthday) {
        util.showErrorToast('请选择您的生日');
        return;
      }

      this.setData({ loading: true });

      util.request(api.UserProfile, {
        birthday: this.data.birthday
      }, 'POST').then(res => {
        this.setData({ loading: false });
        if (res.errno === 0) {
          this.triggerEvent('submit', { birthday: this.data.birthday, coupon: res.data && res.data.coupon || null });
        } else {
          util.showErrorToast(res.errmsg || '保存失败');
        }
      }).catch(err => {
        this.setData({ loading: false });
        util.showErrorToast('网络错误');
      });
    },

    /**
     * 点击遮罩层（禁止关闭）
     */
    onOverlayClick: function() {
      // 不做任何处理，禁止点击遮罩关闭
    }
  }
});
