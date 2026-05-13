<template>
  <div class="app-container">

    <!-- 商品信息卡片 -->
    <el-card v-if="goods.id" class="box-card">
      <h3>商品详情</h3>
      <el-form ref="goods" :rules="rules" :model="goods" label-width="150px">
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
            action="#"
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
          <div v-if="imageRecognizing" class="ai-recognizing-tip">
            <i class="el-icon-loading" /> AI 识别中...
          </div>
        </el-form-item>

        <el-form-item :label="$t('goods_edit.form.gallery')">
          <el-upload
            action="#"
            :http-request="cloudUpload"
            class="goods-gallery-upload"
            :limit="9"
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
          <el-select v-model="goods.categoryId" clearable placeholder="请选择分类">
            <el-option v-for="item in categoryList" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>

        <!-- 场景标签（chip 多选，与小程序一致） -->
        <el-form-item label="场景标签">
          <div class="scene-chips">
            <span
              v-for="item in sceneList"
              :key="item.value"
              class="scene-chip"
              :class="{ active: selectedSceneIds.includes(item.value) }"
              @click="toggleScene(item.value)"
            >{{ item.label }}</span>
          </div>
        </el-form-item>

        <el-form-item :label="$t('goods_edit.form.brief')">
          <el-input v-model="goods.brief" />
        </el-form-item>

        <el-form-item :label="$t('goods_edit.form.detail')">
          <editor v-model="goods.detail" :init="editorInit" />
        </el-form-item>
      </el-form>
    </el-card>


    <!-- 操作按钮 -->
    <div v-if="goods.id" class="op-container">
      <el-button @click="handleCancel">{{ $t('app.button.cancel') }}</el-button>
      <!-- 已上架商品：仅保存修改 -->
      <el-button v-if="goods.status === 'published'" type="primary" :loading="saving" @click="handleSave">保存修改</el-button>
      <!-- 草稿/待上架商品：操作 -->
      <template v-else>
        <!-- <el-button type="info" :loading="saving" @click="handleSaveDraft">暂存草稿</el-button> -->
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
  object-fit: contain;
  background: #f5f7fa;
}
/* 画廊图片自适应比例 */
.goods-gallery-upload .el-upload-list--picture-card .el-upload-list__item {
  width: 148px;
  height: 148px;
}
.goods-gallery-upload .el-upload-list--picture-card .el-upload-list__item-thumbnail {
  object-fit: contain;
  background: #f5f7fa;
}
.goods-gallery-upload .el-upload--picture-card {
  width: 148px;
  height: 148px;
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
.ai-recognizing-tip {
  margin-top: 8px;
  color: #409eff;
  font-size: 12px;
}
/* 场景标签 chip 样式 */
.scene-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.scene-chip {
  display: inline-block;
  padding: 4px 14px;
  border-radius: 16px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid #dcdfe6;
  color: #606266;
  background: #fff;
  transition: all 0.2s;
  user-select: none;
}
.scene-chip:hover {
  border-color: #409eff;
  color: #409eff;
}
.scene-chip.active {
  background: #409eff;
  border-color: #409eff;
  color: #fff;
}
</style>

<script>
import { detailGoods, editGoods, listCatAndBrand, recognizeImage } from '@/api/goods'
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
      imageRecognizing: false,
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

        // 处理图片（gallery 在 MySQL 中存为 JSON 字符串，需解析）
        var gallery = this.goods.gallery
        if (typeof gallery === 'string') {
          try { gallery = JSON.parse(gallery) } catch (e) { gallery = [] }
        }
        if (!Array.isArray(gallery)) gallery = []
        this.goods.gallery = gallery

        this.galleryFileList = []
        for (var i = 0; i < gallery.length; i++) {
          this.galleryFileList.push({
            url: this.imageUrl(gallery[i]),
            name: gallery[i]
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
        this.$router.go(-1)
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
      this.$router.go(-1)
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
        // 自动触发 AI 识别
        this.recognizeMainImage(file.raw)
      }
    },
    async recognizeMainImage(file) {
      if (this.imageRecognizing) return
      this.imageRecognizing = true
      try {
        const cloudPath = await cloudUploadFile(file)
        this.goods.picUrl = cloudPath
        this.picFile = null

        const res = await recognizeImage({ fileID: cloudPath })
        if (res.data.errno === 0 && res.data.data) {
          this.applyRecognition(res.data.data)
        }
      } catch (e) {
        console.warn('AI 识别失败:', e)
      } finally {
        this.imageRecognizing = false
      }
    },
    applyRecognition(result) {
      let updated = false
      // 名称（仅空时填充）
      if (result.name && !this.goods.name) {
        this.goods.name = result.name
        updated = true
      }
      // 价格（仅空时填充）
      if (result.price && !this.goods.retailPrice) {
        this.goods.retailPrice = result.price
        updated = true
      }
      // 简介（仅空时填充）
      if (result.brief && !this.goods.brief) {
        this.goods.brief = result.brief
        updated = true
      }
      // 分类（仅空时填充，精确或模糊匹配）
      if (result.category && !this.goods.categoryId) {
        const cat = this.categoryList.find(c => c.name === result.category)
          || this.categoryList.find(c => c.name.includes(result.category) || result.category.includes(c.name))
        if (cat) {
          this.goods.categoryId = cat.id
          updated = true
        }
      }
      // 场景（追加不重复的）
      if (result.scenes && result.scenes.length > 0) {
        for (const sceneName of result.scenes) {
          const scene = this.sceneList.find(s => s.label === sceneName)
            || this.sceneList.find(s => s.label.includes(sceneName) || sceneName.includes(s.label))
          if (scene && !this.selectedSceneIds.includes(scene.value)) {
            this.selectedSceneIds.push(scene.value)
            updated = true
          }
        }
      }
      if (updated) {
        this.$message.success('AI 识别成功，已自动填充')
      }
    },
    toggleScene(id) {
      const idx = this.selectedSceneIds.indexOf(id)
      if (idx >= 0) {
        this.selectedSceneIds.splice(idx, 1)
      } else {
        this.selectedSceneIds.push(id)
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
        message: '上传文件个数超出限制!最多上传9张图片!'
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
