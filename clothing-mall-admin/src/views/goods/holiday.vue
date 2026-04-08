<template>
  <div class="app-container holiday-page">
    <!-- 筛选标签 + 添加按钮 -->
    <div class="holiday-toolbar">
      <div class="toolbar-left">
        <el-radio-group v-model="statusFilter" size="small" @change="handleFilterChange">
          <el-radio-button label="all">全部</el-radio-button>
          <el-radio-button label="active">进行中</el-radio-button>
          <el-radio-button label="upcoming">未开始</el-radio-button>
          <el-radio-button label="ended">已结束</el-radio-button>
          <el-radio-button label="disabled">已禁用</el-radio-button>
        </el-radio-group>
        <span class="toolbar-count">共 {{ filteredList.length }} 个节日</span>
      </div>
      <el-button class="filter-item" type="primary" icon="el-icon-edit" @click="handleCreate">添加节日</el-button>
    </div>

    <!-- 查询结果 -->
    <el-table v-loading="listLoading" :data="filteredList" element-loading-text="正在查询中。。。" border fit highlight-current-row class="holiday-table">
      <!-- 隐藏节日ID列 -->
      <!-- <el-table-column align="center" label="ID" prop="id" width="70" /> -->
      <el-table-column align="center" label="节日名称" prop="name" min-width="140">
        <template slot-scope="scope">
          <span class="holiday-name">{{ scope.row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column align="center" label="活动日期" min-width="200">
        <template slot-scope="scope">
          <span class="date-range">{{ scope.row.startDate }} ~ {{ scope.row.endDate }}</span>
        </template>
      </el-table-column>
      <el-table-column align="center" label="排序" prop="sortOrder" width="70" />
      <el-table-column align="center" label="状态" width="100">
        <template slot-scope="scope">
          <span :class="['status-dot', 'status-' + computeStatus(scope.row)]" />
          <span :class="['status-text', 'status-text-' + computeStatus(scope.row)]">{{ statusLabel(scope.row) }}</span>
        </template>
      </el-table-column>
      <el-table-column align="center" label="操作" width="280" class-name="small-padding fixed-width">
        <template slot-scope="scope">
          <el-button type="info" size="mini" plain @click="handleGoods(scope.row)">关联商品</el-button>
          <el-button type="primary" size="mini" plain @click="handleUpdate(scope.row)">编辑</el-button>
          <el-button
            :type="scope.row.enabled ? 'warning' : 'success'"
            size="mini"
            plain
            @click="handleEnable(scope.row)"
          >
            {{ scope.row.enabled ? '禁用' : '启用' }}
          </el-button>
          <el-button type="danger" size="mini" plain @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 添加或修改对话框 -->
    <el-dialog :visible.sync="dialogVisible" :title="dialogTitle" width="500" custom-class="holiday-dialog">
      <el-form ref="dataForm" :model="dataForm" :rules="rules" label-position="left" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="dataForm.name" placeholder="请输入节日名称" />
        </el-form-item>
        <el-form-item label="日期范围" prop="dateRange">
          <el-date-picker
            v-model="dataForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="yyyy-MM-dd"
            style="width: 100%;"
          />
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="dataForm.sortOrder" :min="0" />
        </el-form-item>
        <el-form-item label="状态" prop="enabled">
          <el-switch v-model="dataForm.enabled" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmData">确定</el-button>
      </div>
    </el-dialog>

    <!-- 关联商品对话框 -->
    <el-dialog :visible.sync="goodsDialogVisible" title="关联商品" width="700" custom-class="holiday-dialog">
      <div class="goods-search-bar">
        <el-input v-model="goodsSearchName" placeholder="搜索商品名称" style="width: 220px;" clearable prefix-icon="el-icon-search" @keyup.enter.native="loadGoodsList" />
        <el-button type="primary" size="small" @click="loadGoodsList">搜索</el-button>
      </div>
      <el-table v-loading="goodsLoading" :data="goodsList" border max-height="400" @selection-change="handleGoodsSelectionChange">
        <el-table-column type="selection" width="55" :reserve-selection="true" />
        <!-- 隐藏商品ID列 -->
        <!-- <el-table-column align="center" label="ID" prop="id" width="80" /> -->
        <el-table-column align="center" label="商品图" width="80">
          <template slot-scope="scope">
            <el-image v-if="scope.row.picUrl" :src="imageUrl(scope.row.picUrl)" style="width: 40px; height: 40px;" fit="cover" />
          </template>
        </el-table-column>
        <el-table-column align="center" label="商品名称" prop="name" />
        <el-table-column align="center" label="一口价" prop="retailPrice" width="100" />
      </el-table>
      <el-pagination
        layout="total, prev, pager, next"
        :total="goodsTotal"
        :page.sync="goodsPage"
        :limit.sync="goodsLimit"
        style="margin-top: 15px; text-align: right;"
        @current-change="loadGoodsList"
      />
      <div slot="footer">
        <el-button @click="goodsDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmHolidayGoods">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { listHoliday, createHoliday, updateHoliday, deleteHoliday, enableHoliday, listHolidayGoods, updateHolidayGoods } from '@/api/holiday'
import { listGoods } from '@/api/goods'

export default {
  name: 'Holiday',
  data() {
    return {
      list: [],
      listLoading: true,
      statusFilter: 'all',
      dialogVisible: false,
      dialogStatus: '',
      dialogTitle: '',
      dataForm: {
        id: undefined,
        name: '',
        startDate: '',
        endDate: '',
        dateRange: null,
        sortOrder: 0,
        enabled: true
      },
      rules: {
        name: [{ required: true, message: '节日名称不能为空', trigger: 'blur' }],
        dateRange: [{ required: true, message: '请选择日期范围', trigger: 'change' }]
      },
      goodsDialogVisible: false,
      currentHolidayId: null,
      goodsList: [],
      selectedGoodsIds: [],
      goodsSearchName: '',
      goodsTotal: 0,
      goodsPage: 1,
      goodsLimit: 10,
      goodsLoading: false
    }
  },
  computed: {
    filteredList() {
      if (this.statusFilter === 'all') {
        return this.list
      }
      return this.list.filter(item => this.computeStatus(item) === this.statusFilter)
    }
  },
  created() {
    this.getList()
  },
  methods: {
    computeStatus(row) {
      if (!row.enabled) {
        return 'disabled'
      }
      const today = new Date()
      const todayStr = today.getFullYear() + '-' +
        String(today.getMonth() + 1).padStart(2, '0') + '-' +
        String(today.getDate()).padStart(2, '0')
      if (row.startDate > todayStr) {
        return 'upcoming'
      }
      if (row.endDate < todayStr) {
        return 'ended'
      }
      return 'active'
    },
    statusLabel(row) {
      const map = {
        active: '进行中',
        upcoming: '未开始',
        ended: '已结束',
        disabled: '已禁用'
      }
      return map[this.computeStatus(row)] || '未知'
    },
    statusTagType(row) {
      const map = {
        active: 'success',
        upcoming: 'warning',
        ended: 'info',
        disabled: 'info'
      }
      return map[this.computeStatus(row)] || 'info'
    },
    handleFilterChange() {
      // filteredList is computed, UI updates automatically
    },
    getList() {
      this.listLoading = true
      listHoliday().then(response => {
        this.list = response.data.data.list
        this.listLoading = false
      }).catch(() => {
        this.list = []
        this.listLoading = false
      })
    },
    resetForm() {
      this.dataForm = {
        id: undefined,
        name: '',
        startDate: '',
        endDate: '',
        dateRange: null,
        sortOrder: 0,
        enabled: true
      }
    },
    handleCreate() {
      this.resetForm()
      this.dialogStatus = 'create'
      this.dialogTitle = '添加节日'
      this.dialogVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    handleUpdate(row) {
      this.dataForm = Object.assign({}, row)
      if (row.startDate && row.endDate) {
        this.dataForm.dateRange = [row.startDate, row.endDate]
      } else {
        this.dataForm.dateRange = null
      }
      this.dialogStatus = 'update'
      this.dialogTitle = '编辑节日'
      this.dialogVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    confirmData() {
      this.$refs['dataForm'].validate((valid) => {
        if (valid) {
          // Extract dateRange into startDate/endDate
          const submitData = Object.assign({}, this.dataForm)
          if (submitData.dateRange && submitData.dateRange.length === 2) {
            submitData.startDate = submitData.dateRange[0]
            submitData.endDate = submitData.dateRange[1]
          }
          delete submitData.dateRange

          if (this.dialogStatus === 'create') {
            createHoliday(submitData).then(response => {
              this.dialogVisible = false
              this.$notify.success({
                title: '成功',
                message: '添加节日成功'
              })
              this.getList()
            }).catch(response => {
              this.$notify.error({
                title: '失败',
                message: response.data.errmsg
              })
            })
          } else {
            updateHoliday(submitData).then(response => {
              this.dialogVisible = false
              this.$notify.success({
                title: '成功',
                message: '更新节日成功'
              })
              this.getList()
            }).catch(response => {
              this.$notify.error({
                title: '失败',
                message: response.data.errmsg
              })
            })
          }
        }
      })
    },
    handleEnable(row) {
      const newEnabled = !row.enabled
      const action = newEnabled ? '启用' : '禁用'
      this.$confirm(`确定要${action}该节日吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        enableHoliday({ id: row.id, enabled: newEnabled }).then(response => {
          this.$notify.success({
            title: '成功',
            message: `${action}成功`
          })
          this.getList()
        }).catch(response => {
          this.$notify.error({
            title: '失败',
            message: response.data.errmsg
          })
        })
      }).catch(() => {})
    },
    handleDelete(row) {
      this.$confirm('确定要删除该节日吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        deleteHoliday({ id: row.id }).then(response => {
          this.$notify.success({
            title: '成功',
            message: '删除节日成功'
          })
          this.getList()
        }).catch(response => {
          this.$notify.error({
            title: '失败',
            message: response.data.errmsg
          })
        })
      }).catch(() => {})
    },
    handleGoods(row) {
      this.currentHolidayId = row.id
      this.selectedGoodsIds = []
      this.goodsSearchName = ''
      this.goodsPage = 1
      this.goodsDialogVisible = true
      // Load existing associations
      listHolidayGoods(row.id).then(res => {
        this.selectedGoodsIds = res.data.data || []
        this.$nextTick(() => {
          this.loadGoodsList()
        })
      })
    },
    loadGoodsList() {
      this.goodsLoading = true
      listGoods({ name: this.goodsSearchName, page: this.goodsPage, limit: this.goodsLimit, status: 'published' }).then(res => {
        this.goodsList = res.data.data.list || []
        this.goodsTotal = res.data.data.total || 0
        this.goodsLoading = false
      }).catch(() => {
        this.goodsList = []
        this.goodsTotal = 0
        this.goodsLoading = false
      })
    },
    handleGoodsSelectionChange(selection) {
      this.selectedGoodsIds = selection.map(item => item.id)
    },
    confirmHolidayGoods() {
      updateHolidayGoods({ holidayId: this.currentHolidayId, goodsIds: this.selectedGoodsIds }).then(() => {
        this.goodsDialogVisible = false
        this.$notify.success({ title: '成功', message: '关联商品成功' })
      }).catch(res => {
        this.$notify.error({ title: '失败', message: res.data.errmsg || '关联失败' })
      })
    }
  }
}
</script>

<style>
/* ============================
   节日管理页 — 温暖节日感 + 干净管理效率
   ============================ */

.holiday-page {
  padding: 20px;
}

/* ---------- 工具栏 ---------- */
.holiday-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
  padding: 14px 18px;
  background: linear-gradient(135deg, #fff8f0 0%, #fff3e8 100%);
  border-radius: 8px;
  border: 1px solid #f5e6d3;
}

.holiday-toolbar .toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.toolbar-count {
  font-size: 13px;
  color: #a0886a;
  white-space: nowrap;
}

/* ---------- 表格 ---------- */
.holiday-table .holiday-name {
  font-weight: 600;
  color: #5a3e2b;
}

.holiday-table .date-range {
  font-size: 13px;
  color: #8c7a6b;
  letter-spacing: 0.3px;
}

/* ---------- 状态指示 ---------- */
.status-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-right: 5px;
  vertical-align: middle;
}
.status-dot.status-active   { background: #13ce66; box-shadow: 0 0 4px rgba(19,206,102,.4); }
.status-dot.status-upcoming { background: #ffba00; box-shadow: 0 0 4px rgba(255,186,0,.35); }
.status-dot.status-ended    { background: #c0c4cc; }
.status-dot.status-disabled { background: #909399; }

.status-text {
  font-size: 12px;
  vertical-align: middle;
}
.status-text-active   { color: #13ce66; }
.status-text-upcoming { color: #e6a23c; }
.status-text-ended    { color: #909399; }
.status-text-disabled { color: #606266; }

/* ---------- 对话框 ---------- */
.holiday-dialog .el-dialog__header {
  background: linear-gradient(135deg, #fff5ec 0%, #ffe9d6 100%);
  border-bottom: 1px solid #f0d9c4;
  padding: 16px 20px;
}
.holiday-dialog .el-dialog__title {
  font-weight: 600;
  color: #5a3e2b;
  font-size: 16px;
}
.holiday-dialog .el-dialog__body {
  padding: 20px 24px;
}
.holiday-dialog .el-dialog__footer {
  padding: 12px 20px 16px;
  border-top: 1px solid #f0e8e0;
}

/* ---------- 关联商品搜索栏 ---------- */
.goods-search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}
</style>
