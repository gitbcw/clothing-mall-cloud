<template>
  <div class="payment-records">
    <el-table :data="list" border style="width: 100%">
      <el-table-column prop="batchNo" label="打款批次号" width="200" />
      <el-table-column prop="statementId" label="结算单号" width="160" />
      <el-table-column prop="channel" label="支付渠道" width="120" />
      <el-table-column prop="supplier" label="供应商" width="140" />
      <el-table-column prop="account" label="收款账户" />
      <el-table-column prop="amount" label="打款金额">
        <template slot-scope="scope">¥{{ scope.row.amount }}</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template slot-scope="scope">
          <el-tag :type="scope.row.status === '成功' ? 'success' : 'danger'">{{ scope.row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="failureReason" label="失败原因" />
      <el-table-column prop="transactionId" label="交易流水号" width="220" />
      <el-table-column prop="time" label="打款时间" width="180" />
      <el-table-column label="操作" width="100">
        <template slot-scope="scope">
          <el-button v-if="scope.row.status === '失败'" type="text" size="mini" @click="retry(scope.$index)">重试</el-button>
          <el-button type="text" size="mini" @click="voucher(scope.$index)">凭证</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script>
export default {
  name: 'PaymentRecords',
  data() {
    return {
      list: [
        { batchNo: 'PAY20231015001', statementId: 'SET20231001', supplier: '供应商 A', channel: '支付宝', account: 'test@alipay.com', amount: '5000.00', status: '成功', failureReason: '', transactionId: 'ALI20231015001XYZ', time: '2023-10-15 10:00:00' },
        { batchNo: 'PAY20231015002', statementId: 'SET20231002', supplier: '供应商 B', channel: '银行转账', account: '6222****8888', amount: '12000.50', status: '失败', failureReason: '账户名与开户行不一致', transactionId: '', time: '2023-10-15 10:05:00' }
      ]
    }
  },
  methods: {
    retry(index) {
      const item = this.list[index]
      item.status = '成功'
      item.failureReason = ''
      item.transactionId = item.channel === '银行转账' ? 'BANK' + item.batchNo + 'OK' : 'ALI' + item.batchNo + 'OK'
      this.$message.success('重试成功')
    },
    voucher(index) {
      const item = this.list[index]
      this.$alert('演示凭证：' + (item.transactionId || '暂无'), '凭证')
    }
  }
}
</script>
