<template>
  <div class="page-container">
    <!-- 顶部导航 -->
    <van-nav-bar
      title="拍照上传"
      left-text="返回"
      fixed
      :z-index="100"
      @click-left="goBack"
    />

    <!-- 内容区域 -->
    <div class="content-area" style="padding-top: 46px;">
      <!-- 图片预览区域 -->
      <div class="preview-section">
        <div v-if="!imageData" class="preview-placeholder">
          <van-icon name="photograph" size="48" color="#c8c9cc" />
          <p>点击下方按钮选择图片</p>
        </div>
        <div v-else class="preview-image-wrapper" ref="previewWrapper">
          <img :src="imageData" alt="预览图片" class="preview-image" ref="previewImg" />
          <!-- 裁剪遮罩 -->
          <div 
            class="crop-mask"
            :style="cropMaskStyle"
          >
            <div class="crop-area" :style="cropAreaStyle">
              <div class="resize-handle top" @touchstart.stop="startResize('top', $event)"></div>
              <div class="resize-handle bottom" @touchstart.stop="startResize('bottom', $event)"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 裁剪控制 -->
      <div v-if="imageData" class="crop-section">
        <van-cell-group inset>
          <van-field
            label="裁剪顶部"
            readonly
          >
            <template #input>
              <van-slider
                v-model="cropTop"
                :min="0"
                :max="100"
                :step="1"
                active-color="#1989fa"
                @update:model-value="updateCropPreview"
              />
            </template>
          </van-field>
          <div class="slider-value">{{ cropTop }}%</div>
          
          <van-field
            label="裁剪底部"
            readonly
          >
            <template #input>
              <van-slider
                v-model="cropBottom"
                :min="0"
                :max="100"
                :step="1"
                active-color="#1989fa"
                @update:model-value="updateCropPreview"
              />
            </template>
          </van-field>
          <div class="slider-value">{{ cropBottom }}%</div>
        </van-cell-group>
        
        <div class="crop-actions">
          <van-button size="small" @click="resetCrop">重置</van-button>
          <van-button size="small" type="primary" @click="applyCrop">应用裁剪</van-button>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-section">
        <van-button-group>
          <van-button type="primary" icon="camera-o" @click="takePhoto">
            拍照
          </van-button>
          <van-button type="default" icon="photo-o" @click="chooseFromAlbum">
            相册
          </van-button>
        </van-button-group>
      </div>

      <!-- 文件夹选择 -->
      <div class="folder-section">
        <van-cell-group inset>
          <van-field
            label="保存到"
            readonly
            clickable
            :value="selectedFolderName"
            placeholder="选择文件夹"
            @click="showFolderPicker = true"
          >
            <template #right-icon>
              <van-icon name="arrow-down" />
            </template>
          </van-field>
        </van-cell-group>
      </div>

      <!-- 提取按钮 -->
      <div class="extract-section" v-if="imageData && selectedFolderId">
        <van-button 
          type="primary" 
          block 
          round 
          :loading="extracting"
          :disabled="extracting"
          @click="extractQuestions"
        >
          {{ extracting ? '正在识别...' : '提取题目' }}
        </van-button>
      </div>

      <!-- 识别结果 -->
      <div v-if="extractedQuestions.length > 0" class="result-section">
        <div class="result-title">
          识别到 {{ extractedQuestions.length }} 道题目
        </div>
        <div
          v-for="(q, index) in extractedQuestions"
          :key="index"
          class="result-item"
        >
          <div class="result-header">
            <span class="question-number">第{{ index + 1 }}题</span>
            <span class="question-type">{{ q.question_type || '未知类型' }}</span>
          </div>
          <div class="result-content">{{ q.extracted_text }}</div>
        </div>
        
        <van-button 
          type="primary" 
          block 
          round 
          style="margin-top: 16px;"
          @click="saveQuestions"
        >
          保存题目
        </van-button>
      </div>
    </div>

    <!-- 文件夹选择器 -->
    <van-popup v-model:show="showFolderPicker" position="bottom" round>
      <van-picker
        title="选择文件夹"
        :columns="folderColumns"
        @confirm="onFolderConfirm"
        @cancel="showFolderPicker = false"
      />
    </van-popup>

    <!-- 隐藏的文件输入 -->
    <input
      type="file"
      ref="fileInput"
      accept="image/*"
      capture="environment"
      style="display: none;"
      @change="onFileSelected"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useUserStore } from '@/stores/user'
import { supabase } from '@/lib/supabase'
import { extractApi } from '@/lib/api'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const imageData = ref('')
const originalImage = ref('') // 保存原始图片
const cropTop = ref(0)
const cropBottom = ref(100)
const selectedFolderId = ref('')
const selectedFolderName = ref('')
const folders = ref([])
const extractedQuestions = ref([])
const extracting = ref(false)
const showFolderPicker = ref(false)
const fileInput = ref(null)
const previewImg = ref(null)
const previewWrapper = ref(null)

// 裁剪相关状态
const isResizing = ref(false)
const resizeTarget = ref('')
const startY = ref(0)
const startValue = ref(0)

// 裁剪遮罩样式
const cropMaskStyle = computed(() => ({
  '--mask-top': cropTop.value + '%',
  '--mask-bottom': (100 - cropBottom.value) + '%'
}))

const cropAreaStyle = computed(() => ({
  top: cropTop.value + '%',
  bottom: (100 - cropBottom.value) + '%'
}))

// 文件夹列表
const folderColumns = computed(() => {
  return folders.value.map(f => ({ text: f.name, value: f.id }))
})

// 加载文件夹列表
const loadFolders = async () => {
  try {
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', userStore.userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    folders.value = data || []
    
    // 默认选择第一个文件夹
    if (folders.value.length > 0) {
      const queryFolder = route.query.folder
      const folder = folders.value.find(f => f.id === queryFolder) || folders.value[0]
      selectedFolderId.value = folder.id
      selectedFolderName.value = folder.name
    }
  } catch (error) {
    console.error('加载文件夹失败:', error)
  }
}

// 返回
const goBack = () => {
  router.back()
}

// 拍照
const takePhoto = () => {
  if (fileInput.value) {
    fileInput.value.setAttribute('capture', 'environment')
    fileInput.value.click()
  }
}

// 从相册选择
const chooseFromAlbum = () => {
  if (fileInput.value) {
    fileInput.value.removeAttribute('capture')
    fileInput.value.click()
  }
}

// 文件选择处理
const onFileSelected = (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  
  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    showToast('请选择图片文件')
    return
  }
  
  // 压缩并转为base64
  const reader = new FileReader()
  reader.onload = (e) => {
    compressImage(e.target.result, (dataUrl) => {
      imageData.value = dataUrl
      originalImage.value = dataUrl
      cropTop.value = 0
      cropBottom.value = 100
      extractedQuestions.value = []
    })
  }
  reader.readAsDataURL(file)
}

// 图片压缩
const compressImage = (dataUrl, callback) => {
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    // 计算压缩后的尺寸
    const maxWidth = 1920
    let width = img.width
    let height = img.height
    
    if (width > maxWidth) {
      height = (height * maxWidth) / width
      width = maxWidth
    }
    
    canvas.width = width
    canvas.height = height
    ctx.drawImage(img, 0, 0, width, height)
    
    callback(canvas.toDataURL('image/jpeg', 0.8))
  }
  img.src = dataUrl
}

// 更新裁剪预览
const updateCropPreview = () => {
  // 确保顶部不超过底部
  if (cropTop.value >= cropBottom.value) {
    if (resizeTarget.value === 'top') {
      cropTop.value = cropBottom.value - 5
    } else {
      cropBottom.value = cropTop.value + 5
    }
  }
}

// 重置裁剪
const resetCrop = () => {
  cropTop.value = 0
  cropBottom.value = 100
}

// 开始拖拽调整
const startResize = (target, event) => {
  isResizing.value = true
  resizeTarget.value = target
  startY.value = event.touches[0].clientY
  startValue.value = target === 'top' ? cropTop.value : cropBottom.value
  
  document.addEventListener('touchmove', handleResize)
  document.addEventListener('touchend', stopResize)
}

const handleResize = (event) => {
  if (!isResizing.value) return
  
  const deltaY = event.touches[0].clientY - startY.value
  const wrapper = previewWrapper.value
  if (!wrapper) return
  
  const deltaPercent = (deltaY / wrapper.offsetHeight) * 100
  
  if (resizeTarget.value === 'top') {
    cropTop.value = Math.max(0, Math.min(100, startValue.value + deltaPercent))
    cropTop.value = Math.min(cropTop.value, cropBottom.value - 5)
  } else {
    cropBottom.value = Math.max(0, Math.min(100, startValue.value + deltaPercent))
    cropBottom.value = Math.max(cropBottom.value, cropTop.value + 5)
  }
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('touchmove', handleResize)
  document.removeEventListener('touchend', stopResize)
}

// 应用裁剪
const applyCrop = () => {
  if (!originalImage.value) return
  
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    const top = Math.round((cropTop.value / 100) * img.height)
    const bottom = Math.round((cropBottom.value / 100) * img.height)
    const height = bottom - top
    
    canvas.width = img.width
    canvas.height = height
    
    ctx.drawImage(img, 0, top, img.width, height, 0, 0, img.width, height)
    
    imageData.value = canvas.toDataURL('image/jpeg', 0.9)
    showToast('裁剪成功')
  }
  img.src = originalImage.value
}

// 文件夹选择确认
const onFolderConfirm = ({ selectedOptions }) => {
  selectedFolderId.value = selectedOptions[0].value
  selectedFolderName.value = selectedOptions[0].text
  showFolderPicker.value = false
}

// 提取题目
const extractQuestions = async () => {
  if (!imageData.value || !selectedFolderId.value) {
    showToast('请选择图片和文件夹')
    return
  }
  
  extracting.value = true
  extractedQuestions.value = []
  
  try {
    const token = userStore.session?.access_token
    const result = await extractApi.extract(imageData.value, selectedFolderId.value, token)
    
    if (result.success && result.questions) {
      extractedQuestions.value = result.questions
      showToast(`识别到 ${result.questions.length} 道题目`)
    } else {
      throw new Error(result.error || '识别失败')
    }
  } catch (error) {
    console.error('提取题目失败:', error)
    showToast(error.message || '识别失败，请重试')
  } finally {
    extracting.value = false
  }
}

// 保存题目
const saveQuestions = async () => {
  if (extractedQuestions.value.length === 0) return
  
  try {
    // 保存每道题目到数据库
    for (const q of extractedQuestions.value) {
      const { error } = await supabase
        .from('questions')
        .insert({
          user_id: userStore.userId,
          folder_id: selectedFolderId.value,
          image_url: imageData.value, // 保存当前裁剪后的图片
          extracted_text: q.extracted_text,
          question_type: q.question_type
        })
      
      if (error) {
        console.error('保存题目失败:', error)
      }
    }
    
    showToast('保存成功')
    
    // 跳转到文件夹
    setTimeout(() => {
      router.replace(`/folder/${selectedFolderId.value}`)
    }, 1000)
  } catch (error) {
    console.error('保存失败:', error)
    showToast('保存失败')
  }
}

onMounted(() => {
  // 检查是否有传入的图片
  const queryImage = route.query.image
  if (queryImage) {
    imageData.value = queryImage
    originalImage.value = queryImage
  }
  
  loadFolders()
})
</script>

<style scoped>
.preview-section {
  padding: 16px;
  background: white;
}

.preview-placeholder {
  height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f7f8fa;
  border-radius: 8px;
  color: #c8c9cc;
}

.preview-image-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
}

.preview-image {
  max-width: 100%;
  max-height: 400px;
  border-radius: 8px;
}

.crop-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  pointer-events: none;
  /* 使用clip-path创建透明区域 */
  clip-path: polygon(
    0 0,
    100% 0,
    100% var(--mask-top),
    0 var(--mask-top),
    0 var(--mask-bottom),
    100% var(--mask-bottom),
    100% 100%,
    0 100%
  );
}

.crop-area {
  position: absolute;
  left: 0;
  right: 0;
  border: 2px solid #1989fa;
  background: transparent;
  pointer-events: auto;
}

.resize-handle {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 50px;
  height: 20px;
  background: #1989fa;
  border-radius: 4px;
  cursor: ns-resize;
}

.resize-handle.top {
  top: -10px;
}

.resize-handle.bottom {
  bottom: -10px;
}

.crop-section {
  margin-top: 12px;
}

.slider-value {
  text-align: center;
  font-size: 12px;
  color: #969799;
  padding: 4px 0;
}

.crop-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 12px;
}

.action-section {
  padding: 16px;
  display: flex;
  gap: 12px;
}

.action-section .van-button {
  flex: 1;
}

.folder-section {
  margin-top: 12px;
}

.extract-section {
  padding: 16px;
  margin-top: 12px;
}

.result-section {
  padding: 16px;
  margin-top: 12px;
}

.result-title {
  font-size: 14px;
  color: #323233;
  font-weight: 500;
  margin-bottom: 12px;
}

.result-item {
  background: white;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.question-number {
  font-weight: 500;
  color: #1989fa;
}

.question-type {
  font-size: 12px;
  color: #969799;
  background: #f7f8fa;
  padding: 2px 8px;
  border-radius: 4px;
}

.result-content {
  font-size: 14px;
  color: #323233;
  line-height: 1.6;
  white-space: pre-wrap;
}
</style>
