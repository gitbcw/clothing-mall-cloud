<template>
  <div class="app-container">

    <!-- 商品信息卡片 -->
    <el-card v-if="goods.id" class="box-card">
      <h3>商品详情</h3>
      <el-form ref="goods" :rules="rules" :model="goods" label-width="150px">
        <el-form-item label="商品ID" prop="id">
          <el-input v-model="goods.id" disabled style="width: 150px" />
        </el-form-item>
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
            :http-request="cloudUpload"
            :show-file-list="false"
            :auto-upload="false"
            :on-change="handlePicChange"
            :on-success="uploadPicUrl"
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
            :file-list="galleryFileList"
            :on-exceed="uploadOverrun"
            :on-success="handleGalleryUrl"
            :on-remove="handleRemove"
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
          <el-input v-if="newKeywordVisible" ref="newKeywordInput" v-model="newKeyword" class="input-new-keyword" @keyup.enter.native="handleInputConfirm" @blur="handleInputConfirm" />
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
      <el-button type="primary" @click="handleAttributeShow(null)">{{ $t('app.button.create') }}</el-button>
      <el-table :data="attributesData">
        <el-table-column property="attribute" :label="$t('goods_edit.table.attribute_name')" />
        <el-table-column property="value" :label="$t('goods_edit.table.attribute_value')" />
        <el-table-column align="center" :label="$t('goods_edit.table.attribute_actions')" width="200" class-name="small-padding fixed-width">
          <template slot-scope="scope">
            <el-button type="primary" size="mini" @click="handleAttributeShow(scope.row)">{{ $t('app.button.settings') }}</el-button>
            <el-button type="danger" size="mini" @click="handleAttributeDelete(scope.row)">{{ $t('app.button.delete') }}</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog :visible.sync="attributeVisiable" :title="$t(attributeAdd ? 'goods_edit.dialog.edit_attribute_add' : 'goods_edit.dialog.edit_attribute_edit')">
        <el-form ref="attributeForm" :model="attributeForm" status-icon label-position="left" label-width="100px" style="width: 400px; margin-left:50px;">
          <el-form-item :label="$t('goods_edit.form.attribute_name')" prop="attribute">
            <el-input v-model="attributeForm.attribute" />
          </el-form-item>
          <el-form-item :label="$t('goods_edit.form.attribute_value')" prop="value">
            <el-input v-model="attributeForm.value" />
          </el-form-item>
        </el-form>
        <div slot="footer" class="dialog-footer">
          <el-button @click="attributeVisiable = false">{{ $t('app.button.cancel') }}</el-button>
          <el-button v-if="attributeAdd" type="primary" @click="handleAttributeAdd">{{ $t('app.button.confirm') }}</el-button>
          <el-button v-else type="primary" @click="handleAttributeEdit">{{ $t('app.button.confirm') }}</el-button>
        </div>
      </el-dialog>
    </el-card>

    <!-- 操作按钮 -->
    <div v-if="goods.id" class="op-container">
      <el-button @click="handleCancel">{{ $t('app.button.cancel') }}</el-button>
      <!-- 已上架商品：仅保存修改 -->
      <el-button v-if="goods.status === 'published'" type="primary" :loading="saving" @click="handleSave">保存修改</el-button>
      <!-- 草稿/待上架商品：三种操作 -->
      <template v-else>
        <el-button type="info" :loading="saving" @click="handleSaveDraft">暂存草稿</el-button>
        <el-button type="success" :loading="saving" @click="handleSavePending">转为待上架</el-button>
        <el-button type="primary" :loading="saving" @click="handlePublish">直接上架</el-button>
      </template>
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
.op-container {
  display: flex;
  justify-content: center;
}
.form-tip {
  margin-left: 12px;
  color: #909399;
  font-size: 12px;
}
</style>

<script>
import { detailGoods, editGoods, listCatAndBrand } from '@/api/goods'
import { listScene } from '@/api/scene'
import { cloudUpload, cloudUploadFile } from '@/utils/upload'
import Editor from '@tinymce/tinymce-vue'
import { MessageBox } from 'element-ui'

export default {
  name: 'GoodsEdit',
  components: { Editor },
  data() {
    return {
      cloudUpload,
      // 商品数据
      goods: { gallery: [] },
      picFile: null,
      saving: false,
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
      attributeAdd: true,
      attributeForm: { attribute: '', value: '' },
      // 表单验证
      rules: {
        name: [{ required: true, message: '商品名称不能为空', trigger: 'blur' }]
      },
      editorInit: {
        language: 'zh_CN',
        height: '400px',
        convert_urls: false,
        plugins: [
          'advlist anchor autolink autosave code codesample colorpicker colorpicker contextmenu directionality emoticons fullscreen hr image imagetools importcss insertdatetime link lists media nonbreaking noneditable pagebreak paste preview print save searchreplace spellchecker tabfocus table template textcolor textpattern visualblocks visualchars wordcount'
        ],
        toolbar: [
          'searchreplace bold italic underline strikethrough alignleft aligncenter alignright outdent indent  blockquote undo redo removeformat subscript superscript code codesample',
          'hr bullist numlist link image charmap preview anchor pagebreak insertdatetime media table emoticons forecolor backcolor fullscreen'
        ],
        images_upload_handler: function(blobInfo, success, failure) {
          const file = blobInfo.blob()
          file.name = blobInfo.filename()
          cloudUploadFile(file)
            .then(url => {
              success(url)
            })
            .catch(() => {
              failure('上传失败，请重新上传')
            })
        }
      }
    }
  },
  computed: {
    attributesData() {
      return this.attributes.filter(attr => !attr.deleted)
    }
  },
  created() {
    this.init()
  },
  methods: {
    init: function() {
      // 加载分类和品牌
      listCatAndBrand().then(response => {
        this.categoryList = response.data.data.categoryList
        this.brandList = response.data.data.brandList
      })

      // 加载场景列表后，如果有商品数据则回显场景
      listScene({ page: 1, limit: 100 }).then(response => {
        const list = response.data.data.list || response.data.data || []
        this.sceneList = list.map(item => ({
          value: item.id,
          label: item.name
        }))
        // 场景列表加载完后，回显已有商品的场景标签
        this.restoreSceneTags()
      }).catch(() => {
        console.warn('加载场景列表失败')
      })

      // 如果有 id 参数，直接加载商品详情
      if (this.$route.query.id) {
        this.loadGoodsById(this.$route.query.id)
      }
    },

    // 回显场景标签
    restoreSceneTags() {
      if (!this.goods.sceneTags || this.selectedSceneIds.length > 0) return
      try {
        const tagNames = JSON.parse(this.goods.sceneTags)
        if (Array.isArray(tagNames)) {
          this.selectedSceneIds = tagNames.map(name => {
            const scene = this.sceneList.find(s => s.label === name)
            return scene ? scene.value : null
          }).filter(Boolean)
        }
      } catch (e) {
        console.warn('解析场景标签失败:', e)
      }
    },

    // 通过 ID 加载商品
    loadGoodsById(id) {
      detailGoods(id).then(response => {
        this.goods = response.data.data.goods
        if (this.goods.brandId === 0) {
          this.goods.brandId = null
        }
        if (this.goods.keywords === '') {
          this.goods.keywords = null
        }
        // 自动展开特价开关
        if (this.goods.specialPrice) {
          this.goods.isSpecialPrice = true
        }
        this.attributes = response.data.data.attributes || []

        // 处理图片
        this.galleryFileList = []
        for (var i = 0; i < this.goods.gallery.length; i++) {
          this.galleryFileList.push({
            url: this.goods.gallery[i],
            name: this.goods.gallery[i]
          })
        }

        // 处理关键字
        if (this.goods.keywords) {
          this.keywords = this.goods.keywords.split(',')
        }

        // 尝试回显场景标签（场景列表可能已加载）
        this.restoreSceneTags()
      })
    },

    // 暂存草稿
    async handleSaveDraft() {
      await this.updateGoods('draft', '草稿保存成功')
    },

    // 转为待上架
    async handleSavePending() {
      await this.updateGoods('pending', '已转为待上架')
    },

    // 保存修改（已上架商品）
    async handleSave() {
      await this.updateGoods('published', '保存成功')
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

      this.saving = true
      try {
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
            status: status,
            isOnSale: status === 'published'
          },
          specifications: [],
          products: [],
          attributes: this.attributes,
          sceneTags: this.selectedSceneIds.map(id => {
            const scene = this.sceneList.find(s => s.value === id)
            return scene ? scene.label : null
          }).filter(Boolean)
        }

        await editGoods(data)
        this.$notify.success({ title: '成功', message: successMsg })
        this.$store.dispatch('tagsView/delView', this.$route)
        this.$router.push('/goods/list')
      } catch (error) {
        const errMsg = error?.response?.data?.errmsg || error?.message || '未知错误'
        MessageBox.alert('操作失败：' + errMsg, '警告', {
          confirmButtonText: '确定',
          type: 'error'
        })
      } finally {
        this.saving = false
      }
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
      if (response.errno === 0) {
        this.goods.picUrl = response.data.url
      }
    },
    uploadOverrun: function() {
      this.$message({
        type: 'error',
        message: '上传文件个数超出限制!最多上传5张图片!'
      })
    },
    handleGalleryUrl(response, file, fileList) {
      if (response.errno === 0) {
        this.goods.gallery.push(response.data.url)
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
    handleAttributeShow(row) {
      if (row && row.id) {
        this.attributeForm = Object.assign({}, row)
        this.attributeAdd = false
      } else {
        this.attributeForm = { attribute: '', value: '' }
        this.attributeAdd = true
      }
      this.attributeVisiable = true
    },
    handleAttributeAdd() {
      this.attributes.unshift(this.attributeForm)
      this.attributeVisiable = false
    },
    handleAttributeEdit() {
      this.attributeForm.updateTime = ''
      for (var i = 0; i < this.attributes.length; i++) {
        const v = this.attributes[i]
        if (v.id === this.attributeForm.id) {
          this.attributes.splice(i, 1, this.attributeForm)
          break
        }
      }
      this.attributeVisiable = false
    },
    handleAttributeDelete(row) {
      row.deleted = true
    }
  }
}
</script>
