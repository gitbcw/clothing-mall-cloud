<template>
  <div>
    <!-- 工具栏 -->
    <div class="filter-container" style="display:flex; justify-content:space-between; align-items:center;">
      <el-button type="primary" @click="handleCreate">新增快递公司</el-button>
    </div>

    <!-- 列表 -->
    <el-table v-loading="loading" :data="list" border>
      <el-table-column prop="sortOrder" label="排序" width="80" />
      <el-table-column prop="code" label="编码" width="120" />
      <el-table-column prop="name" label="名称" />
      <el-table-column label="状态" width="100">
        <template slot-scope="scope">
          <el-tag :type="scope.row.enabled ? 'success' : 'info'">{{ scope.row.enabled ? '启用' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="260">
        <template slot-scope="scope">
          <el-button size="mini" @click="handleEdit(scope.row)">编辑</el-button>
          <el-button size="mini" :type="scope.row.enabled ? 'warning' : 'success'" @click="handleToggle(scope.row)">
            {{ scope.row.enabled ? '禁用' : '启用' }}
          </el-button>
          <el-button size="mini" type="danger" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增/编辑对话框 -->
    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="400px">
      <el-form ref="form" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="编码" prop="code">
          <el-input v-model="form.code" placeholder="如 SF、ZTO" />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="如顺丰速运" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :min="0" :max="999" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { listShipper, createShipper, updateShipper, deleteShipper, toggleShipper } from '@/api/shipper'

export default {
  data() {
    return {
      list: [],
      loading: false,
      dialogVisible: false,
      dialogTitle: '新增快递公司',
      form: { id: null, code: '', name: '', sortOrder: 0 },
      rules: {
        code: [{ required: true, message: '请输入编码', trigger: 'blur' }],
        name: [{ required: true, message: '请输入名称', trigger: 'blur' }]
      }
    }
  },
  created() {
    this.getList()
  },
  methods: {
    getList() {
      this.loading = true
      listShipper().then(res => {
        this.list = res.data.data
        this.loading = false
      })
    },
    handleCreate() {
      this.dialogTitle = '新增快递公司'
      this.form = { id: null, code: '', name: '', sortOrder: this.list.length }
      this.dialogVisible = true
      this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate())
    },
    handleEdit(row) {
      this.dialogTitle = '编辑快递公司'
      this.form = { id: row.id, code: row.code, name: row.name, sortOrder: row.sortOrder }
      this.dialogVisible = true
      this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate())
    },
    submitForm() {
      this.$refs.form.validate(valid => {
        if (!valid) return
        const api = this.form.id ? updateShipper : createShipper
        api(this.form).then(res => {
          this.$message.success(this.form.id ? '修改成功' : '新增成功')
          this.dialogVisible = false
          this.getList()
        })
      })
    },
    handleToggle(row) {
      toggleShipper({ id: row.id, enabled: !row.enabled }).then(res => {
        this.$message.success(row.enabled ? '已禁用' : '已启用')
        this.getList()
      })
    },
    handleDelete(row) {
      this.$confirm('确认删除该快递公司？', '提示', { type: 'warning' }).then(() => {
        deleteShipper({ id: row.id }).then(res => {
          this.$message.success('删除成功')
          this.getList()
        })
      }).catch(() => {})
    }
  }
}
</script>
