<template>
  <van-overlay :show="show" @click="handleClose">
    <div class="cropper-container" @click.stop>
      <div class="cropper-header">
        <span class="cancel-btn" @click="handleClose">取消</span>
        <span class="title">裁剪图片</span>
        <span class="confirm-btn" @click="handleConfirm">确定</span>
      </div>
      
      <div class="cropper-body">
        <div class="cropper-wrapper" ref="wrapperRef">
          <img :src="imageSrc" ref="imageRef" alt="待裁剪图片" />
          <div
            class="crop-overlay"
            :style="cropStyle"
            @touchstart="onTouchStart"
            @touchmove="onTouchMove"
            @touchend="onTouchEnd"
          >
            <div class="crop-box" :style="cropBoxStyle">
              <div class="top-handle"></div>
              <div class="bottom-handle"></div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="cropper-footer">
        <div class="slider-group">
          <div class="slider-item">
            <span>顶部</span>
            <van-slider
              v-model="topPercent"
              :min="0"
              :max="100"
              :step="1"
              active-color="#1989fa"
            />
            <span>{{ topPercent }}%</span>
          </div>
          <div class="slider-item">
            <span>底部</span>
            <van-slider
              v-model="bottomPercent"
              :min="0"
              :max="100"
              :step="1"
              active-color="#1989fa"
            />
            <span>{{ bottomPercent }}%</span>
          </div>
        </div>
      </div>
    </div>
  </van-overlay>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  imageSrc: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'confirm'])

const topPercent = ref(0)
const bottomPercent = ref(100)

const wrapperRef = ref(null)
const imageRef = ref(null)

// 裁剪框样式
const cropStyle = computed(() => ({
  '--top-percent': topPercent.value + '%',
  '--bottom-percent': (100 - bottomPercent.value) + '%'
}))

const cropBoxStyle = computed(() => ({
  top: topPercent.value + '%',
  bottom: (100 - bottomPercent.value) + '%'
}))

// 监听显示状态，重置值
watch(() => props.show, (newVal) => {
  if (newVal) {
    topPercent.value = 0
    bottomPercent.value = 100
  }
})

// 关闭
const handleClose = () => {
  emit('close')
}

// 确认裁剪
const handleConfirm = () => {
  // 使用canvas裁剪图片
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const img = new Image()
  
  img.onload = () => {
    const imgHeight = img.height
    const top = Math.round((topPercent.value / 100) * imgHeight)
    const bottom = Math.round((bottomPercent.value / 100) * imgHeight)
    const height = bottom - top
    
    canvas.width = img.width
    canvas.height = height
    
    ctx.drawImage(img, 0, top, img.width, height, 0, 0, img.width, height)
    
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9)
    emit('confirm', croppedDataUrl)
  }
  
  img.src = props.imageSrc
}

// 触摸事件处理（简单实现，实际可用更复杂的拖拽逻辑）
const onTouchStart = () => {}

const onTouchMove = () => {}

const onTouchEnd = () => {}
</script>

<style scoped>
.cropper-container {
  width: 100%;
  height: 100%;
  background: #000;
  display: flex;
  flex-direction: column;
}

.cropper-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
}

.cancel-btn {
  font-size: 14px;
  cursor: pointer;
}

.title {
  font-size: 16px;
  font-weight: 500;
}

.confirm-btn {
  font-size: 14px;
  color: #1989fa;
  cursor: pointer;
}

.cropper-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.cropper-wrapper {
  position: relative;
  max-width: 100%;
  max-height: 100%;
}

.cropper-wrapper img {
  max-width: 100%;
  max-height: 60vh;
  display: block;
}

.crop-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
}

.crop-box {
  position: absolute;
  left: 0;
  right: 0;
  background: transparent;
  border: 2px solid #1989fa;
}

.top-handle,
.bottom-handle {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 20px;
  background: #1989fa;
  border-radius: 4px;
  cursor: ns-resize;
}

.top-handle {
  top: -10px;
}

.bottom-handle {
  bottom: -10px;
}

.cropper-footer {
  padding: 16px;
  background: rgba(0, 0, 0, 0.8);
}

.slider-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.slider-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slider-item span {
  color: white;
  font-size: 14px;
  width: 40px;
}

.slider-item .van-slider {
  flex: 1;
}
</style>
