<template>
  <div class="app-container">
    <!-- 筛选和其他操作 -->
    <div class="filter-container">
      <el-tabs v-model="activeTab" style="margin-bottom: -12px;" @tab-click="handleTabChange">
        <el-tab-pane label="全部" name="" />
        <el-tab-pane label="活跃组" name="active" />
        <el-tab-pane label="潜水组" name="dormant" />
        <el-tab-pane label="打捞组" name="salvage" />
      </el-tabs>
      <el-input v-model="listQuery.name" clearable class="filter-item" style="width: 200px; margin-left: 10px;" placeholder="请输入分组名称" @keyup.enter.native="handleFilter" />
      <el-button class="filter-item" type="primary" icon="el-icon-search" @click="handleFilter">查找</el-button>
      <el-button class="filter-item" type="primary" icon="el-icon-edit" @click="handleCreate">添加</el-button>
    </div>

    <!-- 查询结果 -->
    <el-table v-loading="listLoading" :data="list" element-loading-text="正在查询中。。。" border fit highlight-current-row>
      <!-- 隐藏分组ID列 -->
      <!-- <el-table-column align="center" label="ID" prop="id" width="80" /> -->
      <el-table-column align="center" label="分组名称" prop="name" />
      <el-table-column align="center" label="类型" prop="type" width="100">
        <template slot-scope="scope">
          <el-tag :type="getTypeTagType(scope.row.type)">
            {{ getTypeName(scope.row.type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column align="center" label="描述" prop="description" min-width="200" />
      <el-table-column align="center" label="成员数" prop="memberCount" width="100" />
      <el-table-column align="center" label="最后更新" prop="lastUpdated" width="160">
        <template slot-scope="scope">
          {{ formatTime(scope.row.lastUpdated) }}
        </template>
      </el-table-column>
      <el-table-column align="center" label="操作" width="150">
        <template slot-scope="scope">
          <el-button type="primary" size="mini" @click="handleUpdate(scope.row)">编辑</el-button>
          <el-button type="danger" size="mini" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total>0" :total="total" :page.sync="listQuery.page" :limit.sync="listQuery.limit" @pagination="getList" />

    <!-- 添加或修改对话框 -->
    <el-dialog :visible.sync="dialogVisible" :title="dialogTitle" width="500">
      <el-form ref="dataForm" :model="dataForm" :rules="rules" label-position="left" label-width="100px">
        <el-form-item label="分组名称" prop="name">
          <el-input v-model="dataForm.name" placeholder="请输入分组名称" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="dataForm.type" placeholder="请选择类型" style="width: 100%;">
            <el-option label="活跃组" value="active" />
            <el-option label="潜水组" value="dormant" />
            <el-option label="打捞组" value="salvage" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="dataForm.description" type="textarea" :rows="3" placeholder="请输入分组描述" />
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmData">确定</el-button>
      </div>
    </el-dialog>

  </div>
</template>

<script>
import { fetchList, fetchDetail, createPushGroup, updatePushGroup, deletePushGroup } from '@/api/pushGroup'
import Pagination from '@/components/Pagination'

export default {
  name: 'PushGroup',
  components: { Pagination },
  data() {
    return {
      list: [],
      total: 0,
      listLoading: true,
      activeTab: '',
      listQuery: {
        page: 1,
        limit: 20,
        name: '',
        type: '',
        sort: 'id',
        order: 'asc'
      },
      dialogVisible: false,
      dialogTitle: '',
      dataForm: {
        id: undefined,
        name: '',
        type: '',
        description: ''
      },
      rules: {
        name: [
          { required: true, message: '分组名称不能为空', trigger: 'blur' },
          { max: 64, message: '分组名称不能超过64个字符', trigger: 'blur' }
        ],
        type: [{ required: true, message: '请选择类型', trigger: 'change' }]
      }
    }
  },
  created() {
    this.getList()
  },
  methods: {
    getList() {
      this.listLoading = true
      fetchList(this.listQuery).then(response => {
        this.list = response.data.data.list || []
        this.total = response.data.data.total || 0
        this.listLoading = false
      }).catch(() => {
        this.listLoading = false
      })
    },
    handleFilter() {
      this.listQuery.page = 1
      this.getList()
    },
    handleTabChange(tab) {
      this.listQuery.type = tab.name
      this.listQuery.page = 1
      this.getList()
    },
    resetForm() {
      this.dataForm = {
        id: undefined,
        name: '',
        type: '',
        description: ''
      }
    },
    handleCreate() {
      this.resetForm()
      this.dialogTitle = '创建推送组'
      this.dialogVisible = true
      this.$nextTick(() => {
        this.$refs.dataForm.clearValidate()
      })
    },
    handleUpdate(row) {
      this.resetForm()
      this.dialogTitle = '编辑推送组'
      fetchDetail(row.id).then(response => {
        const data = response.data.data
        this.dataForm = {
          id: data.id,
          name: data.name,
          type: data.type,
          description: data.description || ''
        }
        this.dialogVisible = true
        this.$nextTick(() => {
          this.$refs.dataForm.clearValidate()
        })
      })
    },
    confirmData() {
      this.$refs.dataForm.validate(valid => {
        if (valid) {
          if (this.dataForm.id) {
            updatePushGroup(this.dataForm).then(() => {
              this.dialogVisible = false
              this.$notify.success('更新成功')
              this.getList()
            })
          } else {
            createPushGroup(this.dataForm).then(() => {
              this.dialogVisible = false
              this.$notify.success('创建成功')
              this.getList()
            })
          }
        }
      })
    },
    handleDelete(row) {
      this.$confirm('此操作将永久删除该推送组, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        deletePushGroup(row.id).then(() => {
          this.$notify.success('删除成功')
          this.getList()
        })
      }).catch(() => {})
    },
    getTypeName(type) {
      const typeMap = {
        active: '活跃组',
        dormant: '潜水组',
        salvage: '打捞组'
      }
      return typeMap[type] || type
    },
    getTypeTagType(type) {
      const tagTypeMap = {
        active: 'success',
        dormant: 'warning',
        salvage: 'danger'
      }
      return tagTypeMap[type] || ''
    },
    formatTime(time) {
      if (!time) return '-'
      return new Date(time).toLocaleString('zh-CN')
    }
  }
}
</script>
