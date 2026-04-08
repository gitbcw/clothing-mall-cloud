<template>
  <div class="app-container">
    <el-form ref="dataForm" :rules="rules" :model="dataForm" status-icon label-width="200px">

      <!-- 订单规则 -->
      <el-divider content-position="left">订单规则</el-divider>

      <el-form-item label="订单超时取消" prop="litemall_order_unpaid">
        <el-input v-model="dataForm.litemall_order_unpaid" style="width: 200px;">
          <template slot="append">分钟</template>
        </el-input>
        <span class="form-tip">用户未付款，则订单自动取消</span>
      </el-form-item>

      <el-form-item label="自动确认收货" prop="litemall_order_unconfirm">
        <el-input v-model="dataForm.litemall_order_unconfirm" style="width: 200px;">
          <template slot="append">天</template>
        </el-input>
        <span class="form-tip">发货后未确认收货，则自动确认</span>
      </el-form-item>

      <!-- 运费规则 -->
      <el-divider content-position="left">运费规则</el-divider>

      <el-form-item label="运费计费方式" prop="litemall_express_freight_type">
        <el-radio-group v-model="dataForm.litemall_express_freight_type">
          <el-radio label="0">固定运费</el-radio>
          <el-radio label="1">按件数计费</el-radio>
        </el-radio-group>
        <div class="form-tip-block">固定运费：统一收取固定运费；按件数计费：首件+续件阶梯计费</div>
      </el-form-item>

      <el-form-item label="满额包邮" prop="litemall_express_freight_min">
        <el-input v-model="dataForm.litemall_express_freight_min" style="width: 200px;">
          <template slot="append">元</template>
        </el-input>
        <span class="form-tip">订单金额达到此数值免运费，0表示不启用</span>
      </el-form-item>

      <!-- 固定运费模式 -->
      <el-form-item v-if="dataForm.litemall_express_freight_type === '0'" label="固定运费" prop="litemall_express_freight_value">
        <el-input v-model="dataForm.litemall_express_freight_value" style="width: 200px;">
          <template slot="append">元</template>
        </el-input>
      </el-form-item>

      <!-- 按件数计费模式 -->
      <template v-if="dataForm.litemall_express_freight_type === '1'">
        <el-form-item label="首件数量" prop="litemall_express_freight_first_unit">
          <el-input v-model="dataForm.litemall_express_freight_first_unit" style="width: 200px;">
            <template slot="append">件</template>
          </el-input>
          <span class="form-tip">首件运费包含的商品件数</span>
        </el-form-item>

        <el-form-item label="首件运费" prop="litemall_express_freight_value">
          <el-input v-model="dataForm.litemall_express_freight_value" style="width: 200px;">
            <template slot="append">元</template>
          </el-input>
          <span class="form-tip">首件数量内的运费</span>
        </el-form-item>

        <el-form-item label="续件数量" prop="litemall_express_freight_additional_unit">
          <el-input v-model="dataForm.litemall_express_freight_additional_unit" style="width: 200px;">
            <template slot="append">件</template>
          </el-input>
          <span class="form-tip">超过首件后，每增加的件数</span>
        </el-form-item>

        <el-form-item label="续件运费" prop="litemall_express_freight_additional">
          <el-input v-model="dataForm.litemall_express_freight_additional" style="width: 200px;">
            <template slot="append">元</template>
          </el-input>
          <span class="form-tip">每增加一个续件数量收取的运费</span>
        </el-form-item>
      </template>

      <el-form-item>
        <el-button @click="cancel">重置</el-button>
        <el-button type="primary" @click="update">保存配置</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import { listOrder, updateOrder, listExpress, updateExpress } from '@/api/config'

export default {
  name: 'ConfigRule',
  data() {
    return {
      dataForm: {
        // 订单规则
        litemall_order_unpaid: 0,
        litemall_order_unconfirm: 0,
        // 运费规则
        litemall_express_freight_type: '0',
        litemall_express_freight_min: 0,
        litemall_express_freight_value: 0,
        litemall_express_freight_first_unit: 1,
        litemall_express_freight_additional_unit: 1,
        litemall_express_freight_additional: 0
      },
      rules: {
        litemall_order_unpaid: [
          { required: true, message: '不能为空', trigger: 'blur' }
        ],
        litemall_order_unconfirm: [
          { required: true, message: '不能为空', trigger: 'blur' }
        ],
        litemall_express_freight_min: [
          { required: true, message: '不能为空', trigger: 'blur' }
        ],
        litemall_express_freight_value: [
          { required: true, message: '不能为空', trigger: 'blur' }
        ]
      }
    }
  },
  created() {
    this.init()
  },
  methods: {
    init() {
      // 加载订单配置
      listOrder().then(response => {
        this.dataForm.litemall_order_unpaid = response.data.data.litemall_order_unpaid || 0
        this.dataForm.litemall_order_unconfirm = response.data.data.litemall_order_unconfirm || 0
      })
      // 加载运费配置
      listExpress().then(response => {
        const data = response.data.data
        this.dataForm.litemall_express_freight_type = data.litemall_express_freight_type || '0'
        this.dataForm.litemall_express_freight_min = data.litemall_express_freight_min || 0
        this.dataForm.litemall_express_freight_value = data.litemall_express_freight_value || 0
        this.dataForm.litemall_express_freight_first_unit = data.litemall_express_freight_first_unit || 1
        this.dataForm.litemall_express_freight_additional_unit = data.litemall_express_freight_additional_unit || 1
        this.dataForm.litemall_express_freight_additional = data.litemall_express_freight_additional || 0
      })
    },
    cancel() {
      this.init()
    },
    update() {
      this.$refs['dataForm'].validate((valid) => {
        if (!valid) {
          return false
        }
        this.doUpdate()
      })
    },
    doUpdate() {
      // 保存订单配置
      const orderData = {
        litemall_order_unpaid: this.dataForm.litemall_order_unpaid,
        litemall_order_unconfirm: this.dataForm.litemall_order_unconfirm
      }
      // 保存运费配置
      const expressData = {
        litemall_express_freight_type: this.dataForm.litemall_express_freight_type,
        litemall_express_freight_min: this.dataForm.litemall_express_freight_min,
        litemall_express_freight_value: this.dataForm.litemall_express_freight_value,
        litemall_express_freight_first_unit: this.dataForm.litemall_express_freight_first_unit,
        litemall_express_freight_additional_unit: this.dataForm.litemall_express_freight_additional_unit,
        litemall_express_freight_additional: this.dataForm.litemall_express_freight_additional
      }

      Promise.all([
        updateOrder(orderData),
        updateExpress(expressData)
      ]).then(() => {
        this.$notify.success({
          title: '成功',
          message: '平台规则配置成功'
        })
      }).catch(response => {
        this.$notify.error({
          title: '失败',
          message: response.data?.errmsg || '配置保存失败'
        })
      })
    }
  }
}
</script>

<style scoped>
.form-tip {
  margin-left: 15px;
  color: #909399;
  font-size: 12px;
}
.form-tip-block {
  margin-top: 5px;
  color: #909399;
  font-size: 12px;
}
.el-divider--horizontal {
  margin: 30px 0 20px;
}
.el-divider__text {
  font-weight: 500;
  font-size: 15px;
  color: #303133;
}
</style>
