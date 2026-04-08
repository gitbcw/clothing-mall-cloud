<template>
  <div class="app-container">

    <!-- 查询和其他操作 -->
    <div class="filter-container">
      <el-input v-model="listQuery.name" clearable class="filter-item" style="width: 200px;" placeholder="请输入商品名称" />
      <el-button class="filter-item" type="primary" icon="el-icon-search" @click="handleFilter">查找</el-button>
      <el-button :loading="downloadLoading" class="filter-item" type="primary" icon="el-icon-download" @click="handleDownload">导出</el-button>
    </div>

    <!-- 查询结果 -->
    <el-table v-loading="listLoading" :data="list" element-loading-text="正在加载..." border fit highlight-current-row>

      <!-- 隐藏商品ID列 -->
      <!-- <el-table-column align="center" label="ID" prop="id" width="80" /> -->

      <el-table-column align="center" label="商品名称" prop="name" min-width="150" />

      <el-table-column align="center" label="协议价" prop="agreementPrice">
        <template slot-scope="scope">
          ¥{{ scope.row.agreementPrice }}
        </template>
      </el-table-column>

      <el-table-column align="center" label="售价" prop="sellingPrice">
        <template slot-scope="scope">
          ¥{{ scope.row.sellingPrice }}
        </template>
      </el-table-column>

      <el-table-column align="center" label="单价" prop="unitPrice">
        <template slot-scope="scope">
          ¥{{ scope.row.unitPrice }}
        </template>
      </el-table-column>

      <el-table-column align="center" label="销售额" prop="salesAmount">
        <template slot-scope="scope">
          ¥{{ scope.row.salesAmount }}
        </template>
      </el-table-column>

      <el-table-column align="center" label="营收" prop="revenue">
        <template slot-scope="scope">
          ¥{{ scope.row.revenue }}
        </template>
      </el-table-column>

      <el-table-column align="center" label="净利率" prop="netProfitMargin">
        <template slot-scope="scope">
          <el-tag :type="parseFloat(scope.row.netProfitMargin) > 20 ? 'success' : (parseFloat(scope.row.netProfitMargin) < 5 ? 'danger' : 'warning')">
            {{ scope.row.netProfitMargin }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column align="center" label="统计日期" prop="date" width="120" />

      <el-table-column align="center" label="操作" width="150" class-name="small-padding fixed-width">
        <template slot-scope="scope">
          <el-button type="primary" size="mini" @click="handleDetail(scope.row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total>0" :total="total" :page.sync="listQuery.page" :limit.sync="listQuery.limit" @pagination="getList" />

    <!-- 详情弹窗 -->
    <el-dialog title="营收详情" :visible.sync="detailDialogVisible" width="50%">
      <el-form :model="currentDetail" label-width="100px" label-position="left">
        <el-form-item label="商品名称">
          <span>{{ currentDetail.name }}</span>
        </el-form-item>
        <el-form-item label="协议价">
          <span>¥{{ currentDetail.agreementPrice }}</span>
        </el-form-item>
        <el-form-item label="售价">
          <span>¥{{ currentDetail.sellingPrice }}</span>
        </el-form-item>
        <el-form-item label="销售额">
          <span>¥{{ currentDetail.salesAmount }}</span>
        </el-form-item>
        <el-form-item label="营收">
          <span>¥{{ currentDetail.revenue }}</span>
        </el-form-item>
        <el-form-item label="净利率">
          <span>{{ currentDetail.netProfitMargin }}</span>
        </el-form-item>
        <el-form-item label="备注">
          <span>此数据为演示用的模拟数据。</span>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </div>
    </el-dialog>

  </div>
</template>

<script>
import Pagination from '@/components/Pagination' // Secondary package based on el-pagination

// Mock Data Generator
const generateMockData = (count) => {
  const data = []
  const productNames = [
    '华为 Mate 60 Pro', '小米 14 Pro', '荣耀 Magic6', 'OPPO Find X7',
    'vivo X100', '联想 ThinkPad X1', '海尔 滚筒洗衣机', '美的 电饭煲',
    '格力 变频空调', '海信 4K 电视', '苏泊尔 不粘炒锅', '九阳 破壁机',
    '飞利浦 电动牙刷', '戴森 V15 吸尘器', '小天才 电话手表'
  ]

  for (let i = 1; i <= count; i++) {
    const name = productNames[Math.floor(Math.random() * productNames.length)]
    const bands = [
      { k: ['华为', '小米', '荣耀', 'OPPO', 'vivo'], min: 3999, max: 7999 },
      { k: ['联想', 'ThinkPad'], min: 5999, max: 12999 },
      { k: ['海信', '电视'], min: 1999, max: 6999 },
      { k: ['格力', '空调'], min: 2499, max: 5999 },
      { k: ['美的', '电饭煲'], min: 199, max: 699 },
      { k: ['海尔', '洗衣机'], min: 1999, max: 4999 },
      { k: ['戴森', '吸尘器'], min: 2999, max: 4999 },
      { k: ['飞利浦', '牙刷'], min: 199, max: 699 },
      { k: ['九阳', '破壁机'], min: 399, max: 1999 },
      { k: ['苏泊尔', '炒锅'], min: 99, max: 299 },
      { k: ['小天才', '手表'], min: 499, max: 1599 }
    ]
    const band = bands.find(b => b.k.some(t => name.includes(t))) || { min: 299, max: 9999 }
    const price = Math.round(band.min + Math.random() * (band.max - band.min))

    let salesCount
    if (price <= 500) {
      salesCount = Math.floor(200 + Math.random() * 1800)
    } else if (price <= 1500) {
      salesCount = Math.floor(120 + Math.random() * 900)
    } else if (price <= 3500) {
      salesCount = Math.floor(70 + Math.random() * 500)
    } else if (price <= 6000) {
      salesCount = Math.floor(40 + Math.random() * 300)
    } else {
      salesCount = Math.floor(20 + Math.random() * 200)
    }

    const salesAmount = +(price * salesCount).toFixed(2)
    const grossMargin = Math.min(0.22, Math.max(0.05, 0.12 + (Math.random() - 0.5) * 0.1))
    const feePct = 0.01 + Math.random() * 0.02
    const netPct = Math.max(0.03, +(grossMargin - feePct).toFixed(4))
    const revenue = +(salesAmount * netPct).toFixed(2)
    const costTotal = +(salesAmount - revenue).toFixed(2)
    const agreementPrice = Math.round(costTotal / salesCount)
    const margin = (netPct * 100).toFixed(2) + '%'

    data.push({
      id: i,
      name: name,
      agreementPrice: agreementPrice,
      sellingPrice: price,
      unitPrice: price,
      salesAmount: salesAmount,
      revenue: revenue,
      netProfitMargin: margin,
      date: new Date(Date.now() - Math.floor(Math.pow(Math.random(), 2) * 180) * 86400000).toISOString().split('T')[0]
    })
  }
  return data
}

// Generate 100 fake records
const ALL_DATA = generateMockData(100)

export default {
  name: 'RevenueList',
  components: { Pagination },
  data() {
    return {
      list: [],
      total: 0,
      listLoading: true,
      listQuery: {
        page: 1,
        limit: 20,
        name: undefined
      },
      detailDialogVisible: false,
      currentDetail: {},
      downloadLoading: false
    }
  },
  created() {
    this.getList()
  },
  methods: {
    getList() {
      this.listLoading = true

      // Simulate API delay
      setTimeout(() => {
        let filteredData = ALL_DATA
        if (this.listQuery.name) {
          filteredData = filteredData.filter(item => item.name.toLowerCase().includes(this.listQuery.name.toLowerCase()))
        }

        this.total = filteredData.length
        const start = (this.listQuery.page - 1) * this.listQuery.limit
        const end = start + this.listQuery.limit
        this.list = filteredData.slice(start, end)

        this.listLoading = false
      }, 500)
    },
    handleFilter() {
      this.listQuery.page = 1
      this.getList()
    },
    handleDetail(row) {
      this.currentDetail = row
      this.detailDialogVisible = true
    },
    handleDownload() {
      this.downloadLoading = true
      import('@/vendor/Export2Excel').then(excel => {
        const tHeader = ['ID', '商品名称', '协议价', '售价', '销售额', '营收', '净利率', '日期']
        const filterVal = ['id', 'name', 'agreementPrice', 'sellingPrice', 'salesAmount', 'revenue', 'netProfitMargin', 'date']
        excel.export_json_to_excel({
          header: tHeader,
          data: this.formatJson(filterVal, this.list),
          filename: 'revenue-list-demo'
        })
        this.downloadLoading = false
      })
    },
    formatJson(filterVal, jsonData) {
      return jsonData.map(v => filterVal.map(j => v[j]))
    }
  }
}
</script>

<style scoped>
  .fixed-width .el-button--mini {
    padding: 7px 10px;
    width: 60px;
  }
</style>
