<template>
  <div class="app-container goods-list-page">

    <!-- 筛选栏 -->
    <div class="search-bar">
      <div class="search-bar__inner">
        <!-- 搜索条件 -->
        <div class="search-bar__filters">
          <el-input
            v-model="listQuery.name"
            clearable
            size="small"
            prefix-icon="el-icon-search"
            :placeholder="$t('goods_list.placeholder.filter_name')"
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
          <el-switch v-model="listQuery.isSpecialPrice" active-text="仅看特价" @change="handleFilter" />
        </div>
        <!-- 操作按钮 -->
        <div class="search-bar__actions">
          <el-button size="small" type="primary" icon="el-icon-search" @click="handleFilter">{{ $t('app.button.search') }}</el-button>
          <el-button size="small" type="primary" plain icon="el-icon-edit" @click="handleCreate">{{ $t('app.button.create') }}</el-button>
          <el-button size="small" :loading="downloadLoading" icon="el-icon-download" @click="handleDownload">{{ $t('app.button.download') }}</el-button>
        </div>
      </div>
      <!-- 批量操作栏：选中后显示 -->
      <transition name="slide-down">
        <div v-if="batchDeleteArr.length > 0" class="batch-bar">
          <span class="batch-bar__info">
            <i class="el-icon-info" />
            已选择 <strong>{{ batchDeleteArr.length }}</strong> 件商品
          </span>
          <div class="batch-bar__actions">
            <el-button size="mini" type="success" @click="handleBatchPublish">批量上架</el-button>
            <el-button size="mini" type="warning" @click="handleBatchUnpublish">批量下架</el-button>
            <el-button size="mini" type="danger" @click="handleDeleteRows">批量删除</el-button>
          </div>
        </div>
      </transition>
    </div>

    <!-- 状态标签页 -->
    <div class="status-tabs">
      <div
        v-for="tab in statusTabs"
        :key="tab.key"
        :class="['status-tabs__item', { 'is-active': activeTab === tab.key }]"
        @click="activeTab = tab.key; handleTabClick()"
      >
        <span class="status-tabs__label">{{ tab.label }} <span v-if="tab.count > 0" class="status-tabs__count">{{ tab.count }}</span></span>
      </div>
      <div class="status-tabs__extra">
        <el-button size="mini" type="danger" plain @click="handleUnpublishAll">一键下架全部</el-button>
      </div>
    </div>

    <!-- 查询结果 -->
    <el-table
      v-loading="listLoading"
      :data="list"
      :element-loading-text="$t('app.message.list_loading')"
      class="goods-table"
      fit
      highlight-current-row
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="expand">
        <template slot-scope="props">
          <div class="expand-content">
            <div class="expand-grid">
              <div class="expand-field">
                <span class="expand-field__label">{{ $t('goods_list.table.brief') }}</span>
                <span class="expand-field__value">{{ props.row.brief || '-' }}</span>
              </div>
              <div class="expand-field">
                <span class="expand-field__label">{{ $t('goods_list.table.keywords') }}</span>
                <span class="expand-field__value">{{ props.row.keywords || '-' }}</span>
              </div>
            </div>
            <div v-if="props.row.gallery && props.row.gallery.length" class="expand-gallery">
              <span class="expand-field__label">{{ $t('goods_list.table.gallery') }}</span>
              <div class="expand-gallery__list">
                <el-image
                  v-for="pic in props.row.gallery"
                  :key="pic"
                  :src="pic"
                  class="expand-gallery__img"
                  :preview-src-list="props.row.gallery"
                  fit="cover"
                />
              </div>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column type="selection" width="45" align="center" />

      <!-- 隐藏商品ID列 -->
      <!-- <el-table-column align="center" :label="$t('goods_list.table.id')" prop="id" width="70" /> -->

      <el-table-column :label="$t('goods_list.table.name')" prop="name" min-width="160" show-overflow-tooltip>
        <template slot-scope="scope">
          <span class="goods-name">{{ scope.row.name }}</span>
        </template>
      </el-table-column>

      <el-table-column align="center" property="iconUrl" :label="$t('goods_list.table.pic_url')" width="72">
        <template slot-scope="scope">
          <el-image
            v-if="scope.row.picUrl"
            :src="thumbnail(imageUrl(scope.row.picUrl))"
            :preview-src-list="toPreview(scope.row, imageUrl(scope.row.picUrl))"
            class="goods-thumb"
            fit="cover"
          />
          <span v-else class="no-img">-</span>
        </template>
      </el-table-column>

      <el-table-column align="center" property="shareUrl" label="分享海报" width="82">
        <template slot-scope="scope">
          <el-image
            v-if="scope.row.shareUrl"
            :src="scope.row.shareUrl"
            class="goods-thumb goods-thumb--sm"
            :preview-src-list="[scope.row.shareUrl]"
            fit="cover"
          />
          <el-button v-else type="text" size="mini" class="text-btn" @click="handleGenerateShareImage(scope.row)">生成</el-button>
        </template>
      </el-table-column>

      <el-table-column align="center" :label="$t('goods_list.table.detail')" prop="detail" width="72">
        <template slot-scope="scope">
          <el-dialog :visible.sync="detailDialogVisible" :title="$t('goods_list.dialog.detail')" custom-class="detail-dialog" append-to-body>
            <div class="goods-detail-box" v-html="goodsDetail" />
          </el-dialog>
          <el-button type="text" size="mini" class="text-btn" @click="showDetail(scope.row.detail)">{{ $t('app.button.view') }}</el-button>
        </template>
      </el-table-column>

      <el-table-column align="center" :label="$t('goods_list.table.counter_price')" prop="counterPrice" width="90">
        <template slot-scope="scope">
          <span class="price price--muted">¥{{ scope.row.counterPrice }}</span>
        </template>
      </el-table-column>

      <el-table-column align="center" :label="$t('goods_list.table.retail_price')" prop="retailPrice" width="90">
        <template slot-scope="scope">
          <span class="price">¥{{ scope.row.retailPrice }}</span>
        </template>
      </el-table-column>

      <el-table-column align="center" label="特价" prop="isSpecialPrice" width="82">
        <template slot-scope="scope">
          <span v-if="scope.row.isSpecialPrice && scope.row.specialPrice" class="badge badge--special">
            ¥{{ scope.row.specialPrice }}
          </span>
          <span v-else-if="scope.row.isSpecialPrice" class="badge badge--special">特价</span>
          <span v-else class="badge badge--normal">普通</span>
        </template>
      </el-table-column>

      <el-table-column align="center" label="状态" prop="status" width="100">
        <template slot-scope="scope">
          <span :class="['status-dot', 'status-dot--' + (scope.row.status || 'draft')]">
            <i class="dot" />
            {{ statusText(scope.row.status) }}
          </span>
        </template>
      </el-table-column>

      <el-table-column align="center" :label="$t('goods_list.table.actions')" width="220" class-name="small-padding fixed-width">
        <template slot-scope="scope">
          <div class="action-group">
            <el-button v-if="scope.row.status !== 'published'" type="text" size="mini" class="action-btn action-btn--success" @click="handlePublish(scope.row)">上架</el-button>
            <el-button v-if="scope.row.status === 'published'" type="text" size="mini" class="action-btn action-btn--warning" @click="handleUnpublish(scope.row)">下架</el-button>
            <el-divider direction="vertical" />
            <el-button type="text" size="mini" class="action-btn" @click="handleUpdate(scope.row)">{{ $t('app.button.edit') }}</el-button>
            <el-divider direction="vertical" />
            <el-button type="text" size="mini" class="action-btn action-btn--danger" @click="handleDelete(scope.row)">{{ $t('app.button.delete') }}</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total>0" :total="total" :page.sync="listQuery.page" :limit.sync="listQuery.limit" @pagination="getList" />

    <el-tooltip placement="top" :content="$t('app.tooltip.back_to_top')">
      <back-to-top :visibility-height="100" />
    </el-tooltip>

  </div>
</template>

<style scoped>
/* ===== 页面容器 ===== */
.goods-list-page {
  background: #f5f6f8;
  min-height: calc(100vh - 84px);
  padding: 20px 24px;
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
  background: #ecf5ff;
  border-radius: 6px;
  border: 1px solid #d9ecff;
}
.batch-bar__info {
  font-size: 13px;
  color: #606266;
}
.batch-bar__info i {
  color: #409eff;
  margin-right: 4px;
}
.batch-bar__info strong {
  color: #409eff;
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

/* ===== 状态标签页 ===== */
.status-tabs {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 8px;
  padding: 0 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  border-bottom: none;
}
.status-tabs__item {
  padding: 14px 20px;
  font-size: 14px;
  color: #8c94a3;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
  user-select: none;
}
.status-tabs__item:hover {
  color: #5a6178;
}
.status-tabs__count {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  color: #909399;
  background: #f0f2f5;
  border-radius: 10px;
  padding: 1px 7px;
  margin-left: 4px;
  line-height: 16px;
}
.status-tabs__item.is-active .status-tabs__count {
  color: #409eff;
  background: #ecf5ff;
}
.status-tabs__item.is-active {
  color: #2c3e50;
  font-weight: 600;
}
.status-tabs__item.is-active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 20px;
  right: 20px;
  height: 2px;
  background: #409eff;
  border-radius: 1px;
}
.status-tabs__extra {
  margin-left: auto;
}

/* ===== 表格 ===== */
.goods-table {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.goods-table >>> .el-table__header th {
  background: #fafbfc;
  color: #5a6178;
  font-weight: 600;
  font-size: 13px;
  border-bottom: 1px solid #eef0f3;
  padding: 12px 0;
}
.goods-table >>> .el-table__body td {
  border-bottom: 1px solid #f0f2f5;
  padding: 10px 0;
}
.goods-table >>> .el-table__row:hover > td {
  background: #f8f9fc !important;
}
.goods-table >>> .el-table__expanded-cell {
  background: #fafbfc;
  padding: 0 !important;
}

/* ===== 商品缩略图 ===== */
.goods-thumb {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  border: 1px solid #eef0f3;
  vertical-align: middle;
}
.goods-thumb--sm {
  width: 36px;
  height: 36px;
}
.no-img {
  color: #c0c4cc;
  font-size: 14px;
}

/* ===== 商品名称 ===== */
.goods-name {
  font-weight: 500;
  color: #2c3e50;
  font-size: 13px;
}

/* ===== 价格 ===== */
.price {
  font-weight: 600;
  color: #2c3e50;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
.price--muted {
  color: #a0a8b8;
  font-weight: 400;
  text-decoration: line-through;
  font-size: 12px;
}

/* ===== 特价/普通 标签 ===== */
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
.badge--normal {
  background: #f4f4f5;
  color: #909399;
  border: 1px solid #e9e9eb;
}

/* ===== 状态指示 ===== */
.status-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
  flex-shrink: 0;
}
.status-dot--draft {
  color: #909399;
}
.status-dot--draft .dot {
  background: #c0c4cc;
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

/* ===== 操作按钮组 ===== */
.action-group {
  display: inline-flex;
  align-items: center;
}
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
.action-group >>> .el-divider--vertical {
  margin: 0 4px;
  height: 14px;
}

/* ===== 文字按钮 ===== */
.text-btn {
  font-size: 12px !important;
}

/* ===== 展开行 ===== */
.expand-content {
  padding: 16px 24px 16px 48px;
}
.expand-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px 32px;
}
.expand-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.expand-field__label {
  font-size: 12px;
  color: #a0a8b8;
  line-height: 1;
}
.expand-field__value {
  font-size: 13px;
  color: #2c3e50;
  word-break: break-all;
}
.expand-gallery {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #eef0f3;
}
.expand-gallery__list {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.expand-gallery__img {
  width: 56px;
  height: 56px;
  border-radius: 6px;
  border: 1px solid #eef0f3;
  cursor: pointer;
}

/* ===== 详情弹窗 ===== */
.goods-detail-box >>> img {
  max-width: 100%;
  height: auto;
}

/* ===== 分页 ===== */
.goods-list-page >>> .pagination-container {
  padding: 16px 0 4px;
  text-align: right;
}

/* ===== 响应式 ===== */
@media (max-width: 1200px) {
  .expand-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .search-bar__inner {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

<script>
import { listGoods, deleteGoods, generateShareImage, publishGoodsBatch, unpublishGoodsBatch, unpublishAllGoods, listCatAndBrand } from '@/api/goods'
import BackToTop from '@/components/BackToTop'
import Pagination from '@/components/Pagination' // Secondary package based on el-pagination
import { thumbnail, toPreview } from '@/utils/index'

export default {
  name: 'GoodsList',
  components: { BackToTop, Pagination },
  data() {
    return {
      batchDeleteArr: [],
      activeTab: 'all',
      statusTabs: [
        { key: 'all', label: '全部', count: 0 },
        { key: 'draft', label: '草稿', count: 0 },
        { key: 'pending', label: '待上架', count: 0 },
        { key: 'published', label: '已上架', count: 0 }
      ],
      thumbnail,
      toPreview,
      categoryList: [],
      list: [],
      total: 0,
      listLoading: true,
      listQuery: {
        page: 1,
        limit: 10,
        goodsSn: undefined,
        name: undefined,
        categoryId: undefined,
        isSpecialPrice: false,
        sort: 'add_time',
        order: 'desc'
      },
      goodsDetail: '',
      detailDialogVisible: false,
      downloadLoading: false
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
      const query = { ...this.listQuery }
      if (this.activeTab !== 'all') {
        query.status = this.activeTab
      }
      listGoods(query).then(response => {
        const res = response.data.data
        this.list = res.list
        this.total = res.total
        this.listLoading = false

        // 更新 tab 计数
        if (res.allCount !== undefined) {
          this.statusTabs[0].count = res.allCount
          this.statusTabs[1].count = res.draftCount
          this.statusTabs[2].count = res.pendingCount
          this.statusTabs[3].count = res.publishedCount
        }
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
    handleTabClick() {
      this.listQuery.page = 1
      this.getList()
    },
    handleCreate() {
      this.$router.push({ path: '/goods/create' })
    },
    handleUpdate(row) {
      this.$router.push({ path: '/goods/edit', query: { id: row.id }})
    },
    showDetail(detail) {
      this.goodsDetail = detail
      this.detailDialogVisible = true
    },
    handleDelete(row) {
      this.$confirm('确定删除?', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
        center: true
      }).then(() => {
        deleteGoods(row).then(response => {
          this.$notify.success({
            title: '成功',
            message: '删除成功'
          })
          this.getList()
        }).catch(error => {
          this.$notify.error({
            title: '失败',
            message: error?.response?.data?.errmsg || error?.message || '删除失败'
          })
        })
      }).catch(() => {})
    },
    handleSelectionChange(val) {
      this.batchDeleteArr = val
    },
    handleDeleteRows() {
      this.batchDeleteArr.forEach(row => this.handleDeleteEachRow(row))
      this.getList()
    },
    handleDeleteEachRow(row) {
      deleteGoods(row).then(response => {
        this.$notify.success({
          title: '成功',
          message: '删除成功'
        })
      }).catch(error => {
        this.$notify.error({
          title: '失败',
          message: error?.response?.data?.errmsg || error?.message || '删除失败'
        })
      })
    },
    handleGenerateShareImage(row) {
      generateShareImage(row.id).then(response => {
        this.$notify.success({
          title: '成功',
          message: '分享海报生成成功'
        })
        // 更新当前行的分享图URL
        row.shareUrl = response.data.data.shareUrl
      }).catch(error => {
        this.$notify.error({
          title: '失败',
          message: error?.response?.data?.errmsg || error?.message || '生成分享海报失败'
        })
      })
    },
    handleDownload() {
      this.downloadLoading = true
      import('@/vendor/Export2Excel').then(excel => {
        const tHeader = ['商品ID', '商品款号', '名称', '专柜价格', '当前价格', '是否新品', '是否热品', '是否在售', '首页主图', '宣传图片列表', '商品介绍', '详细介绍', '商品图片', '商品单位', '关键字', '类目ID', '品牌商ID']
        const filterVal = ['id', 'goodsSn', 'name', 'counterPrice', 'retailPrice', 'isNew', 'isHot', 'isOnSale', 'listPicUrl', 'gallery', 'brief', 'detail', 'picUrl', 'goodsUnit', 'keywords', 'categoryId', 'brandId']
        excel.export_json_to_excel2(tHeader, this.list, filterVal, '商品信息')
        this.downloadLoading = false
      })
    },
    statusText(status) {
      const map = { draft: '草稿', pending: '待上架', published: '已上架' }
      return map[status || 'draft'] || '未知'
    },
    statusTagType(status) {
      const map = { draft: 'info', pending: 'warning', published: 'success' }
      return map[status || 'draft'] || 'info'
    },
    handlePublish(row) {
      publishGoodsBatch({ ids: [row.id] }).then(() => {
        this.$notify.success({ title: '成功', message: '上架成功' })
        this.getList()
      }).catch(error => {
        this.$notify.error({ title: '失败', message: error?.response?.data?.errmsg || error?.message || '上架失败' })
      })
    },
    handleUnpublish(row) {
      unpublishGoodsBatch({ ids: [row.id] }).then(() => {
        this.$notify.success({ title: '成功', message: '下架成功' })
        this.getList()
      }).catch(error => {
        this.$notify.error({ title: '失败', message: error?.response?.data?.errmsg || error?.message || '下架失败' })
      })
    },
    handleBatchPublish() {
      const ids = this.batchDeleteArr.map(r => r.id)
      publishGoodsBatch({ ids }).then(() => {
        this.$notify.success({ title: '成功', message: '批量上架成功' })
        this.getList()
      }).catch(error => {
        this.$notify.error({ title: '失败', message: error?.response?.data?.errmsg || error?.message || '批量上架失败' })
      })
    },
    handleBatchUnpublish() {
      const ids = this.batchDeleteArr.map(r => r.id)
      unpublishGoodsBatch({ ids }).then(() => {
        this.$notify.success({ title: '成功', message: '批量下架成功' })
        this.getList()
      }).catch(error => {
        this.$notify.error({ title: '失败', message: error?.response?.data?.errmsg || error?.message || '批量下架失败' })
      })
    },
    handleUnpublishAll() {
      this.$confirm('确定要下架全部商品吗？此操作不可撤销。', '危险操作', {
        confirmButtonText: '确认下架全部',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        unpublishAllGoods().then(() => {
          this.$notify.success({ title: '成功', message: '全部商品已下架' })
          this.getList()
        }).catch(error => {
          this.$notify.error({ title: '失败', message: error?.response?.data?.errmsg || error?.message || '下架失败' })
        })
      }).catch(() => {})
    }
  }
}
</script>
