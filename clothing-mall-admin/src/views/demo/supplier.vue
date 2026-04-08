<template>
  <div class="app-container">

    <!-- 查询和其他操作 -->
    <div class="filter-container">
      <el-input v-model="listQuery.name" clearable class="filter-item" style="width: 150px;" placeholder="供应商名称" />
      <el-select v-model="listQuery.type" clearable class="filter-item" style="width: 120px" placeholder="类型">
        <el-option v-for="item in typeOptions" :key="item" :label="item" :value="item" />
      </el-select>
      <el-select v-model="listQuery.status" clearable class="filter-item" style="width: 100px" placeholder="状态">
        <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-select v-model="listQuery.settlement" clearable class="filter-item" style="width: 120px" placeholder="结算方式">
        <el-option v-for="item in settlementOptions" :key="item" :label="item" :value="item" />
      </el-select>
      <el-button class="filter-item" type="primary" icon="el-icon-search" @click="handleFilter">查找</el-button>
      <el-button class="filter-item" type="primary" icon="el-icon-edit" @click="handleCreate">添加</el-button>
      <el-button :loading="downloadLoading" class="filter-item" type="primary" icon="el-icon-download" @click="handleDownload">导出</el-button>
    </div>

    <!-- 查询结果 -->
    <el-table v-loading="listLoading" :data="list" element-loading-text="正在加载..." border fit highlight-current-row>

      <!-- 隐藏供应商ID列 -->
      <!-- <el-table-column align="center" label="ID" prop="id" width="80" /> -->

      <el-table-column align="center" label="供应商名称" prop="name" min-width="150" />

      <el-table-column align="center" label="类型" prop="type" width="100">
        <template slot-scope="scope">
          <el-tag type="warning" size="mini">{{ scope.row.type }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column align="center" label="状态" prop="status" width="80">
        <template slot-scope="scope">
          <el-tag :type="scope.row.status | statusFilter" size="mini">{{ scope.row.status | statusLabel }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column align="center" label="等级" prop="level" width="100">
        <template slot-scope="scope">
          <el-tag effect="plain" size="mini">{{ scope.row.level }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column align="center" label="供应商品数" width="120">
        <template slot-scope="scope">
          <el-button type="text" style="text-decoration: underline;" @click="handleProductList(scope.row)">
            {{ scope.row.products.length }} 款
          </el-button>
        </template>
      </el-table-column>

      <el-table-column align="center" label="结算方式" prop="settlement" width="120">
        <template slot-scope="scope">
          <el-tag type="info">{{ scope.row.settlement }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column align="center" label="联系人" prop="contact" width="100" />

      <el-table-column align="center" label="联系电话" prop="phone" width="120" />

      <el-table-column align="center" label="操作" width="250" class-name="small-padding fixed-width">
        <template slot-scope="scope">
          <el-button type="primary" size="mini" @click="handleDetail(scope.row)">详情</el-button>
          <el-button type="primary" size="mini" @click="handleUpdate(scope.row)">编辑</el-button>
          <el-button type="danger" size="mini" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total>0" :total="total" :page.sync="listQuery.page" :limit.sync="listQuery.limit" @pagination="getList" />

    <!-- 编辑/添加弹窗 -->
    <el-dialog :title="textMap[dialogStatus]" :visible.sync="dialogFormVisible" width="60%">
      <el-form ref="dataForm" :rules="rules" :model="dataForm" label-position="left" label-width="100px" style="margin-left:20px; margin-right:20px;">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="供应商名称" prop="name">
              <el-input v-model="dataForm.name" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="类型" prop="type">
              <el-select v-model="dataForm.type" placeholder="请选择" style="width: 100%;">
                <el-option v-for="item in typeOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="dataForm.status">
                <el-radio :label="1">启用</el-radio>
                <el-radio :label="0">禁用</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="等级" prop="level">
              <el-select v-model="dataForm.level" placeholder="请选择" style="width: 100%;">
                <el-option v-for="item in levelOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="结算方式" prop="settlement">
              <el-select v-model="dataForm.settlement" placeholder="请选择" style="width: 100%;">
                <el-option v-for="item in settlementOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="营业执照" prop="license">
              <el-input v-model="dataForm.license" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="联系人" prop="contact">
              <el-input v-model="dataForm.contact" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="联系电话" prop="phone">
              <el-input v-model="dataForm.phone" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="dataForm.email" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="供应商介绍" prop="desc">
          <el-input v-model="dataForm.desc" type="textarea" :rows="3" />
        </el-form-item>

        <el-divider content-position="left">供应商品列表</el-divider>

        <el-button type="primary" size="mini" style="margin-bottom: 10px;" @click="handleAddProduct">添加商品</el-button>
        <el-table :data="dataForm.products" border style="width: 100%">
          <el-table-column prop="name" label="商品名称">
            <template slot-scope="scope">
              <el-input v-model="scope.row.name" size="mini" placeholder="商品名称" />
            </template>
          </el-table-column>
          <el-table-column prop="price" label="协议价" width="120">
            <template slot-scope="scope">
              <el-input v-model="scope.row.price" size="mini" type="number" placeholder="价格" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80" align="center">
            <template slot-scope="scope">
              <el-button type="text" style="color: #f56c6c;" @click="handleRemoveProduct(scope.$index)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogFormVisible = false">取消</el-button>
        <el-button type="primary" @click="dialogStatus==='create'?createData():updateData()">确定</el-button>
      </div>
    </el-dialog>

    <!-- 详情弹窗 -->
    <el-dialog title="供应商详情" :visible.sync="detailDialogVisible" width="60%">
      <el-form label-position="left" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="供应商名称">
              <span>{{ currentDetail.name }}</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="类型">
              <el-tag type="warning" size="small">{{ currentDetail.type }}</el-tag>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="状态">
              <el-tag :type="currentDetail.status | statusFilter" size="small">{{ currentDetail.status | statusLabel }}</el-tag>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="等级">
              <el-tag effect="plain" size="small">{{ currentDetail.level }}</el-tag>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="结算方式">
              <el-tag type="info">{{ currentDetail.settlement }}</el-tag>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="营业执照">
              <span>{{ currentDetail.license }}</span>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="联系人">
              <span>{{ currentDetail.contact }}</span>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="联系电话">
              <span>{{ currentDetail.phone }}</span>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="邮箱">
              <span>{{ currentDetail.email }}</span>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="供应商介绍">
          <span>{{ currentDetail.desc }}</span>
        </el-form-item>

        <el-divider content-position="left">供应商品 ({{ currentDetail.products ? currentDetail.products.length : 0 }} 款)</el-divider>

        <el-table :data="currentDetail.products" border stripe style="width: 100%">
          <el-table-column label="商品图片" width="100" align="center">
            <template slot-scope="scope">
              <el-image :src="scope.row.image" style="width: 50px; height: 50px" :preview-src-list="[scope.row.image]" />
            </template>
          </el-table-column>
          <el-table-column prop="name" label="商品名称" />
          <el-table-column prop="price" label="协议价" width="120">
            <template slot-scope="scope">
              ¥{{ scope.row.price }}
            </template>
          </el-table-column>
        </el-table>

      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </div>
    </el-dialog>

    <!-- 商品列表管理弹窗 -->
    <el-dialog :title="(currentProductListSupplier.name || '') + ' - 商品列表'" :visible.sync="productListDialogVisible" width="70%">
      <div style="margin-bottom: 10px;">
        <el-button type="primary" size="mini" icon="el-icon-plus" @click="handleAddProductInDialog">添加商品</el-button>
      </div>
      <el-table :data="currentProductListSupplier.products" border stripe style="width: 100%">
        <el-table-column label="商品图片" width="100" align="center">
          <template slot-scope="scope">
            <el-image :src="scope.row.image" style="width: 50px; height: 50px" :preview-src-list="[scope.row.image]" />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="商品名称" />
        <el-table-column prop="price" label="协议价" width="120">
          <template slot-scope="scope">
            ¥{{ scope.row.price }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center">
          <template slot-scope="scope">
            <el-button type="primary" size="mini" @click="handleEditProductInDialog(scope.row, scope.$index)">编辑</el-button>
            <el-button type="danger" size="mini" @click="handleDeleteProductInDialog(scope.$index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div slot="footer" class="dialog-footer">
        <el-button @click="productListDialogVisible = false">关闭</el-button>
      </div>
    </el-dialog>

    <!-- 单个商品编辑/添加弹窗 -->
    <el-dialog :title="productFormStatus === 'create' ? '添加商品' : '编辑商品'" :visible.sync="productFormDialogVisible" width="500px" append-to-body>
      <el-form ref="productForm" :model="currentProductForm" :rules="productRules" label-position="left" label-width="100px" style="margin: 0 20px;">
        <el-form-item label="商品名称" prop="name">
          <el-input v-model="currentProductForm.name" placeholder="请输入商品名称" />
        </el-form-item>
        <el-form-item label="协议价" prop="price">
          <el-input v-model="currentProductForm.price" type="number" placeholder="请输入价格">
            <template slot="prepend">¥</template>
          </el-input>
        </el-form-item>
        <el-form-item label="图片URL" prop="image">
          <el-input v-model="currentProductForm.image" type="textarea" :rows="2" placeholder="请输入图片链接" />
        </el-form-item>
        <el-form-item label="预览">
          <el-image v-if="currentProductForm.image" :src="currentProductForm.image" style="width: 80px; height: 80px; border: 1px solid #ddd;">
            <div slot="error" class="image-slot">
              <i class="el-icon-picture-outline" />
            </div>
          </el-image>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="productFormDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveProductForm">确定</el-button>
      </div>
    </el-dialog>
  </div></template>

<script>
import Pagination from '@/components/Pagination'

// Mock Data Generator
const generateMockData = (count) => {
  const data = []
  const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京']
  const industries = ['电子科技', '日用品', '食品饮料', '家居制造', '服饰纺织']
  const suffixes = ['有限公司', '责任公司', '工厂', '商贸行']
  const types = ['生产厂家', '一级代理', '经销商', '个人商户']
  const levels = ['战略合作', '核心供应商', '普通供应商', '临时供应商']

  const productTypes = [
    { name: '智能蓝牙耳机', price: 150 },
    { name: '纯棉T恤', price: 35 },
    { name: '不锈钢保温杯', price: 45 },
    { name: '有机大米5kg', price: 60 },
    { name: '家用吸尘器', price: 450 },
    { name: '儿童玩具车', price: 120 },
    { name: '多功能插座', price: 25 },
    { name: '运动跑鞋', price: 180 },
    { name: '机械键盘', price: 200 },
    { name: '无线鼠标', price: 50 },
    { name: '高清显示器', price: 800 }
  ]

  const firstNames = ['张', '李', '王', '赵', '陈', '刘', '杨', '黄', '周', '吴']
  const lastNames = ['伟', '芳', '娜', '敏', '静', '强', '磊', '军', '洋', '杰']
  const settlements = ['月结30天', '月结60天', '预付50%', '货到付款', '款到发货']

  // Placeholder images
  const images = [
    'https://yanxuan-item.nosdn.127.net/c0b3d87a80660429dc37307043a53272.png',
    'https://yanxuan-item.nosdn.127.net/05c8739f3792019c0a68d7168d601b04.png',
    'https://yanxuan-item.nosdn.127.net/4089c0a63162b77a3d3c8c773950664e.png',
    'https://yanxuan-item.nosdn.127.net/8975399580970732860882e37947754f.png'
  ]

  for (let i = 1; i <= count; i++) {
    const city = cities[Math.floor(Math.random() * cities.length)]
    const industry = industries[Math.floor(Math.random() * industries.length)]
    const company = city + industry + suffixes[Math.floor(Math.random() * suffixes.length)]

    // Generate random products for this supplier (1-5 products)
    const productCount = Math.floor(Math.random() * 5) + 1
    const products = []
    for (let j = 0; j < productCount; j++) {
      const p = productTypes[Math.floor(Math.random() * productTypes.length)]
      products.push({
        name: p.name,
        price: p.price,
        image: images[Math.floor(Math.random() * images.length)]
      })
    }

    data.push({
      id: i,
      name: company,
      type: types[Math.floor(Math.random() * types.length)],
      status: Math.random() > 0.1 ? 1 : 0,
      level: levels[Math.floor(Math.random() * levels.length)],
      products: products,
      settlement: settlements[Math.floor(Math.random() * settlements.length)],
      contact: firstNames[Math.floor(Math.random() * firstNames.length)] + lastNames[Math.floor(Math.random() * lastNames.length)],
      phone: '13' + Math.floor(Math.random() * 10) + '****' + Math.floor(1000 + Math.random() * 9000),
      email: `supplier${i}@example.com`,
      license: '9144' + Math.floor(Math.random() * 10000000000000),
      desc: `${company} 成立于2010年，位于${city}，主要从事${industry}行业。公司拥有先进的生产设备和专业的研发团队。`
    })
  }
  return data
}

const ALL_DATA = generateMockData(50)

export default {
  name: 'SupplierList',
  components: { Pagination },
  filters: {
    statusFilter(status) {
      const statusMap = {
        1: 'success',
        0: 'danger'
      }
      return statusMap[status]
    },
    statusLabel(status) {
      return status === 1 ? '启用' : '禁用'
    }
  },
  data() {
    return {
      list: [],
      total: 0,
      listLoading: true,
      listQuery: {
        page: 1,
        limit: 20,
        name: undefined,
        settlement: undefined,
        type: undefined,
        status: undefined
      },
      settlementOptions: ['月结30天', '月结60天', '预付50%', '货到付款', '款到发货'],
      typeOptions: ['生产厂家', '一级代理', '经销商', '个人商户'],
      levelOptions: ['战略合作', '核心供应商', '普通供应商', '临时供应商'],
      statusOptions: [{ label: '启用', value: 1 }, { label: '禁用', value: 0 }],
      dialogFormVisible: false,
      detailDialogVisible: false,
      currentDetail: {},
      dialogStatus: '',
      textMap: {
        update: '编辑供应商',
        create: '添加供应商'
      },
      dataForm: {
        id: undefined,
        name: '',
        type: '生产厂家',
        status: 1,
        level: '普通供应商',
        products: [],
        settlement: '',
        contact: '',
        phone: '',
        email: '',
        license: '',
        desc: ''
      },
      rules: {
        name: [{ required: true, message: '供应商名称不能为空', trigger: 'blur' }],
        contact: [{ required: true, message: '联系人不能为空', trigger: 'blur' }]
      },
      downloadLoading: false,
      productListDialogVisible: false,
      currentProductListSupplier: {},
      productFormDialogVisible: false,
      currentProductForm: { name: '', price: '', image: '' },
      productFormStatus: 'create',
      editingProductIndex: -1,
      productRules: {
        name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
        price: [{ required: true, message: '请输入价格', trigger: 'blur' }]
      }
    }
  },
  created() {
    this.getList()
  },
  methods: {
    getList() {
      this.listLoading = true

      // Simulate API
      setTimeout(() => {
        let filteredData = ALL_DATA
        if (this.listQuery.name) {
          filteredData = filteredData.filter(item => item.name.indexOf(this.listQuery.name) > -1)
        }
        if (this.listQuery.settlement) {
          filteredData = filteredData.filter(item => item.settlement === this.listQuery.settlement)
        }
        if (this.listQuery.type) {
          filteredData = filteredData.filter(item => item.type === this.listQuery.type)
        }
        if (this.listQuery.status !== undefined && this.listQuery.status !== '') {
          filteredData = filteredData.filter(item => item.status === this.listQuery.status)
        }

        this.total = filteredData.length
        const start = (this.listQuery.page - 1) * this.listQuery.limit
        const end = start + this.listQuery.limit
        this.list = filteredData.slice(start, end)

        this.listLoading = false
      }, 300)
    },
    handleFilter() {
      this.listQuery.page = 1
      this.getList()
    },
    resetForm() {
      this.dataForm = {
        id: undefined,
        name: '',
        type: '生产厂家',
        status: 1,
        level: '普通供应商',
        products: [],
        settlement: '月结30天',
        contact: '',
        phone: '',
        email: '',
        license: '',
        desc: ''
      }
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
      this.$refs['dataForm'].validate((valid) => {
        if (valid) {
          this.dataForm.id = parseInt(Math.random() * 100) + 1024 // Mock ID
          this.list.unshift(this.dataForm)
          this.dialogFormVisible = false
          this.$notify({
            title: '成功',
            message: '创建成功',
            type: 'success',
            duration: 2000
          })
        }
      })
    },
    handleUpdate(row) {
      // Deep copy to avoid modifying the original row directly
      this.dataForm = JSON.parse(JSON.stringify(row))
      this.dialogStatus = 'update'
      this.dialogFormVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    updateData() {
      this.$refs['dataForm'].validate((valid) => {
        if (valid) {
          const index = this.list.findIndex(v => v.id === this.dataForm.id)
          this.list.splice(index, 1, this.dataForm)
          this.dialogFormVisible = false
          this.$notify({
            title: '成功',
            message: '更新成功',
            type: 'success',
            duration: 2000
          })
        }
      })
    },
    handleDetail(row) {
      this.currentDetail = row
      this.detailDialogVisible = true
    },
    handleDelete(row) {
      this.$confirm('确定删除该供应商?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        const index = this.list.indexOf(row)
        this.list.splice(index, 1)
        this.$notify({
          title: '成功',
          message: '删除成功',
          type: 'success',
          duration: 2000
        })
      })
    },
    handleAddProduct() {
      this.dataForm.products.push({
        name: '',
        price: '',
        image: 'https://yanxuan-item.nosdn.127.net/c0b3d87a80660429dc37307043a53272.png' // Default mock image
      })
    },
    handleRemoveProduct(index) {
      this.dataForm.products.splice(index, 1)
    },
    handleProductList(row) {
      this.currentProductListSupplier = row
      this.productListDialogVisible = true
    },
    handleAddProductInDialog() {
      this.currentProductForm = {
        name: '',
        price: '',
        image: 'https://yanxuan-item.nosdn.127.net/c0b3d87a80660429dc37307043a53272.png'
      }
      this.productFormStatus = 'create'
      this.productFormDialogVisible = true
      this.$nextTick(() => {
        this.$refs['productForm'] && this.$refs['productForm'].clearValidate()
      })
    },
    handleEditProductInDialog(row, index) {
      this.currentProductForm = JSON.parse(JSON.stringify(row))
      this.editingProductIndex = index
      this.productFormStatus = 'update'
      this.productFormDialogVisible = true
      this.$nextTick(() => {
        this.$refs['productForm'] && this.$refs['productForm'].clearValidate()
      })
    },
    handleDeleteProductInDialog(index) {
      this.$confirm('确定删除该商品?', '提示', { type: 'warning' }).then(() => {
        this.currentProductListSupplier.products.splice(index, 1)
        this.$notify({ title: '成功', message: '删除成功', type: 'success' })
      })
    },
    saveProductForm() {
      this.$refs['productForm'].validate((valid) => {
        if (valid) {
          if (this.productFormStatus === 'create') {
            this.currentProductListSupplier.products.push({ ...this.currentProductForm })
          } else {
            this.currentProductListSupplier.products.splice(this.editingProductIndex, 1, { ...this.currentProductForm })
          }
          this.productFormDialogVisible = false
          this.$notify({ title: '成功', message: '保存成功', type: 'success' })
        }
      })
    },
    handleDownload() {
      this.downloadLoading = true
      import('@/vendor/Export2Excel').then(excel => {
        const tHeader = ['ID', '供应商', '类型', '状态', '等级', '商品数', '结算方式', '联系人', '电话', '邮箱', '执照', '介绍']
        const filterVal = ['id', 'name', 'type', 'statusLabel', 'level', 'productCount', 'settlement', 'contact', 'phone', 'email', 'license', 'desc']

        // Custom formatting for export
        const exportList = this.list.map(item => ({
          ...item,
          productCount: item.products.length,
          statusLabel: item.status === 1 ? '启用' : '禁用'
        }))

        const data = this.formatJson(filterVal, exportList)
        excel.export_json_to_excel({
          header: tHeader,
          data,
          filename: 'supplier-list'
        })
        this.downloadLoading = false
      })
    },
    formatJson(filterVal, jsonData) {
      return jsonData.map(v => filterVal.map(j => {
        return v[j]
      }))
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
