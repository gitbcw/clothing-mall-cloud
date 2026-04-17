<template>
  <div class="app-container">
    <!-- 查询和其他操作 -->
    <div class="filter-container">
      <el-button class="filter-item" type="primary" icon="el-icon-edit" @click="handleCreate">新建分类</el-button>
    </div>

    <!-- 查询结果 -->
    <el-table
      v-loading="listLoading"
      :data="treeData"
      :element-loading-text="$t('app.message.list_loading')"
      border
      fit
      row-key="id"
      :tree-props="{ children: 'children' }"
      default-expand-all
      :row-class-name="rowClassName"
    >
      <el-table-column label="分类名称" prop="name" min-width="120" />
      <el-table-column label="关键词" prop="keywords" min-width="120" />
      <el-table-column label="描述" prop="desc" min-width="150" show-overflow-tooltip />

      <el-table-column label="级别" width="90" align="center">
        <template slot-scope="scope">
          <el-tag :type="scope.row.level === 'L1' ? '' : 'info'" size="mini">
            {{ scope.row.level === 'L1' ? '一级' : '二级' }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="状态" width="80" align="center">
        <template slot-scope="scope">
          <el-switch
            v-model="scope.row.enabled"
            :active-value="1"
            :inactive-value="0"
            @change="handleEnabledChange(scope.row)"
          />
        </template>
      </el-table-column>

      <el-table-column label="尺码" width="80" align="center">
        <template slot-scope="scope">
          <el-switch
            v-if="scope.row.level === 'L1'"
            v-model="scope.row.enableSize"
            :active-value="true"
            :inactive-value="false"
            @change="handleEnableSizeChange(scope.row)"
          />
          <span v-else style="color: #ccc;">-</span>
        </template>
      </el-table-column>

      <el-table-column label="排序" width="160" align="center">
        <template slot-scope="scope">
          <el-input-number
            v-model="scope.row.sortOrder"
            :min="0"
            :max="999"
            size="mini"
            controls-position="right"
            @change="handleSortOrderChange(scope.row)"
          />
        </template>
      </el-table-column>

      <el-table-column align="center" label="操作" width="150" class-name="small-padding fixed-width">
        <template slot-scope="scope">
          <el-button type="primary" size="mini" @click="handleUpdate(scope.row)">编辑</el-button>
          <el-button type="danger" size="mini" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 添加或修改对话框 -->
    <el-dialog :visible.sync="dialogFormVisible" :title="textMap[dialogStatus]" width="500">
      <el-form ref="dataForm" :rules="rules" :model="dataForm" label-position="left" label-width="80px">
        <el-form-item :label="$t('mall_category.form.name')" prop="name">
          <el-input v-model="dataForm.name" placeholder="分类名称" />
        </el-form-item>
        <el-form-item :label="$t('mall_category.form.level')" prop="level">
          <el-select v-model="dataForm.level" style="width:100%" @change="onLevelChange">
            <el-option label="一级分类" value="L1" />
            <el-option label="二级分类" value="L2" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="dataForm.level === 'L2'" :label="$t('mall_category.form.pid')" prop="pid">
          <el-select v-model="dataForm.pid" placeholder="选择父分类" style="width:100%">
            <el-option v-for="item in catL1" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item v-else label="尺码选择">
          <el-switch v-model="dataForm.enableSize" :active-value="true" :inactive-value="false" active-text="启用" inactive-text="关闭" />
        </el-form-item>
        <el-form-item :label="$t('mall_category.form.keywords')">
          <el-input v-model="dataForm.keywords" placeholder="搜索关键词（选填）" />
        </el-form-item>
        <el-form-item :label="$t('mall_category.form.desc')">
          <el-input v-model="dataForm.desc" type="textarea" :rows="2" placeholder="分类描述（选填）" />
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogFormVisible = false">取消</el-button>
        <el-button type="primary" @click="dialogStatus === 'create' ? createData() : updateData()">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { listCategory, listCatL1, createCategory, updateCategory, deleteCategory } from '@/api/category'

export default {
  name: 'Category',
  data() {
    return {
      list: [],
      treeData: [],
      listLoading: true,
      catL1: {},
      dataForm: {
        id: undefined,
        name: '',
        keywords: '',
        level: 'L1',
        pid: 0,
        desc: '',
        enableSize: true
      },
      dialogFormVisible: false,
      dialogStatus: '',
      textMap: {
        update: '编辑分类',
        create: '新建分类'
      },
      rules: {
        name: [{ required: true, message: '类目名不能为空', trigger: 'blur' }]
      }
    }
  },
  created() {
    this.getList()
    this.getCatL1()
  },
  methods: {
    getList() {
      this.listLoading = true
      listCategory()
        .then(response => {
          this.list = response.data.data.list
          this.treeData = this.buildTree(this.list)
          this.listLoading = false
        })
        .catch(() => {
          this.list = []
          this.treeData = []
          this.listLoading = false
        })
    },
    buildTree(list) {
      const l2Map = {}
      list.filter(item => item.level === 'L2').forEach(item => {
        if (!l2Map[item.pid]) l2Map[item.pid] = []
        l2Map[item.pid].push(item)
      })
      return list
        .filter(item => item.level === 'L1')
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(item => ({
          ...item,
          children: (l2Map[item.id] || []).sort((a, b) => a.sortOrder - b.sortOrder)
        }))
    },
    getCatL1() {
      listCatL1().then(response => {
        this.catL1 = response.data.data.list
      })
    },
    resetForm() {
      this.dataForm = {
        id: undefined,
        name: '',
        keywords: '',
        level: 'L1',
        pid: 0,
        desc: '',
        enableSize: true
      }
    },
    onLevelChange(value) {
      if (value === 'L1') {
        this.dataForm.pid = 0
      }
    },
    rowClassName({ row }) {
      return row.level === 'L1' ? 'row-l1' : 'row-l2'
    },
    handleEnableSizeChange(row) {
      updateCategory(row)
        .then(() => {
          this.$notify.success({ title: '成功', message: row.enableSize ? '已启用尺码选择' : '已关闭尺码选择' })
        })
        .catch(() => {
          row.enableSize = !row.enableSize
          this.$notify.error({ title: '失败', message: '更新失败' })
        })
    },
    handleEnabledChange(row) {
      updateCategory(row)
        .then(() => {
          this.$notify.success({ title: '成功', message: row.enabled ? '已启用分类' : '已禁用分类' })
        })
        .catch(() => {
          row.enabled = row.enabled ? 0 : 1
          this.$notify.error({ title: '失败', message: '更新失败' })
        })
    },
    handleSortOrderChange(row) {
      updateCategory(row)
        .then(() => {
          this.$notify.success({ title: '成功', message: '排序已更新' })
        })
        .catch(() => {
          this.$notify.error({ title: '失败', message: '更新失败' })
        })
    },
    handleCreate() {
      this.resetForm()
      this.dialogStatus = 'create'
      this.dialogFormVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    createData() {
      this.$refs['dataForm'].validate(valid => {
        if (valid) {
          createCategory(this.dataForm)
            .then(() => {
              this.getList()
              this.getCatL1()
              this.dialogFormVisible = false
              this.$notify.success({ title: '成功', message: '创建成功' })
            })
            .catch(response => {
              this.$notify.error({ title: '失败', message: response.data.errmsg })
            })
        }
      })
    },
    handleUpdate(row) {
      this.dataForm = Object.assign({}, row)
      this.dialogStatus = 'update'
      this.dialogFormVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    updateData() {
      this.$refs['dataForm'].validate(valid => {
        if (valid) {
          updateCategory(this.dataForm)
            .then(() => {
              this.getList()
              this.getCatL1()
              this.dialogFormVisible = false
              this.$notify.success({ title: '成功', message: '更新成功' })
            })
            .catch(response => {
              this.$notify.error({ title: '失败', message: response.data.errmsg })
            })
        }
      })
    },
    handleDelete(row) {
      this.$confirm(`确定删除分类「${row.name}」吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        deleteCategory(row).then(() => {
          this.getList()
          this.getCatL1()
          this.$notify.success({ title: '成功', message: '删除成功' })
        }).catch(response => {
          this.$notify.error({ title: '失败', message: response.data.errmsg })
        })
      }).catch(() => {})
    }
  }
}
</script>
