<template>
  <div class="app-container">
    <el-form ref="dataForm" :rules="rules" :model="dataForm" status-icon label-width="300px">
      <el-form-item label="运费计费方式" prop="litemall_express_freight_type">
        <el-radio-group v-model="dataForm.litemall_express_freight_type">
          <el-radio label="0">固定运费</el-radio>
          <el-radio label="1">按件数计费</el-radio>
        </el-radio-group>
        <div class="form-tip">
          <span class="tip-text">固定运费：统一收取固定运费；按件数计费：首件+续件阶梯计费</span>
        </div>
      </el-form-item>

      <el-form-item :label="$t('config_express.form.freight_min')" prop="litemall_express_freight_min">
        <el-input v-model="dataForm.litemall_express_freight_min" style="width: 200px;">
          <template slot="append">元</template>
        </el-input>
        <div class="form-tip">
          <span class="tip-text">订单金额达到此数值免运费，0表示不启用满额包邮</span>
        </div>
      </el-form-item>

      <!-- 固定运费模式 -->
      <el-form-item v-if="dataForm.litemall_express_freight_type === '0'" :label="$t('config_express.form.freight_value')" prop="litemall_express_freight_value">
        <el-input v-model="dataForm.litemall_express_freight_value" style="width: 200px;">
          <template slot="append">元</template>
        </el-input>
      </el-form-item>

      <!-- 按件数计费模式 -->
      <template v-if="dataForm.litemall_express_freight_type === '1'">
        <el-divider content-position="left">按件数计费设置</el-divider>

        <el-form-item label="首件数量" prop="litemall_express_freight_first_unit">
          <el-input v-model="dataForm.litemall_express_freight_first_unit" style="width: 200px;">
            <template slot="append">件</template>
          </el-input>
          <div class="form-tip">
            <span class="tip-text">首件运费包含的商品件数</span>
          </div>
        </el-form-item>

        <el-form-item label="首件运费" prop="litemall_express_freight_value">
          <el-input v-model="dataForm.litemall_express_freight_value" style="width: 200px;">
            <template slot="append">元</template>
          </el-input>
          <div class="form-tip">
            <span class="tip-text">首件数量内的运费</span>
          </div>
        </el-form-item>

        <el-form-item label="续件数量" prop="litemall_express_freight_additional_unit">
          <el-input v-model="dataForm.litemall_express_freight_additional_unit" style="width: 200px;">
            <template slot="append">件</template>
          </el-input>
          <div class="form-tip">
            <span class="tip-text">超过首件后，每增加的件数</span>
          </div>
        </el-form-item>

        <el-form-item label="续件运费" prop="litemall_express_freight_additional">
          <el-input v-model="dataForm.litemall_express_freight_additional" style="width: 200px;">
            <template slot="append">元</template>
          </el-input>
          <div class="form-tip">
            <span class="tip-text">每增加一个续件数量收取的运费</span>
          </div>
        </el-form-item>
      </template>

      <el-form-item>
        <el-button @click="cancel">{{ $t('app.button.cancel') }}</el-button>
        <el-button type="primary" @click="update">{{ $t('app.button.confirm') }}</el-button>
      </el-form-item>
    </el-form></div>
</template>

<script>
import { listExpress, updateExpress } from '@/api/config'

export default {
  name: 'ConfigExpress',
  data() {
    return {
      dataForm: {
        litemall_express_freight_type: '0',
        litemall_express_freight_min: 0,
        litemall_express_freight_value: 0,
        litemall_express_freight_first_unit: 1,
        litemall_express_freight_additional_unit: 1,
        litemall_express_freight_additional: 0
      },
      rules: {
        litemall_express_freight_min: [
          { required: true, message: '不能为空', trigger: 'blur' }
        ],
        litemall_express_freight_value: [
          { required: true, message: '不能为空', trigger: 'blur' }
        ],
        litemall_express_freight_type: [
          { required: true, message: '请选择运费计费方式', trigger: 'change' }
        ],
        litemall_express_freight_first_unit: [
          { required: true, message: '不能为空', trigger: 'blur' }
        ],
        litemall_express_freight_additional_unit: [
          { required: true, message: '不能为空', trigger: 'blur' }
        ],
        litemall_express_freight_additional: [
          { required: true, message: '不能为空', trigger: 'blur' }
        ]
      }
    }
  },
  created() {
    this.init()
  },
  methods: {
    init: function() {
      listExpress().then(response => {
        this.dataForm = response.data.data
        // 确保有默认值
        if (!this.dataForm.litemall_express_freight_type) {
          this.dataForm.litemall_express_freight_type = '0'
        }
        if (!this.dataForm.litemall_express_freight_first_unit) {
          this.dataForm.litemall_express_freight_first_unit = 1
        }
        if (!this.dataForm.litemall_express_freight_additional_unit) {
          this.dataForm.litemall_express_freight_additional_unit = 1
        }
        if (!this.dataForm.litemall_express_freight_additional) {
          this.dataForm.litemall_express_freight_additional = 0
        }
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
      updateExpress(this.dataForm).then(response => {
        this.$notify.success({
          title: '成功',
          message: '运费配置修改成功'
        })
      }).catch(response => {
        this.$notify.error({
          title: '失败',
          message: response.data.errmsg
        })
      })
    }
  }
}
</script>

<style scoped>
.form-tip {
  margin-top: 5px;
}
.tip-text {
  color: #909399;
  font-size: 12px;
}
</style>
