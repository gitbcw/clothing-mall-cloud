<template>
  <div class="app-container special-page">

    <!-- 筛选栏 -->
    <div class="search-bar">
      <div class="search-bar__inner">
        <div class="search-bar__filters">
          <el-input
            v-model="listQuery.name"
            clearable
            size="small"
            prefix-icon="el-icon-search"
            placeholder="搜索商品名称"
            class="filter-input filter-input--wide"
          />
          <el-select
            v-model="listQuery.categoryId"
            clearable
            size="small"
            placeholder="商品分类"
            class="filter-input"
            @change="handleFilter"
          >
            <el-option v-for="item in categoryList" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </div>
        <div class="search-bar__actions">
          <el-button size="small" type="primary" icon="el-icon-search" @click="handleFilter">搜索</el-button>
          <el-button size="small" type="primary" plain icon="el-icon-plus" @click="handleOpenAdd">添加特价商品</el-button>
        </div>
      </div>
      <!-- 批量操作栏 -->
      <transition name="slide-down">
        <div v-if="selectedRows.length > 0" class="batch-bar">
          <span class="batch-bar__info">
            <i class="el-icon-info" />
            已选择 <strong>{{ selectedRows.length }}</strong> 件商品
          </span>
          <div class="batch-bar__actions">
            <el-button size="mini" type="success" @click="handleBatchPublish">批量上架</el-button>
            <el-button size="mini" type="warning" @click="handleBatchUnpublish">批量下架</el-button>
            <el-button size="mini" type="danger" @click="handleBatchCancelSpecial">批量取消特价</el-button>
          </div>
        </div>
      </transition>
    </div>

    <!-- 查询结果 -->
    <el-table
      v-loading="listLoading"
      :data="list"
      element-loading-text="正在查询中。。。"
      border
      fit
      highlight-current-row
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="45" align="center" />
      <el-table-column align="center" label="商品图" width="72">
        <template slot-scope="scope">
          <el-image
            v-if="scope.row.picUrl"
            :src="imageUrl(scope.row.picUrl)"
            style="width: 40px; height: 40px; border-radius: 4px;"
            fit="cover"
          />
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="商品名称" prop="name" min-width="160" show-overflow-tooltip>
        <template slot-scope="scope">
          <span class="goods-name">{{ scope.row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column align="center" label="一口价" prop="retailPrice" width="90">
        <template slot-scope="scope">
          <span class="price">¥{{ scope.row.retailPrice }}</span>
        </template>
      </el-table-column>
      <el-table-column align="center" label="特价" width="100">
        <template slot-scope="scope">
          <span v-if="scope.row.specialPrice" class="badge badge--special">¥{{ scope.row.specialPrice }}</span>
          <span v-else class="badge badge--special">特价</span>
        </template>
      </el-table-column>
      <el-table-column align="center" label="折扣" width="80">
        <template slot-scope="scope">
          <span v-if="scope.row.specialPrice && scope.row.retailPrice" class="discount">
            {{ Math.round(scope.row.specialPrice / scope.row.retailPrice * 100) / 10 }}折
          </span>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column align="center" label="状态" width="100">
        <template slot-scope="scope">
          <span :class="['status-dot', 'status-dot--' + (scope.row.status || 'pending')]">
            <i class="dot" />
            {{ statusText(scope.row.status) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column align="center" label="操作" width="200" class-name="small-padding fixed-width">
        <template slot-scope="scope">
          <el-button v-if="scope.row.status !== 'published'" type="text" size="mini" class="action-btn action-btn--success" @click="handlePublish(scope.row)">上架</el-button>
          <el-button v-if="scope.row.status === 'published'" type="text" size="mini" class="action-btn action-btn--warning" @click="handleUnpublish(scope.row)">下架</el-button>
          <el-divider direction="vertical" />
          <el-button type="text" size="mini" class="action-btn" @click="handleUpdate(scope.row)">编辑</el-button>
          <el-divider direction="vertical" />
          <el-button type="text" size="mini" class="action-btn action-btn--danger" @click="handleCancelSpecial(scope.row)">取消特价</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" :page.sync="listQuery.page" :limit.sync="listQuery.limit" @pagination="getList" />

    <!-- 添加特价商品对话框 -->
    <el-dialog :visible.sync="addDialogVisible" title="添加特价商品" width="700" custom-class="add-dialog">
      <div class="add-dialog__search">
        <el-input v-model="addQuery.name" placeholder="搜索商品名称" style="width: 220px;" clearable prefix-icon="el-icon-search" @keyup.enter.native="loadAddList" />
        <el-select v-model="addQuery.categoryId" clearable placeholder="分类" style="width: 140px;" @change="loadAddList">
          <el-option v-for="item in categoryList" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-button type="primary" size="small" @click="loadAddList">搜索</el-button>
        <span v-if="addSelectedIds.length" class="add-dialog__count">已勾选 {{ addSelectedIds.length }} 件</span>
      </div>
      <el-table
        ref="addTable"
        v-loading="addLoading"
        :data="addList"
        border
        max-height="400"
        @selection-change="handleAddSelectionChange"
      >
        <el-table-column type="selection" width="55" :reserve-selection="true" />
        <el-table-column align="center" label="商品图" width="72">
          <template slot-scope="scope">
            <el-image v-if="scope.row.picUrl" :src="imageUrl(scope.row.picUrl)" style="width: 36px; height: 36px; border-radius: 4px;" fit="cover" />
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column align="center" label="商品名称" prop="name" show-overflow-tooltip />
        <el-table-column align="center" label="一口价" prop="retailPrice" width="90">
          <template slot-scope="scope">
            <span>¥{{ scope.row.retailPrice }}</span>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        layout="total, prev, pager, next"
        :total="addTotal"
        :page.sync="addQuery.page"
        :limit.sync="addQuery.limit"
        style="margin-top: 12px; text-align: right;"
        @current-change="loadAddList"
      />
      <div slot="footer">
        <div class="add-dialog__footer">
          <div class="add-dialog__price-input">
            <span class="add-dialog__price-label">统一特价金额：</span>
            <el-input-number v-model="addSpecialPrice" :min="0" :precision="2" size="small" placeholder="选填" style="width: 150px;" />
            <span class="add-dialog__price-tip">不填则仅标记特价，后续在编辑页逐个设置</span>
          </div>
          <div>
            <el-button @click="addDialogVisible = false">取消</el-button>
            <el-button type="primary" :disabled="addSelectedIds.length === 0" @click="confirmAdd">
              确定添加（{{ addSelectedIds.length }}）
            </el-button>
          </div>
        </div>
      </div>
    </el-dialog>

  </div>
</template>

<script>
import { listGoods, publishGoodsBatch, unpublishGoodsBatch, cancelSpecialPriceBatch, setSpecialPriceBatch, listCatAndBrand } from '@/api/goods'
import Pagination from '@/components/Pagination'

export default {
  name: 'GoodsSpecial',
  components: { Pagination },
  data() {
    return {
      selectedRows: [],
      categoryList: [],
      list: [],
      total: 0,
      listLoading: true,
      listQuery: {
        page: 1,
        limit: 20,
        name: undefined,
        categoryId: undefined,
        isSpecialPrice: true,
        sort: 'add_time',
        order: 'desc'
      },
      // 添加特价对话框
      addDialogVisible: false,
      addLoading: false,
      addList: [],
      addTotal: 0,
      addSelectedIds: [],
      addQuery: {
        page: 1,
        limit: 10,
        name: '',
        categoryId: undefined
      },
      addSpecialPrice: undefined
    }
  },
  created() {
    this.getList()
    this.getCategoryList()
  },
  methods: {
    getCategoryList() {
      listCatAndBrand().then(response => {
        this.categoryList = response.data.data.categoryList
      })
    },
    getList() {
      this.listLoading = true
      listGoods({ ...this.listQuery }).then(response => {
        const res = response.data.data
        this.list = res.list
        this.total = res.total
        this.listLoading = false
      }).catch(() => {
        this.list = []
        this.total = 0
        this.listLoading = false
      })
    },
    handleFilter() {
      this.listQuery.page = 1
      this.getList()
    },
    handleSelectionChange(val) {
      this.selectedRows = val
    },
    statusText(status) {
      const map = { draft: '草稿', pending: '待上架', published: '已上架' }
      return map[status || 'pending'] || '未知'
    },
    handleUpdate(row) {
      this.$router.push({ path: '/goods/edit', query: { id: row.id } })
    },
    handlePublish(row) {
      publishGoodsBatch({ ids: [row.id] }).then(() => {
        this.$notify.success({ title: '成功', message: '上架成功' })
        this.getList()
      }).catch(error => {
        this.$notify.error({ title: '失败', message: error?.response?.data?.errmsg || '上架失败' })
      })
    },
    handleUnpublish(row) {
      unpublishGoodsBatch({ ids: [row.id] }).then(() => {
        this.$notify.success({ title: '成功', message: '下架成功' })
        this.getList()
      }).catch(error => {
        this.$notify.error({ title: '失败', message: error?.response?.data?.errmsg || '下架失败' })
      })
    },
    handleCancelSpecial(row) {
      this.$confirm('确定取消该商品的特价状态？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        cancelSpecialPriceBatch({ ids: [row.id] }).then(() => {
          this.$notify.success({ title: '成功', message: '已取消特价' })
          this.getList()
        }).catch(error => {
          this.$notify.error({ title: '失败', message: error?.response?.data?.errmsg || '操作失败' })
        })
      }).catch(() => {})
    },
    handleBatchPublish() {
      const ids = this.selectedRows.map(r => r.id)
      this.$confirm(`确定上架选中的 ${ids.length} 件商品？`, '批量上架', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }).then(() => {
        publishGoodsBatch({ ids }).then(() => {
          this.$notify.success({ title: '成功', message: '批量上架成功' })
          this.getList()
        }).catch(error => {
          this.$notify.error({ title: '失败', message: error?.response?.data?.errmsg || '批量上架失败' })
        })
      }).catch(() => {})
    },
    handleBatchUnpublish() {
      const ids = this.selectedRows.map(r => r.id)
      this.$confirm(`确定下架选中的 ${ids.length} 件商品？`, '批量下架', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        unpublishGoodsBatch({ ids }).then(() => {
          this.$notify.success({ title: '成功', message: '批量下架成功' })
          this.getList()
        }).catch(error => {
          this.$notify.error({ title: '失败', message: error?.response?.data?.errmsg || '批量下架失败' })
        })
      }).catch(() => {})
    },
    handleBatchCancelSpecial() {
      const ids = this.selectedRows.map(r => r.id)
      this.$confirm(`确定取消选中的 ${ids.length} 件商品的特价状态？商品将从列表中移除。`, '批量取消特价', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        cancelSpecialPriceBatch({ ids }).then(() => {
          this.$notify.success({ title: '成功', message: '批量取消特价成功' })
          this.getList()
        }).catch(error => {
          this.$notify.error({ title: '失败', message: error?.response?.data?.errmsg || '批量取消特价失败' })
        })
      }).catch(() => {})
    },

    // ===== 添加特价商品 =====
    handleOpenAdd() {
      this.addSelectedIds = []
      this.addSpecialPrice = undefined
      this.addQuery = { page: 1, limit: 10, name: '', categoryId: undefined }
      this.addDialogVisible = true
      this.$nextTick(() => {
        this.loadAddList()
      })
    },
    loadAddList() {
      this.addLoading = true
      // 加载非特价商品（isSpecialPrice 不传 = 全部，前端过滤掉已是特价的）
      listGoods({
        page: this.addQuery.page,
        limit: this.addQuery.limit,
        name: this.addQuery.name || undefined,
        categoryId: this.addQuery.categoryId || undefined,
        isSpecialPrice: false,
        sort: 'add_time',
        order: 'desc'
      }).then(res => {
        this.addList = res.data.data.list || []
        this.addTotal = res.data.data.total || 0
        this.addLoading = false
        // 恢复翻页前的勾选状态
        this.$nextTick(() => {
          this.addList.forEach(row => {
            if (this.addSelectedIds.includes(row.id)) {
              this.$refs.addTable.toggleRowSelection(row, true)
            }
          })
        })
      }).catch(() => {
        this.addList = []
        this.addTotal = 0
        this.addLoading = false
      })
    },
    handleAddSelectionChange(selection) {
      const currentPageIds = this.addList.map(item => item.id)
      const selectedPageIds = selection.map(item => item.id)
      // 保留非当前页的选中项 + 当前页实际选中的
      const otherPageSelected = this.addSelectedIds.filter(id => !currentPageIds.includes(id))
      this.addSelectedIds = [...otherPageSelected, ...selectedPageIds]
    },
    confirmAdd() {
      if (this.addSelectedIds.length === 0) return
      const params = { ids: this.addSelectedIds }
      if (this.addSpecialPrice !== undefined && this.addSpecialPrice !== null) {
        params.specialPrice = this.addSpecialPrice
      }
      setSpecialPriceBatch(params).then(() => {
        this.addDialogVisible = false
        this.$notify.success({ title: '成功', message: `已添加 ${this.addSelectedIds.length} 件特价商品` })
        this.getList()
      }).catch(error => {
        this.$notify.error({ title: '失败', message: error?.response?.data?.errmsg || '添加失败' })
      })
    }
  }
}
</script>

<style scoped>
.special-page {
  padding: 20px;
}

/* ===== 搜索栏 ===== */
.search-bar {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.search-bar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.search-bar__filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.search-bar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.filter-input {
  width: 150px;
}
.filter-input--wide {
  width: 200px;
}

/* ===== 批量操作栏 ===== */
.batch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding: 10px 16px;
  background: #fdf6ec;
  border-radius: 6px;
  border: 1px solid #faecd8;
}
.batch-bar__info {
  font-size: 13px;
  color: #606266;
}
.batch-bar__info i {
  color: #e6a23c;
  margin-right: 4px;
}
.batch-bar__info strong {
  color: #e6a23c;
  font-size: 15px;
}
.batch-bar__actions {
  display: flex;
  gap: 6px;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.slide-down-enter,
.slide-down-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.slide-down-enter-to,
.slide-down-leave {
  max-height: 60px;
}

/* ===== 表格通用 ===== */
.goods-name {
  font-weight: 500;
  color: #2c3e50;
  font-size: 13px;
}
.price {
  font-weight: 600;
  color: #2c3e50;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
.discount {
  font-weight: 600;
  color: #e6a23c;
  font-size: 13px;
}

/* ===== 特价标签 ===== */
.badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  line-height: 20px;
}
.badge--special {
  background: #fdf6ec;
  color: #e6a23c;
  border: 1px solid #faecd8;
}

/* ===== 状态指示 ===== */
.status-dot {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 500;
}
.status-dot .dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 6px;
}
.status-dot--pending {
  color: #e6a23c;
}
.status-dot--pending .dot {
  background: #e6a23c;
}
.status-dot--published {
  color: #67c23a;
}
.status-dot--published .dot {
  background: #67c23a;
}

/* ===== 操作按钮 ===== */
.action-btn {
  font-size: 13px !important;
  padding: 0 !important;
}
.action-btn--success {
  color: #67c23a !important;
}
.action-btn--success:hover {
  color: #85ce61 !important;
}
.action-btn--warning {
  color: #e6a23c !important;
}
.action-btn--warning:hover {
  color: #ebb563 !important;
}
.action-btn--danger {
  color: #f56c6c !important;
}
.action-btn--danger:hover {
  color: #f78989 !important;
}

/* ===== 添加对话框 ===== */
.add-dialog__search {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}
.add-dialog__count {
  font-size: 13px;
  color: #e6a23c;
  font-weight: 500;
  white-space: nowrap;
}
.add-dialog__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.add-dialog__price-input {
  display: flex;
  align-items: center;
  gap: 6px;
}
.add-dialog__price-label {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}
.add-dialog__price-tip {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
}

.special-page >>> .el-divider--vertical {
  margin: 0 4px;
  height: 14px;
}
.special-page >>> .pagination-container {
  padding: 16px 0 4px;
  text-align: right;
}
</style>
