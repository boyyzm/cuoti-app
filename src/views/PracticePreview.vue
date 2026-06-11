<template>
  <div class="page-container">
    <!-- 顶部导航 -->
    <van-nav-bar
      title="练习预览"
      left-text="返回"
      fixed
      :z-index="100"
      @click-left="goBack"
    >
      <template #right>
        <van-icon name="down" size="20" @click="exportPDF" />
      </template>
    </van-nav-bar>

    <!-- 内容区域 -->
    <div class="content-area" style="padding-top: 46px;">
      <!-- A4预览区域 -->
      <div class="paper-preview" ref="paperRef">
        <div class="paper-header">
          <h1>举一反三练习题</h1>
          <p class="date">{{ currentDate }}</p>
        </div>
        
        <div class="paper-content">
          <div
            v-for="(q, index) in practiceQuestions"
            :key="index"
            class="question-item"
            :class="q.type"
          >
            <div class="question-number">{{ index + 1 }}.</div>
            <div class="question-body">
              <div class="question-text">{{ q.content }}</div>
              
              <!-- 选择题选项 -->
              <div v-if="q.type === '选择题' && q.options" class="question-options">
                <div v-for="(opt, optIndex) in q.options" :key="optIndex" class="option-item">
                  {{ ['A', 'B', 'C', 'D'][optIndex] }}. {{ opt }}
                </div>
              </div>
              
              <!-- 应用题答题区域 -->
              <div v-if="q.type === '应用题'" class="answer-lines">
                <div v-for="n in (q.answer_lines || 4)" :key="n" class="answer-line"></div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="paper-footer">
          <p>姓名: ___________ &nbsp;&nbsp; 日期: ___________ &nbsp;&nbsp; 得分: ___________</p>
        </div>
      </div>
    </div>

    <!-- 底部操作 -->
    <div class="bottom-actions">
      <van-button type="primary" block round @click="exportPDF">
        <van-icon name="down" /> 导出PDF
      </van-button>
      <van-button type="default" block round style="margin-top: 12px;" @click="sharePractice">
        <van-icon name="share" /> 分享
      </van-button>
    </div>

    <!-- Loading -->
    <van-overlay :show="exporting">
      <div class="loading-wrapper">
        <van-loading type="spinner" color="#fff">正在导出...</van-loading>
      </div>
    </van-overlay>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { useUserStore } from '@/stores/user'
import { supabase } from '@/lib/supabase'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const practiceId = computed(() => route.params.id)
const practice = ref(null)
const practiceQuestions = ref([])
const paperRef = ref(null)
const exporting = ref(false)

const currentDate = computed(() => {
  return new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

// 加载练习数据
const loadPractice = async () => {
  try {
    // 先从本地存储尝试获取
    const savedPractice = localStorage.getItem('current_practice')
    if (savedPractice) {
      practice.value = JSON.parse(savedPractice)
      practiceQuestions.value = practice.value.generated_content?.questions || []
      return
    }
    
    // 从数据库加载
    const { data, error } = await supabase
      .from('practices')
      .select('*')
      .eq('id', practiceId.value)
      .eq('user_id', userStore.userId)
      .single()
    
    if (error) throw error
    practice.value = data
    practiceQuestions.value = data.generated_content?.questions || []
  } catch (error) {
    console.error('加载练习失败:', error)
    showToast('加载失败')
  }
}

// 返回
const goBack = () => {
  router.replace('/home')
}

// 导出PDF
const exportPDF = async () => {
  if (!paperRef.value) return
  
  exporting.value = true
  
  try {
    // 使用html2canvas将HTML转换为图片
    const canvas = await html2canvas(paperRef.value, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    })
    
    // 创建PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.95)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })
    
    // A4尺寸
    const pageWidth = 210
    const pageHeight = 297
    const margin = 15
    
    // 计算图片尺寸
    const imgWidth = pageWidth - margin * 2
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    
    // 添加图片（可能需要多页）
    let heightLeft = imgHeight
    let position = margin
    
    // 第一页
    pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight)
    heightLeft -= pageHeight - margin * 2
    
    // 后续页面
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin
      pdf.addPage()
      pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight)
      heightLeft -= pageHeight - margin * 2
    }
    
    // 保存PDF
    const fileName = `举一反三练习_${Date.now()}.pdf`
    pdf.save(fileName)
    
    showToast('导出成功')
  } catch (error) {
    console.error('导出PDF失败:', error)
    showToast('导出失败')
  } finally {
    exporting.value = false
  }
}

// 分享
const sharePractice = async () => {
  // 准备分享内容
  const shareData = {
    title: '举一反三练习题',
    text: '快来练习这道题吧！',
    url: window.location.href
  }
  
  // 使用Web Share API
  if (navigator.share) {
    try {
      await navigator.share(shareData)
    } catch (error) {
      if (error.name !== 'AbortError') {
        showToast('分享失败')
      }
    }
  } else {
    // 不支持时，显示提示
    showToast('请长按保存图片或导出PDF后分享')
  }
}

onMounted(() => {
  loadPractice()
})
</script>

<style scoped>
.content-area {
  padding: 16px;
  padding-bottom: 160px;
}

.paper-preview {
  background: white;
  padding: 40px 30px;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  font-family: 'SimSun', '宋体', serif;
  min-height: 800px;
}

.paper-header {
  text-align: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #333;
}

.paper-header h1 {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 10px;
}

.date {
  font-size: 14px;
  color: #666;
}

.paper-content {
  min-height: 500px;
}

.question-item {
  display: flex;
  margin-bottom: 20px;
  line-height: 1.8;
  font-size: 16px;
}

.question-number {
  font-weight: bold;
  margin-right: 8px;
  flex-shrink: 0;
}

.question-text {
  flex: 1;
}

.question-options {
  margin-top: 10px;
  padding-left: 24px;
}

.option-item {
  margin-bottom: 6px;
}

.answer-lines {
  margin-top: 16px;
  padding-left: 24px;
}

.answer-line {
  height: 30px;
  border-bottom: 1px solid #ccc;
  margin-bottom: 8px;
}

.paper-footer {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #333;
  text-align: center;
  font-size: 14px;
}

.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: #f7f8fa;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
}

.loading-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
