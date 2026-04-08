<template>
  <div class="app-container">
    <el-form ref="dataForm" :model="dataForm" status-icon label-width="300px">
      <el-form-item label="企业微信客服链接" prop="litemall_customer_service_url">
        <el-input v-model="dataForm.litemall_customer_service_url" class="input-width" placeholder="请输入企业微信客服链接" />
        <span class="info">小程序点击"联系客服"时跳转的链接，格式如：https://work.weixin.qq.com/kfid/xxxxx</span>
      </el-form-item>

      <el-form-item>
        <el-button @click="cancel">{{ $t('app.button.cancel') }}</el-button>
        <el-button type="primary" @click="update">{{ $t('app.button.confirm') }}</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import { listPromotion, updatePromotion } from '@/api/config'

export default {
  name: 'ConfigService',
  data() {
    return {
      dataForm: {
        litemall_customer_service_url: ''
      }
    }
  },
  created() {
    this.init()
  },
  methods: {
    init() {
      listPromotion().then(response => {
        const data = response.data.data
        this.dataForm = { ...this.dataForm, ...data }
      })
    },
    cancel() {
      this.init()
    },
    update() {
      updatePromotion(this.dataForm)
        .then(() => {
          this.$notify.success({ title: '成功', message: '客服设置保存成功' })
        })
        .catch(response => {
          this.$notify.error({ title: '失败', message: response.data?.errmsg || '保存失败' })
        })
    }
  }
}
</script>

<style scoped>
.input-width {
  width: 300px;
}
.info {
  margin-left: 15px;
  color: #909399;
  font-size: 12px;
}
</style>
