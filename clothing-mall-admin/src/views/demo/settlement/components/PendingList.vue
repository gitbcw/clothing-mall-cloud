<template>
  <div class="pending-list">
    <div class="filter-container">
      <el-input placeholder="订单号" style="width: 200px;" class="filter-item" />
      <el-select placeholder="供应商" class="filter-item" style="width: 150px">
        <el-option label="全部" value="" />
      </el-select>
      <el-button class="filter-item" type="primary" icon="el-icon-search">搜索</el-button>
    </div>

    <el-table :data="list" border size="small" style="width: 100%">
      <el-table-column prop="orderSn" label="订单号" width="180" />
      <el-table-column prop="time" label="成交时间" width="180" />
      <el-table-column prop="supplier" label="供应商" />
      <el-table-column prop="settleStatus" label="结算状态" width="120">
        <template slot-scope="scope">
          <el-tag size="mini">{{ scope.row.settleStatus }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="amount" label="订单金额">
        <template slot-scope="scope">¥{{ scope.row.amount }}</template>
      </el-table-column>
      <el-table-column prop="supplyCost" label="供货价">
        <template slot-scope="scope">¥{{ scope.row.supplyCost }}</template>
      </el-table-column>
      <el-table-column prop="settleAmount" label="预计结算">
        <template slot-scope="scope">
          <span style="color: #67c23a;">¥{{ scope.row.settleAmount }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="judgeReason" label="入账判定" />
      <el-table-column prop="frozenUntil" label="冻结至" width="160" />
      <el-table-column prop="status" label="订单状态" width="100">
        <template slot-scope="scope">
          <el-tag size="mini">{{ scope.row.status }}</el-tag>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script>
export default {
  name: 'PendingList',
  data() {
    return {
      list: []
    }
  },
  created() {
    for (let i = 0; i < 10; i++) {
      this.list.push({
        orderSn: 'ORD' + (20230000 + i),
        time: '2023-10-15 14:30:00',
        supplier: '供应商 A',
        settleStatus: i % 3 === 0 ? '冻结' : '待结',
        amount: (Math.random() * 1000 + 100).toFixed(2),
        supplyCost: function() { const a = this.amount; return (a - a * 0.25).toFixed(2) }.call({ amount: (Math.random() * 1000 + 100).toFixed(2) }),
        settleAmount: function() { const a = this.amount; return (a - a * 0.25).toFixed(2) }.call({ amount: (Math.random() * 1000 + 100).toFixed(2) }),
        judgeReason: i % 3 === 0 ? '售后中冻结' : '订单完成入账',
        frozenUntil: i % 3 === 0 ? '2023-10-22 00:00' : '',
        status: '待结算'
      })
    }
  }
}
</script>
