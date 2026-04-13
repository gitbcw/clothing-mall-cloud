<template>
  <div class="app-container">

    <!-- 商品查询卡片 -->
    <el-card class="box-card">
      <h3>商品查询</h3>
      <el-row :gutter="20" type="flex" align="middle">
        <el-col :span="6">
          <el-input v-model="searchGoodsSn" placeholder="输入商品款号" clearable @keyup.enter.native="handleSearch" />
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-col>
      </el-row>
      <el-alert v-if="searchMsg" :title="searchMsg" :type="searchType" show-icon style="margin-top:15px" />
    </el-card>

    <!-- 商品信息卡片（查询成功后显示） -->
    <el-card v-if="goods.id" class="box-card">
      <h3>商品信息</h3>
      <el-form ref="goods" :rules="rules" :model="goods" label-width="150px">
        <el-form-item label="商品款号" prop="goodsSn">
          <el-input v-model="goods.goodsSn" style="width: 300px" disabled />
        </el-form-item>
        <el-form-item :label="$t('goods_edit.form.name')" prop="name">
          <el-input v-model="goods.name" style="width: 300px" />
        </el-form-item>
        <el-form-item label="一口价" prop="retailPrice">
          <el-input v-model="goods.retailPrice" placeholder="0.00" style="width: 300px">
            <template slot="append">元</template>
          </el-input>
          <span class="form-tip">（实际售价，留空则自动取规格最低价）</span>
        </el-form-item>
        <!-- 特价设置 -->
        <el-form-item label="设置特价">
          <el-switch v-model="goods.isSpecialPrice" active-text="特价" inactive-text="普通" />
        </el-form-item>
        <el-form-item v-if="goods.isSpecialPrice" label="特价金额">
          <el-input v-model="goods.specialPrice" placeholder="0.00" style="width: 300px">
            <template slot="append">元</template>
          </el-input>
        </el-form-item>

        <el-form-item :label="$t('goods_edit.form.pic_url')">
          <el-upload
            ref="picUpload"
            :http-request="cloudUpload"
            :show-file-list="false"
            :auto-upload="false"
            :on-change="handlePicChange"
            :on-success="uploadPicUrl"
            :on-error="uploadError"
            class="avatar-uploader"
            accept=".jpg,.jpeg,.png,.gif"
          >
            <img v-if="goods.picUrl" :src="imageUrl(goods.picUrl)" class="avatar">
            <i v-else class="el-icon-plus avatar-uploader-icon" />
          </el-upload>
        </el-form-item>

        <el-form-item :label="$t('goods_edit.form.gallery')">
          <el-upload
            :http-request="cloudUpload"
            :limit="5"
            :on-exceed="uploadOverrun"
            :on-success="handleGalleryUrl"
            :on-error="uploadError"
            :on-remove="handleRemove"
            :file-list="galleryFileList"
            multiple
            accept=".jpg,.jpeg,.png,.gif"
            list-type="picture-card"
          >
            <i class="el-icon-plus" />
          </el-upload>
        </el-form-item>

        <el-form-item :label="$t('goods_edit.form.keywords')">
          <el-tag v-for="tag in keywords" :key="tag" closable type="primary" @close="handleClose(tag)">
            {{ tag }}
          </el-tag>
          <el-input
            v-if="newKeywordVisible"
            ref="newKeywordInput"
            v-model="newKeyword"
            class="input-new-keyword"
            @keyup.enter.native="handleInputConfirm"
            @blur="handleInputConfirm"
          />
          <el-button v-else class="button-new-keyword" type="primary" @click="showInput">{{ $t('app.button.add') }}</el-button>
        </el-form-item>

        <el-form-item :label="$t('goods_edit.form.category_id')">
          <el-select v-model="goods.categoryId" clearable>
            <el-option v-for="item in categoryList" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>

        <!-- 场景标签（多选） -->
        <el-form-item label="场景标签">
          <el-select
            v-model="selectedSceneIds"
            multiple
            collapse-tags
            clearable
            placeholder="请选择场景（可多选）"
            style="width: 300px;"
          >
            <el-option v-for="item in sceneList" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>

        <el-form-item :label="$t('goods_edit.form.brief')">
          <el-input v-model="goods.brief" />
        </el-form-item>

        <el-form-item :label="$t('goods_edit.form.detail')">
          <editor v-model="goods.detail" :init="editorInit" />
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 商品参数卡片 -->
    <el-card v-if="goods.id" class="box-card">
      <h3>{{ $t('goods_edit.section.attributes') }}</h3>
      <el-button type="primary" @click="handleAttributeShow">{{ $t('app.button.create') }}</el-button>
      <el-table :data="attributes">
        <el-table-column property="attribute" :label="$t('goods_edit.table.attribute_name')" />
        <el-table-column property="value" :label="$t('goods_edit.table.attribute_value')" />
        <el-table-column align="center" :label="$t('goods_edit.table.attribute_actions')" width="100" class-name="small-padding fixed-width">
          <template slot-scope="scope">
            <el-button type="danger" size="mini" @click="handleAttributeDelete(scope.row)">{{ $t('app.button.delete') }}</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog :visible.sync="attributeVisiable" :title="$t('goods_edit.dialog.create_attribute')">
        <el-form
          ref="attributeForm"
          :model="attributeForm"
          status-icon
          label-position="left"
          label-width="100px"
          style="width: 400px; margin-left:50px;"
        >
          <el-form-item :label="$t('goods_edit.form.attribute_name')" prop="attribute">
            <el-input v-model="attributeForm.attribute" />
          </el-form-item>
          <el-form-item :label="$t('goods_edit.form.attribute_value')" prop="value">
            <el-input v-model="attributeForm.value" />
          </el-form-item>
        </el-form>
        <div slot="footer" class="dialog-footer">
          <el-button @click="attributeVisiable = false">{{ $t('app.button.cancel') }}</el-button>
          <el-button type="primary" @click="handleAttributeAdd">{{ $t('app.button.confirm') }}</el-button>
        </div>
      </el-dialog>
    </el-card>

    <!-- 操作按钮 -->
    <div v-if="goods.id" class="op-container">
      <el-button @click="handleCancel">{{ $t('app.button.cancel') }}</el-button>
      <el-button type="success" @click="handleSaveDraft">暂存草稿</el-button>
      <el-button type="primary" @click="handlePublish">上架</el-button>
    </div>

  </div>
</template>

<style>
  .el-card {
    margin-bottom: 10px;
  }

  .el-tag + .el-tag {
    margin-left: 10px;
  }

  .input-new-keyword {
    width: 90px;
    margin-left: 10px;
    vertical-align: bottom;
  }

  .avatar-uploader .el-upload {
    width: 145px;
    height: 145px;
    border: 1px dashed #d9d9d9;
    border-radius: 6px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
  }

  .avatar-uploader .el-upload:hover {
    border-color: #20a0ff;
  }

  .avatar-uploader-icon {
    font-size: 28px;
    color: #8c939d;
    width: 120px;
    height: 120px;
    line-height: 120px;
    text-align: center;
  }

  .avatar {
    width: 145px;
    height: 145px;
    display: block;
    object-fit: cover;
  }

  .form-tip {
    margin-left: 12px;
    color: #909399;
    font-size: 12px;
  }
</style>

<script>
import { findByGoodsSn, editGoods, listCatAndBrand } from '@/api/goods'
import { listScene } from '@/api/scene'
import { cloudUpload, cloudUploadFile } from '@/utils/upload'
import Editor from '@tinymce/tinymce-vue'
import { MessageBox } from 'element-ui'

export default {
  name: 'GoodsCreate',
  components: { Editor },

  data() {
    return {
      cloudUpload,
      // 查询相关
      searchGoodsSn: '',
      searchMsg: '',
      searchType: 'info',
      // 商品数据
      goods: {},
      picFile: null,
      galleryFileList: [],
      keywords: [],
      newKeywordVisible: false,
      newKeyword: '',
      // 场景标签相关
      sceneList: [],
      selectedSceneIds: [],
      // 分类和品牌
      categoryList: [],
      brandList: [],
      // 商品属性
      attributes: [],
      attributeVisiable: false,
      attributeForm: { attribute: '', value: '' },
      // 表单验证
      rules: {
        name: [{ required: true, message: '商品名称不能为空', trigger: 'blur' }]
      },
      editorInit: {
        language: 'zh_CN',
        height: 500,
        convert_urls: false,
        plugins: ['advlist anchor autolink autosave code codesample colorpicker colorpicker contextmenu directionality emoticons fullscreen hr image imagetools importcss insertdatetime link lists media nonbreaking noneditable pagebreak paste preview print save searchreplace spellchecker tabfocus table template textcolor textpattern visualblocks visualchars wordcount'],
        toolbar: ['searchreplace bold italic underline strikethrough alignleft aligncenter alignright outdent indent  blockquote undo redo removeformat subscript superscript code codesample', 'hr bullist numlist link image charmap preview anchor pagebreak insertdatetime media table emoticons forecolor backcolor fullscreen'],
        images_upload_handler: function(blobInfo, success, failure) {
          const file = blobInfo.blob()
          file.name = blobInfo.filename()
          cloudUploadFile(file).then(url => {
            success(url)
          }).catch(() => {
            failure('上传失败，请重新上传')
          })
        }
      }
    }
  },
  created() {
    this.init()
  },

  methods: {
    init: function() {
      listCatAndBrand().then(response => {
        this.categoryList = response.data.data.categoryList
        this.brandList = response.data.data.brandList
      })
      // 加载场景列表
      listScene({ page: 1, limit: 100 }).then(response => {
        const list = response.data.data.list || response.data.data || []
        this.sceneList = list.map(item => ({
          value: item.id,
          label: item.name
        }))
      }).catch(() => {
        console.warn('加载场景列表失败')
      })
    },

    // 查询商品
    handleSearch() {
      if (!this.searchGoodsSn.trim()) {
        this.$message.warning('请输入商品款号')
        return
      }

      findByGoodsSn(this.searchGoodsSn.trim()).then(res => {
        const data = res.data.data
        this.goods = data.goods
        this.attributes = data.attributes || []

        // 处理关键字
        this.keywords = this.goods.keywords ? this.goods.keywords.split(',') : []

        // 处理图片
        this.galleryFileList = (this.goods.gallery || []).map(url => ({ url, name: url }))

        // 显示状态
        const statusText = { draft: '草稿', pending: '待上架', published: '已上架' }
        this.searchMsg = `已找到：${this.goods.name} - ${statusText[this.goods.status] || '未知'}`
        this.searchType = 'success'
      }).catch(() => {
        this.searchMsg = '未找到该款号的商品'
        this.searchType = 'warning'
        this.goods = {}
      })
    },

    // 暂存草稿
    async handleSaveDraft() {
      await this.updateGoods('draft', '草稿保存成功')
    },

    // 上架
    async handlePublish() {
      await this.updateGoods('published', '上架成功')
    },

    // 更新商品
    async updateGoods(status, successMsg) {
      // 特价未开启时清空特价金额
      if (!this.goods.isSpecialPrice) {
        this.goods.specialPrice = null
      }

      // 如果有待上传的商品图片，先上传
      if (this.picFile) {
        try {
          const url = await cloudUploadFile(this.picFile)
          this.goods.picUrl = url
        } catch (e) {
          console.warn('图片上传失败:', e)
        }
      }

      const data = {
        goods: {
          ...this.goods,
          status: status
        },
        specifications: [],
        products: [],
        attributes: this.attributes,
        sceneIds: this.selectedSceneIds
      }

      editGoods(data).then(() => {
        this.$notify.success({ title: '成功', message: successMsg })
        this.$store.dispatch('tagsView/delView', this.$route)
        this.$router.push('/goods/list')
      }).catch(error => {
        const errMsg = error?.response?.data?.errmsg || error?.message || '未知错误'
        MessageBox.alert('操作失败：' + errMsg, '警告', {
          confirmButtonText: '确定',
          type: 'error'
        })
      })
    },

    // 重置
    handleReset() {
      this.searchGoodsSn = ''
      this.searchMsg = ''
      this.goods = {}
      this.galleryFileList = []
      this.keywords = []
      this.attributes = []
    },

    handleCancel: function() {
      this.$store.dispatch('tagsView/delView', this.$route)
      this.$router.push({ path: '/goods/list' })
    },

    handleClose(tag) {
      this.keywords.splice(this.keywords.indexOf(tag), 1)
      this.goods.keywords = this.keywords.toString()
    },
    showInput() {
      this.newKeywordVisible = true
      this.$nextTick(_ => {
        this.$refs.newKeywordInput.$refs.input.focus()
      })
    },
    handleInputConfirm() {
      const newKeyword = this.newKeyword
      if (newKeyword) {
        this.keywords.push(newKeyword)
        this.goods.keywords = this.keywords.toString()
      }
      this.newKeywordVisible = false
      this.newKeyword = ''
    },
    handlePicChange: function(file) {
      if (file.raw) {
        this.picFile = file.raw
        this.goods.picUrl = URL.createObjectURL(file.raw)
      }
    },
    uploadPicUrl: function(response) {
      if (response && response.errno === 0 && response.data && response.data.url) {
        this.goods.picUrl = response.data.url
      } else {
        const msg = response && response.errmsg ? response.errmsg : '上传失败，请重新上传'
        this.$message({ type: 'error', message: msg })
      }
    },
    uploadOverrun: function() {
      this.$message({
        type: 'error',
        message: '上传文件个数超出限制!最多上传5张图片!'
      })
    },
    uploadError: function(err) {
      this.$message({
        type: 'error',
        message: '上传失败: ' + (err?.message || '未知错误')
      })
    },
    handleGalleryUrl(response, file, fileList) {
      if (response && response.errno === 0 && response.data && response.data.url) {
        this.goods.gallery.push(response.data.url)
      } else {
        const msg = response && response.errmsg ? response.errmsg : '上传失败，请重新上传'
        this.$message({ type: 'error', message: msg })
      }
    },
    handleRemove: function(file, fileList) {
      for (var i = 0; i < this.goods.gallery.length; i++) {
        var url
        if (file.response === undefined) {
          url = file.url
        } else {
          url = file.response.data.url
        }

        if (this.goods.gallery[i] === url) {
          this.goods.gallery.splice(i, 1)
        }
      }
    },
    handleAttributeShow() {
      this.attributeForm = { attribute: '', value: '' }
      this.attributeVisiable = true
    },
    handleAttributeAdd() {
      this.attributes.unshift(this.attributeForm)
      this.attributeVisiable = false
    },
    handleAttributeDelete(row) {
      const index = this.attributes.indexOf(row)
      this.attributes.splice(index, 1)
    }
  }
}
</script>
