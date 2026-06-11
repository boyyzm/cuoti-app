<template>
  <div class="floating-button" @click="handleClick">
    <van-icon name="photograph" size="24" color="#fff" />
    
    <!-- 操作菜单 -->
    <van-action-sheet
      v-model:show="showActions"
      :actions="actions"
      cancel-text="取消"
      @select="onSelect"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { showToast } from 'vant'

const emit = defineEmits(['photo-taken'])

const showActions = ref(false)

const actions = [
  { name: '拍照', value: 'camera' },
  { name: '从相册选择', value: 'album' }
]

const handleClick = () => {
  showActions.value = true
}

const onSelect = (action) => {
  showActions.value = false
  
  if (action.value === 'camera') {
    takePhoto()
  } else if (action.value === 'album') {
    chooseFromAlbum()
  }
}

// 拍照
const takePhoto = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.capture = 'environment'
  input.onchange = (e) => handleFile(e.target.files?.[0])
  input.click()
}

// 从相册选择
const chooseFromAlbum = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e) => handleFile(e.target.files?.[0])
  input.click()
}

// 处理文件
const handleFile = (file) => {
  if (!file) return
  
  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    showToast('请选择图片文件')
    return
  }
  
  // 验证文件大小（最大10MB）
  if (file.size > 10 * 1024 * 1024) {
    showToast('图片大小不能超过10MB')
    return
  }
  
  // 压缩并转为base64
  const reader = new FileReader()
  reader.onload = (e) => {
    compressImage(e.target.result, (dataUrl) => {
      emit('photo-taken', dataUrl)
    })
  }
  reader.readAsDataURL(file)
}

// 压缩图片
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
</script>

<style scoped>
.floating-button {
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #1989fa 0%, #4facfe 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(25, 137, 250, 0.4);
  z-index: 100;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.floating-button:active {
  transform: scale(0.95);
  box-shadow: 0 2px 8px rgba(25, 137, 250, 0.3);
}
</style>
