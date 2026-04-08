<template>
  <div class="settlement-settings">
    <el-form ref="form" :model="form" label-width="180px" style="width: 600px;">
      <el-form-item label="结算模式">
        <el-radio-group v-model="form.mode">
          <el-radio label="consignment">平台代销</el-radio>
          <el-radio label="commission">佣金分成</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="结算周期">
        <el-select v-model="form.cycle" placeholder="请选择">
          <el-option label="月结 (每月1号)" value="month" />
          <el-option label="周结 (每周一)" value="week" />
          <el-option label="T+1 (次日结算)" value="t1" />
        </el-select>
      </el-form-item>

      <el-form-item label="自动结算规则">
        <el-checkbox v-model="form.autoConfirm">订单完成后自动加入结算</el-checkbox>
      </el-form-item>

      <el-form-item label="售后冻结期 (天)">
        <el-input-number v-model="form.frozenDays" :min="0" :max="30" />
        <span class="tip"> 订单完成后多少天内发生售后将冻结资金</span>
      </el-form-item>

      <el-form-item v-if="form.mode==='commission'" label="默认平台佣金比例 (%)">
        <el-input-number v-model="form.commissionRate" :min="0" :max="100" />
      </el-form-item>

      <el-form-item label="打款方式">
        <el-radio-group v-model="form.payMethod">
          <el-radio label="manual">人工审核打款</el-radio>
          <el-radio label="auto">系统自动打款 (直连银行)</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="save">保存设置</el-button>
      </el-form-item>
    </el-form>
    <el-divider content-position="left">当前入账规则预览</el-divider>
    <el-descriptions border style="width: 600px;">
      <el-descriptions-item label="结算周期">{{ cycleName }}</el-descriptions-item>
      <el-descriptions-item v-if="form.mode==='commission'" label="佣金比例">{{ form.commissionRate }}%</el-descriptions-item>
      <el-descriptions-item v-if="form.mode==='consignment'" label="结算模式">平台代销（按供货价结算）</el-descriptions-item>
      <el-descriptions-item label="售后冻结期">{{ form.frozenDays }}天</el-descriptions-item>
      <el-descriptions-item label="口径说明">{{ ruleDesc }}</el-descriptions-item>
    </el-descriptions>
  </div>
</template>

<script>
export default {
  name: 'Settings',
  data() {
    return {
      form: {
        mode: 'consignment',
        cycle: 'month',
        autoConfirm: true,
        frozenDays: 7,
        commissionRate: 5,
        payMethod: 'manual'
      }
    }
  },
  computed: {
    cycleName() {
      const map = { month: '月结', week: '周结', t1: 'T+1' }
      return map[this.form.cycle]
    },
    ruleDesc() {
      if (this.form.mode === 'consignment') {
        return '平台代销：按订单供货价入账为货款，订单完成后进入冻结期，超期未售后入账；售后退款冲减货款'
      }
      return '佣金分成：订单完成后进入冻结期，超期未售后入账；按佣金比例扣除后结算'
    }
  },
  created() {
    const raw = localStorage.getItem('demo_settlement_settings')
    if (raw) {
      try {
        const s = JSON.parse(raw)
        this.form = Object.assign({}, this.form, s)
      } catch (e) {}
    }
  },
  methods: {
    save() {
      localStorage.setItem('demo_settlement_settings', JSON.stringify(this.form))
      this.$message.success('设置已保存')
    }
  }
}
</script>

<style scoped>
.tip {
  color: #909399;
  font-size: 12px;
  margin-left: 10px;
}
</style>
