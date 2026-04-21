<template>
  <div class="app-container">
    <!-- 筛选栏 -->
    <div class="filter-container">
      <el-radio-group v-model="filterCategory" size="small" @change="handleFilter">
        <el-radio-button label="">全部</el-radio-button>
        <el-radio-button label="browse">浏览</el-radio-button>
        <el-radio-button label="goods">商品</el-radio-button>
        <el-radio-button label="trade">交易</el-radio-button>
        <el-radio-button label="social">社交</el-radio-button>
        <el-radio-button label="push">推送</el-radio-button>
      </el-radio-group>
      <el-input
        v-model="keyword"
        placeholder="搜索事件类型/名称"
        size="small"
        style="width: 200px; margin-left: 16px;"
        clearable
        @clear="handleFilter"
        @keyup.enter.native="handleFilter"
      />
      <el-button size="small" style="margin-left: 8px;" @click="handleFilter">搜索</el-button>
    </div>

    <!-- 统计概览 -->
    <el-row :gutter="16" class="summary-row">
      <el-col :span="6">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-label">事件类型总数</div>
          <div class="summary-value">{{ configList.length }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-label">已启用</div>
          <div class="summary-value enabled">{{ enabledCount }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-label">已禁用</div>
          <div class="summary-value disabled">{{ configList.length - enabledCount }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-label">近7天总事件量</div>
          <div class="summary-value">{{ totalEvents }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 配置表格 -->
    <el-table :data="filteredList" border stripe>
      <el-table-column prop="eventType" label="事件类型" width="140" />
      <el-table-column prop="eventName" label="事件名称" width="120" />
      <el-table-column prop="categoryName" label="分类" width="80" align="center">
        <template slot-scope="scope">
          <el-tag size="mini" :type="tagType(scope.row.category)">{{ scope.row.categoryName }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
      <el-table-column label="关联页面" width="100" align="center">
        <template slot-scope="scope">
          <el-popover v-if="scope.row.pageRoutes && scope.row.pageRoutes.length > 0" trigger="hover" placement="left">
            <div v-for="(route, idx) in scope.row.pageRoutes" :key="idx" class="route-item">{{ route }}</div>
            <span slot="reference" class="link-text">{{ scope.row.pageRoutes.length }} 个</span>
          </el-popover>
          <span v-else class="muted">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="last7Days" label="近7天事件量" width="120" align="right">
        <template slot-scope="scope">
          {{ scope.row.last7Days | numberFormat }}
        </template>
      </el-table-column>
      <el-table-column label="最后触发" width="160">
        <template slot-scope="scope">
          <span v-if="scope.row.lastTime">{{ scope.row.lastTime }}</span>
          <span v-else class="muted">无记录</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90" align="center">
        <template slot-scope="scope">
          <el-switch
            v-model="scope.row.enabled"
            @change="handleToggle(scope.row)"
          />
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script>
import { trackerConfigList, trackerConfigUpdate } from '@/api/stat'

export default {
  name: 'StatTrackerConfig',
  filters: {
    numberFormat(value) {
      if (!value) return '0'
      return Number(value).toLocaleString()
    }
  },
  data() {
    return {
      configList: [],
      filterCategory: '',
      keyword: ''
    }
  },
  computed: {
    filteredList() {
      let list = this.configList
      if (this.filterCategory) {
        list = list.filter(r => r.category === this.filterCategory)
      }
      if (this.keyword) {
        const kw = this.keyword.toLowerCase()
        list = list.filter(r =>
          r.eventType.toLowerCase().includes(kw) ||
          r.eventName.includes(kw)
        )
      }
      return list
    },
    enabledCount() {
      return this.configList.filter(r => r.enabled).length
    },
    totalEvents() {
      return this.configList.reduce((s, r) => s + r.last7Days, 0)
    }
  },
  created() {
    this.fetchList()
  },
  methods: {
    tagType(category) {
      const map = { browse: '', goods: 'success', trade: 'warning', social: 'info', push: 'danger' }
      return map[category] || ''
    },
    handleFilter() {
      // computed 自动响应
    },
    fetchList() {
      trackerConfigList().then(response => {
        this.configList = response.data.data || []
      })
    },
    handleToggle(row) {
      trackerConfigUpdate({
        eventType: row.eventType,
        enabled: row.enabled
      }).then(() => {
        this.$message.success(`${row.eventName} 已${row.enabled ? '启用' : '禁用'}`)
      }).catch(() => {
        row.enabled = !row.enabled
      })
    }
  }
}
</script>

<style scoped>
.filter-container {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
}
.summary-row {
  margin-bottom: 16px;
}
.summary-card {
  text-align: center;
  padding: 8px 0;
}
.summary-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 6px;
}
.summary-value {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
}
.summary-value.enabled {
  color: #67C23A;
}
.summary-value.disabled {
  color: #F56C6C;
}
.link-text {
  color: #409EFF;
  cursor: pointer;
}
.muted {
  color: #C0C4CC;
}
.route-item {
  font-size: 12px;
  line-height: 1.8;
  color: #606266;
}
</style>
