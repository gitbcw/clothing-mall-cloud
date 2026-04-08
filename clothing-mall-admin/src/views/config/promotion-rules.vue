<template>
  <div class="app-container">
    <el-form ref="dataForm" :model="dataForm" status-icon label-width="300px">
      <el-divider content-position="left">新人优惠</el-divider>
      <el-form-item label="首单立减金额" prop="litemall_newuser_first_order_discount">
        <el-input v-model="dataForm.litemall_newuser_first_order_discount" class="input-width">
          <template slot="append">元</template>
        </el-input>
        <span class="info">新用户首单可享受的立减金额，设为0则不启用</span>
      </el-form-item>

      <el-divider content-position="left">生日优惠券</el-divider>
      <el-form-item label="启用生日券" prop="litemall_birthday_coupon_status">
        <el-switch v-model="birthdayCouponEnabled" active-value="1" inactive-value="0" />
      </el-form-item>
      <el-form-item label="生日券模板ID" prop="litemall_birthday_coupon_id">
        <el-select v-model="dataForm.litemall_birthday_coupon_id" placeholder="请选择优惠券模板" class="input-width" :disabled="birthdayCouponEnabled !== '1'">
          <el-option v-for="item in couponList" :key="item.id" :label="item.name + ' (满' + item.min + '减' + item.discount + ')'" :value="String(item.id)" />
        </el-select>
        <span class="info">用户生日当天自动发放的优惠券</span>
      </el-form-item>
      <el-form-item label="生日券有效期" prop="litemall_birthday_coupon_days">
        <el-input v-model="dataForm.litemall_birthday_coupon_days" class="input-width" :disabled="birthdayCouponEnabled !== '1'">
          <template slot="append">天</template>
        </el-input>
        <span class="info">生日券发放后的有效天数</span>
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
import { listCoupon } from '@/api/coupon'

export default {
  name: 'ConfigPromotionRules',
  data() {
    return {
      dataForm: {
        litemall_newuser_first_order_discount: '0',
        litemall_birthday_coupon_status: '0',
        litemall_birthday_coupon_id: '',
        litemall_birthday_coupon_days: '30'
      },
      couponList: []
    }
  },
  computed: {
    birthdayCouponEnabled: {
      get() {
        return this.dataForm.litemall_birthday_coupon_status
      },
      set(val) {
        this.dataForm.litemall_birthday_coupon_status = val
      }
    }
  },
  created() {
    this.init()
    this.loadCouponList()
  },
  methods: {
    init() {
      listPromotion().then(response => {
        const data = response.data.data
        this.dataForm = { ...this.dataForm, ...data }
      })
    },
    loadCouponList() {
      listCoupon({ page: 1, limit: 100 }).then(response => {
        this.couponList = response.data.data.list || []
      })
    },
    cancel() {
      this.init()
    },
    update() {
      updatePromotion(this.dataForm)
        .then(() => {
          this.$notify.success({ title: '成功', message: '促销规则保存成功' })
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
.el-divider--horizontal {
  margin: 24px 0 16px;
}
</style>
