<template>
  <div class="outfit-page">

    <!-- Page Header -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">穿搭推荐</h1>
        <span class="page-subtitle">OUTFIT RECOMMENDATIONS</span>
      </div>
      <div class="header-right">
        <el-input
          v-model="listQuery.title"
          placeholder="搜索穿搭..."
          prefix-icon="el-icon-search"
          clearable
          class="search-input"
          @keyup.enter.native="handleFilter"
          @clear="handleFilter"
        />
        <el-button class="btn-create" @click="handleCreate">
          <i class="el-icon-plus" />
          <span>新建穿搭</span>
        </el-button>
      </div>
    </div>

    <!-- Outfit Cards Grid -->
    <div v-loading="listLoading" element-loading-text="加载中..." class="outfit-grid">
      <div
        v-for="item in list"
        :key="item.id"
        class="outfit-card"
      >
        <!-- Cover Image -->
        <div class="card-image-wrap" @mouseenter="hoveredCard = item.id" @mouseleave="hoveredCard = null">
          <img :src="imageUrl(item.coverPic)" class="card-image">
          <!-- Hover Overlay -->
          <transition name="fade">
            <div v-show="hoveredCard === item.id" class="card-overlay">
              <el-button type="text" class="overlay-btn" @click="handleUpdate(item)">
                <i class="el-icon-edit-outline" /> 编辑
              </el-button>
              <el-button type="text" class="overlay-btn danger" @click="handleDelete(item)">
                <i class="el-icon-delete" /> 删除
              </el-button>
            </div>
          </transition>
          <!-- Status Badge -->
          <span class="card-badge" :class="item.status === 1 ? 'badge-active' : 'badge-inactive'">
            {{ item.status === 1 ? '启用' : '禁用' }}
          </span>
          <!-- Sort Order -->
          <span class="card-sort">{{ item.sortOrder }}</span>
        </div>

        <!-- Card Info -->
        <div class="card-body">
          <h3 class="card-title">{{ item.title }}</h3>
          <div class="card-goods">
            <template v-if="item.goodsList && item.goodsList.length > 0">
              <div class="goods-thumbs">
                <img
                  v-for="goods in item.goodsList.slice(0, 5)"
                  :key="goods.id"
                  :src="imageUrl(goods.picUrl)"
                  class="goods-thumb"
                  :title="goods.name"
                >
                <span v-if="item.goodsList.length > 5" class="goods-more">
                  +{{ item.goodsList.length - 5 }}
                </span>
              </div>
              <span class="goods-count">{{ item.goodsList.length }} 件商品</span>
            </template>
            <span v-else class="no-goods">未关联商品</span>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!listLoading && list.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <rect x="8" y="12" width="48" height="40" rx="4" stroke="#c8bfb5" stroke-width="2" />
            <circle cx="24" cy="30" r="5" stroke="#c8bfb5" stroke-width="2" />
            <path d="M8 44l16-10 10 6 12-8 10 8v6a4 4 0 01-4 4H12a4 4 0 01-4-4v-6z" fill="#e8e2dc" stroke="#c8bfb5" stroke-width="1.5" />
          </svg>
        </div>
        <p class="empty-text">暂无穿搭推荐</p>
        <p class="empty-hint">创建第一个穿搭推荐，展示你的搭配灵感</p>
        <el-button class="btn-create-outline" @click="handleCreate">
          <i class="el-icon-plus" /> 新建穿搭
        </el-button>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="total > 0" class="pagination-wrap">
      <pagination :total="total" :page.sync="listQuery.page" :limit.sync="listQuery.limit" @pagination="getList" />
    </div>

    <!-- Create/Edit Drawer -->
    <el-drawer
      :title="dialogStatus === 'create' ? '新建穿搭推荐' : '编辑穿搭推荐'"
      :visible.sync="dialogFormVisible"
      direction="rtl"
      size="520px"
      :wrapper-closable="false"
      custom-class="outfit-drawer"
    >
      <div class="drawer-body">
        <el-form ref="dataForm" :rules="rules" :model="dataForm" label-position="top" class="outfit-form">
          <el-form-item label="封面图" prop="coverPic">
            <el-upload
              :http-request="cloudUpload"
              :show-file-list="false"
              :on-success="posterUploadSuccess"
              :before-upload="checkFileSize"
              class="cover-uploader"
              accept=".jpg,.jpeg,.png,.gif,.webp"
              drag
            >
              <img v-if="dataForm.coverPic" :src="imageUrl(dataForm.coverPic)" class="cover-preview">
              <div v-else class="cover-placeholder">
                <i class="el-icon-upload2" />
                <span>拖拽或点击上传封面图</span>
                <span class="cover-hint">建议比例 3:4 · 不超过 1MB</span>
              </div>
            </el-upload>
          </el-form-item>

          <el-form-item label="穿搭名称" prop="title">
            <el-input v-model="dataForm.title" placeholder="例：春日通勤优雅穿搭" maxlength="30" show-word-limit />
          </el-form-item>

          <el-form-item label="关联商品" prop="goodsIds">
            <div class="selected-goods-area">
              <transition-group name="goods-tag" tag="div" class="selected-goods-tags">
                <span v-for="goods in selectedGoodsList" :key="goods.id" class="goods-tag">
                  <img :src="imageUrl(goods.picUrl)" class="goods-tag-img">
                  <span class="goods-tag-name">{{ goods.name }}</span>
                  <i class="el-icon-close goods-tag-remove" @click="removeSelectedGoods(goods.id)" />
                </span>
              </transition-group>
              <el-button class="btn-add-goods" @click="openGoodsSelector">
                <i class="el-icon-plus" /> 选择商品
              </el-button>
            </div>
          </el-form-item>

          <div class="form-row">
            <el-form-item label="排序权重" prop="sortOrder" class="form-item-half">
              <el-input-number v-model="dataForm.sortOrder" :min="0" :max="999" controls-position="right" />
            </el-form-item>
            <el-form-item label="启用状态" prop="status" class="form-item-half">
              <el-switch
                v-model="dataForm.status"
                :active-value="1"
                :inactive-value="0"
                active-text="启用"
                inactive-text="禁用"
              />
            </el-form-item>
          </div>
        </el-form>
      </div>

      <div class="drawer-footer">
        <el-button @click="dialogFormVisible = false">取消</el-button>
        <el-button class="btn-submit" @click="dialogStatus === 'create' ? createData() : updateData()">
          {{ dialogStatus === 'create' ? '创建' : '保存修改' }}
        </el-button>
      </div>
    </el-drawer>

    <!-- Goods Selector Dialog -->
    <el-dialog
      title="选择商品"
      :visible.sync="goodsSelectorVisible"
      width="960px"
      append-to-body
      custom-class="goods-selector-dialog"
    >
      <div class="selector-bar">
        <el-input
          v-model="goodsQuery.name"
          clearable
          placeholder="搜索商品名称"
          prefix-icon="el-icon-search"
          class="selector-search"
          @keyup.enter.native="searchGoods"
        />
        <el-cascader
          v-model="goodsQuery.categoryIds"
          :options="categoryList"
          :props="{ checkStrictly: true, value: 'id', label: 'label', children: 'children' }"
          clearable
          placeholder="商品分类"
          class="selector-cascader"
          @change="handleCategoryChange"
        />
        <el-select v-model="goodsQuery.isOnSale" clearable placeholder="上架状态" class="selector-status">
          <el-option label="上架" :value="true" />
          <el-option label="下架" :value="false" />
        </el-select>
        <el-button icon="el-icon-refresh" class="selector-reset" @click="resetGoodsQuery">重置</el-button>
      </div>

      <el-table
        ref="goodsTable"
        v-loading="goodsLoading"
        :data="goodsList"
        border
        max-height="420"
        class="selector-table"
        @selection-change="handleGoodsSelectionChange"
      >
        <el-table-column type="selection" width="45" />
        <el-table-column label="商品" min-width="280">
          <template slot-scope="scope">
            <div class="goods-cell">
              <img :src="imageUrl(scope.row.picUrl)" class="goods-cell-img">
              <div class="goods-cell-info">
                <span class="goods-cell-name">{{ scope.row.name }}</span>
                <span class="goods-cell-price">¥{{ scope.row.retailPrice }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="分类" prop="categoryName" width="120" />
        <el-table-column label="状态" width="80" align="center">
          <template slot-scope="scope">
            <span :class="scope.row.isOnSale ? 'dot-on' : 'dot-off'">
              {{ scope.row.isOnSale ? '上架' : '下架' }}
            </span>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-show="goodsTotal > 0" :total="goodsTotal" :page.sync="goodsQuery.page" :limit.sync="goodsQuery.limit" @pagination="getGoodsList" />

      <div slot="footer" class="selector-footer">
        <span class="selected-count">已选 <strong>{{ tempSelectedGoods.length }}</strong> 件</span>
        <div>
          <el-button @click="goodsSelectorVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmGoodsSelection">确认选择</el-button>
        </div>
      </div>
    </el-dialog>

  </div>
</template>

<script>
import { cloudUpload } from '@/utils/upload'
import { listGoods, listCatAndBrand } from '@/api/goods'
import { listOutfit, createOutfit, updateOutfit, deleteOutfit } from '@/api/outfit'
import Pagination from '@/components/Pagination'

export default {
  name: 'Outfit',
  components: { Pagination },
  data() {
    return {
      cloudUpload,
      list: [],
      total: 0,
      listLoading: true,
      hoveredCard: null,
      listQuery: {
        page: 1,
        limit: 20,
        title: undefined,
        sort: 'sort_order',
        order: 'asc'
      },
      dataForm: {
        id: undefined,
        coverPic: '',
        title: '',
        description: '',
        goodsIds: [],
        tags: '',
        sortOrder: 0,
        status: 1
      },
      dialogFormVisible: false,
      dialogStatus: '',
      rules: {
        title: [{ required: true, message: '穿搭名称不能为空', trigger: 'blur' }],
        coverPic: [{ required: true, message: '封面图不能为空', trigger: 'blur' }],
        goodsIds: [{ required: true, message: '请选择至少一个商品', trigger: 'change', type: 'array', min: 1 }]
      },
      goodsSelectorVisible: false,
      goodsLoading: false,
      goodsList: [],
      goodsTotal: 0,
      goodsQuery: {
        page: 1,
        limit: 10,
        name: undefined,
        categoryId: undefined,
        categoryIds: [],
        isOnSale: undefined
      },
      categoryList: [],
      tempSelectedGoods: [],
      selectedGoodsList: []
    }
  },
  created() {
    this.getList()
    this.getCategoryList()
  },
  methods: {
    getList() {
      this.listLoading = true
      listOutfit(this.listQuery).then(response => {
        const list = response.data.data.list || []
        list.forEach(item => {
          try {
            item.goodsIds = item.goodsIds ? JSON.parse(item.goodsIds) : []
          } catch (e) {
            item.goodsIds = []
          }
        })
        this.list = list
        this.total = response.data.data.total || 0
        this.listLoading = false
      }).catch(() => {
        this.list = []
        this.total = 0
        this.listLoading = false
      })
    },
    getCategoryList() {
      listCatAndBrand().then(response => {
        this.categoryList = response.data.data.categoryList || []
      }).catch(() => {
        this.categoryList = []
      })
    },
    handleFilter() {
      this.listQuery.page = 1
      this.getList()
    },
    resetForm() {
      this.dataForm = {
        id: undefined,
        title: '',
        coverPic: '',
        description: '',
        goodsIds: [],
        tags: '',
        sortOrder: 0,
        status: 1
      }
      this.selectedGoodsList = []
    },
    handleCreate() {
      this.resetForm()
      this.dialogStatus = 'create'
      this.dialogFormVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    posterUploadSuccess(response) {
      this.dataForm.coverPic = response.data.url
    },
    checkFileSize(file) {
      if (file.size > 1048576) {
        this.$message.error('文件大小不能超过 1MB')
        return false
      }
      return true
    },
    createData() {
      this.$refs['dataForm'].validate(valid => {
        if (valid) {
          const submitData = { ...this.dataForm, goodsIds: JSON.stringify(this.dataForm.goodsIds) }
          createOutfit(submitData).then(() => {
            this.dialogFormVisible = false
            this.$notify.success({ title: '成功', message: '添加穿搭推荐成功' })
            this.getList()
          }).catch(response => {
            this.$notify.error({ title: '失败', message: response.data.errmsg || '操作失败' })
          })
        }
      })
    },
    handleUpdate(row) {
      this.dataForm = {
        id: row.id,
        coverPic: row.coverPic,
        title: row.title,
        description: row.description || '',
        goodsIds: row.goodsIds || [],
        sortOrder: row.sortOrder,
        status: row.status
      }
      this.selectedGoodsList = row.goodsList ? [...row.goodsList] : []
      this.dialogStatus = 'update'
      this.dialogFormVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    updateData() {
      this.$refs['dataForm'].validate(valid => {
        if (valid) {
          const submitData = { ...this.dataForm, goodsIds: JSON.stringify(this.dataForm.goodsIds) }
          updateOutfit(submitData).then(() => {
            this.dialogFormVisible = false
            this.$notify.success({ title: '成功', message: '更新穿搭推荐成功' })
            this.getList()
          }).catch(response => {
            this.$notify.error({ title: '失败', message: response.data.errmsg || '操作失败' })
          })
        }
      })
    },
    handleDelete(row) {
      this.$confirm('确定删除该穿搭推荐？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        deleteOutfit({ id: row.id }).then(() => {
          this.$notify.success({ title: '成功', message: '删除成功' })
          this.getList()
        }).catch(response => {
          this.$notify.error({ title: '失败', message: response.data.errmsg || '删除失败' })
        })
      }).catch(() => {})
    },
    // ========== 商品选择器 ==========
    openGoodsSelector() {
      this.goodsSelectorVisible = true
      this.tempSelectedGoods = [...this.selectedGoodsList]
      this.resetGoodsQuery()
      this.getGoodsList()
    },
    getGoodsList() {
      this.goodsLoading = true
      const params = {
        page: this.goodsQuery.page,
        limit: this.goodsQuery.limit,
        name: this.goodsQuery.name,
        categoryId: this.goodsQuery.categoryId,
        isOnSale: this.goodsQuery.isOnSale
      }
      listGoods(params).then(response => {
        this.goodsList = response.data.data.list || []
        this.goodsTotal = response.data.data.total || 0
        this.goodsLoading = false
        this.$nextTick(() => {
          if (this.$refs.goodsTable) {
            this.goodsList.forEach(row => {
              if (this.tempSelectedGoods.some(g => g.id === row.id)) {
                this.$refs.goodsTable.toggleRowSelection(row, true)
              }
            })
          }
        })
      }).catch(() => {
        this.goodsList = []
        this.goodsTotal = 0
        this.goodsLoading = false
      })
    },
    searchGoods() {
      this.goodsQuery.page = 1
      this.getGoodsList()
    },
    resetGoodsQuery() {
      this.goodsQuery = {
        page: 1,
        limit: 10,
        name: undefined,
        categoryId: undefined,
        categoryIds: [],
        isOnSale: undefined
      }
    },
    handleCategoryChange(value) {
      this.goodsQuery.categoryId = value && value.length > 0 ? value[value.length - 1] : undefined
    },
    handleGoodsSelectionChange(selection) {
      const notInCurrentPage = this.tempSelectedGoods.filter(g => !this.goodsList.some(item => item.id === g.id))
      this.tempSelectedGoods = [...notInCurrentPage, ...selection]
    },
    confirmGoodsSelection() {
      this.selectedGoodsList = [...this.tempSelectedGoods]
      this.dataForm.goodsIds = this.selectedGoodsList.map(g => g.id)
      this.goodsSelectorVisible = false
    },
    removeSelectedGoods(id) {
      this.selectedGoodsList = this.selectedGoodsList.filter(g => g.id !== id)
      this.dataForm.goodsIds = this.selectedGoodsList.map(g => g.id)
    }
  }
}
</script>

<style scoped>
/* ========== Design Tokens ========== */
:root {
  --oc-bg: #f7f4f0;
  --oc-card: #ffffff;
  --oc-text: #2c2420;
  --oc-text-secondary: #8a7e74;
  --oc-accent: #b8724e;
  --oc-accent-hover: #9a5f3e;
  --oc-border: #e8e2dc;
  --oc-shadow: rgba(44, 36, 32, 0.08);
}

.outfit-page {
  padding: 28px 32px;
  min-height: calc(100vh - 84px);
  background: var(--oc-bg);
}

/* ========== Page Header ========== */
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--oc-border);
}
.page-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--oc-text);
  margin: 0;
  letter-spacing: 0.5px;
}
.page-subtitle {
  font-size: 11px;
  color: var(--oc-text-secondary);
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-top: 4px;
  display: block;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.search-input {
  width: 220px;
}
.search-input >>> .el-input__inner {
  border-radius: 8px;
  border-color: var(--oc-border);
  background: var(--oc-card);
}
.search-input >>> .el-input__inner:focus {
  border-color: var(--oc-accent);
}
.btn-create {
  background: var(--oc-accent);
  border-color: var(--oc-accent);
  color: #fff;
  border-radius: 8px;
  padding: 9px 20px;
  font-weight: 500;
  transition: all 0.2s;
}
.btn-create:hover {
  background: var(--oc-accent-hover);
  border-color: var(--oc-accent-hover);
}
.btn-create-outline {
  border: 1.5px solid var(--oc-accent);
  color: var(--oc-accent);
  background: transparent;
  border-radius: 8px;
  padding: 9px 24px;
  font-weight: 500;
}
.btn-create-outline:hover {
  background: var(--oc-accent);
  color: #fff;
}

/* ========== Cards Grid ========== */
.outfit-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  min-height: 200px;
}
.outfit-card {
  background: var(--oc-card);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 4px var(--oc-shadow);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.outfit-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(44, 36, 32, 0.12);
}

/* Card Image */
.card-image-wrap {
  position: relative;
  width: 100%;
  padding-top: 120%;
  overflow: hidden;
}
.card-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}
.outfit-card:hover .card-image {
  transform: scale(1.04);
}

/* Hover Overlay */
.card-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(44,36,32,0.6) 0%, rgba(44,36,32,0.85) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  z-index: 2;
}
.overlay-btn {
  color: #fff !important;
  font-size: 14px;
  padding: 8px 16px;
  border-radius: 6px;
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(4px);
  transition: background 0.2s;
}
.overlay-btn:hover {
  background: rgba(255,255,255,0.3) !important;
}
.overlay-btn.danger:hover {
  background: rgba(220,80,80,0.6) !important;
}

/* Status Badge */
.card-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  z-index: 1;
}
.badge-active {
  background: rgba(125, 184, 138, 0.9);
  color: #fff;
}
.badge-inactive {
  background: rgba(0,0,0,0.5);
  color: #ddd;
}

/* Sort Order */
.card-sort {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(0,0,0,0.45);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

/* Card Body */
.card-body {
  padding: 16px;
}
.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--oc-text);
  margin: 0 0 10px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-goods {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.goods-thumbs {
  display: flex;
  align-items: center;
}
.goods-thumb {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  object-fit: cover;
  border: 2px solid var(--oc-card);
  margin-left: -6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.goods-thumb:first-child {
  margin-left: 0;
}
.goods-more {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: var(--oc-border);
  color: var(--oc-text-secondary);
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: -6px;
  border: 2px solid var(--oc-card);
}
.goods-count {
  font-size: 12px;
  color: var(--oc-text-secondary);
}
.no-goods {
  font-size: 12px;
  color: #c8bfb5;
  font-style: italic;
}

/* ========== Empty State ========== */
.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64px 0;
}
.empty-text {
  font-size: 16px;
  font-weight: 500;
  color: var(--oc-text);
  margin: 20px 0 4px;
}
.empty-hint {
  font-size: 13px;
  color: var(--oc-text-secondary);
  margin: 0 0 24px;
}

/* ========== Pagination ========== */
.pagination-wrap {
  display: flex;
  justify-content: center;
  padding: 32px 0 8px;
}

/* ========== Transitions ========== */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}
.goods-tag-enter-active,
.goods-tag-leave-active {
  transition: all 0.2s ease;
}
.goods-tag-enter,
.goods-tag-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>

<!-- Unscoped: Drawer & Dialog overrides (scoped can't reach child components) -->
<style>
/* ========== Drawer ========== */
.outfit-drawer .el-drawer__header {
  padding: 20px 24px 16px;
  margin-bottom: 0;
  border-bottom: 1px solid #e8e2dc;
  font-size: 16px;
  font-weight: 600;
  color: #2c2420;
}
.outfit-drawer .el-drawer__body {
  display: flex;
  flex-direction: column;
  height: calc(100% - 61px);
}
.outfit-drawer .drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}
.outfit-drawer .drawer-footer {
  padding: 16px 24px;
  border-top: 1px solid #e8e2dc;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.outfit-drawer .btn-submit {
  background: #b8724e;
  border-color: #b8724e;
  color: #fff;
  border-radius: 8px;
  padding: 9px 28px;
  font-weight: 500;
}
.outfit-drawer .btn-submit:hover {
  background: #9a5f3e;
  border-color: #9a5f3e;
}

/* Form */
.outfit-form .el-form-item__label {
  color: #2c2420;
  font-weight: 500;
  font-size: 13px;
  padding-bottom: 4px;
}
.outfit-form .el-input__inner,
.outfit-form .el-textarea__inner {
  border-radius: 8px;
  border-color: #e8e2dc;
}
.outfit-form .el-input__inner:focus {
  border-color: #b8724e;
}
.form-row {
  display: flex;
  gap: 24px;
}
.form-item-half {
  flex: 1;
}

/* Cover Uploader */
.cover-uploader .el-upload-dragger {
  width: 100%;
  height: 200px;
  border-radius: 10px;
  border: 2px dashed #ddd5cc;
  background: #faf8f5;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s;
}
.cover-uploader .el-upload-dragger:hover {
  border-color: #b8724e;
}
.cover-preview {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 10px;
  display: block;
}
.cover-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #a09890;
}
.cover-placeholder i {
  font-size: 32px;
  margin-bottom: 8px;
  color: #c8bfb5;
}
.cover-placeholder span {
  font-size: 13px;
}
.cover-hint {
  font-size: 11px !important;
  color: #c8bfb5 !important;
  margin-top: 6px;
}

/* Selected Goods */
.selected-goods-area {
  width: 100%;
}
.selected-goods-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
  min-height: 32px;
}
.goods-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 4px;
  background: #f7f4f0;
  border: 1px solid #e8e2dc;
  border-radius: 20px;
  font-size: 12px;
  color: #2c2420;
  transition: all 0.2s;
}
.goods-tag:hover {
  border-color: #b8724e;
}
.goods-tag-img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}
.goods-tag-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.goods-tag-remove {
  cursor: pointer;
  color: #bbb;
  font-size: 12px;
  margin-left: 2px;
  transition: color 0.15s;
}
.goods-tag-remove:hover {
  color: #c75c5c;
}
.btn-add-goods {
  border: 1.5px dashed #c8bfb5;
  color: #8a7e74;
  border-radius: 8px;
  width: 100%;
}
.btn-add-goods:hover {
  border-color: #b8724e;
  color: #b8724e;
}

/* ========== Goods Selector Dialog ========== */
.goods-selector-dialog .el-dialog__header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid #e8e2dc;
}
.goods-selector-dialog .el-dialog__body {
  padding: 20px 24px;
}
.selector-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}
.selector-search {
  width: 200px;
}
.selector-cascader {
  width: 180px;
}
.selector-status {
  width: 120px;
}
.selector-table {
  border-radius: 8px;
  overflow: hidden;
}
.goods-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.goods-cell-img {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}
.goods-cell-info {
  display: flex;
  flex-direction: column;
}
.goods-cell-name {
  font-size: 13px;
  color: #2c2420;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.goods-cell-price {
  font-size: 12px;
  color: #b8724e;
  font-weight: 600;
  margin-top: 2px;
}
.dot-on {
  color: #5da86b;
  font-weight: 500;
}
.dot-off {
  color: #bbb;
}
.selector-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.selected-count {
  font-size: 13px;
  color: #8a7e74;
}
.selected-count strong {
  color: #b8724e;
}
</style>
