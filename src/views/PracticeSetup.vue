<template>
  <div class="page-container">
    <!-- 顶部导航 -->
    <van-nav-bar
      title="举一反三"
      left-text="返回"
      fixed
      :z-index="100"
      @click-left="goBack"
    />

    <!-- 内容区域 -->
    <div class="content-area" style="padding-top: 46px;">
      <!-- 已选题目预览 -->
      <div class="selected-section">
        <div class="section-title">已选题目 ({{ selectedQuestions.length }}道)</div>
        <div class="question-scroll">
          <div
            v-for="(q, index) in selectedQuestions"
            :key="q.id"
            class="question-card"
          >
            <img :src="q.image_url" :alt="'题目' + (index + 1)" />
            <span class="card-index">{{ index + 1 }}</span>
          </div>
        </div>
      </div>

      <!-- 出题设置 -->
      <div class="settings-section">
        <van-cell-group inset>
          <van-field
            v-model="direction"
            label="出题方向"
            placeholder="如：同一知识点的变式题"
          />
          
          <van-field
            label="出题数量"
            readonly
          >
            <template #input>
              <van-stepper
                v-model="count"
                min="1"
                max="10"
                integer
              />
            </template>
          </van-field>
        </van-cell-group>
      </div>

      <!-- 出题说明 -->
      <div class="tips-section">
        <van-notice-bar text="AI将根据您选择的错题，生成相似或更难一些的练习题" />
      </div>

      <!-- 生成按钮 -->
      <div class="generate-section">
        <van-button
          type="primary"
          block
          round
          :loading="generating"
          :disabled="generating || selectedQuestions.length === 0"
          @click="generatePractice"
        >
          {{ generating ? '生成中...' : '生成练习' }}
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useUserStore } from '@/stores/user'
import { supabase } from '@/lib/supabase'
import { generateApi } from '@/lib/api'

const router = useRouter()
const userStore = useUserStore()

const selectedQuestionIds = ref([])
const selectedQuestions = ref([])
const direction = ref('')
const count = ref(3)
const generating = ref(false)

// 加载选中的题目
const loadSelectedQuestions = async () => {
  const savedIds = localStorage.getItem('selected_questions')
  if (!savedIds) {
    showToast('请先选择题目')
    router.back()
    return
  }
  
  try {
    selectedQuestionIds.value = JSON.parse(savedIds)
    
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .in('id', selectedQuestionIds.value)
    
    if (error) throw error
    selectedQuestions.value = data || []
  } catch (error) {
    console.error('加载题目失败:', error)
    showToast('加载题目失败')
  }
}

// 返回
const goBack = () => {
  router.back()
}

// 生成练习
const generatePractice = async () => {
  if (selectedQuestionIds.value.length === 0) {
    showToast('请先选择题目')
    return
  }
  
  generating.value = true
  
  try {
    const token = userStore.session?.access_token
    const result = await generateApi.generate(
      selectedQuestionIds.value,
      direction.value || '类似难度的练习题',
      count.value,
      token
    )
    
    if (result.success && result.practice) {
      // 保存练习ID到本地
      localStorage.setItem('current_practice', JSON.stringify(result.practice))
      showToast('生成成功')
      
      // 跳转到预览页面
      setTimeout(() => {
        router.push(`/practice-preview/${result.practice.id}`)
      }, 500)
    } else {
      throw new Error(result.error || '生成失败')
    }
  } catch (error) {
    console.error('生成练习失败:', error)
    showToast(error.message || '生成失败，请重试')
  } finally {
    generating.value = false
  }
}

onMounted(() => {
  loadSelectedQuestions()
})
</script>

<style scoped>
.selected-section {
  padding: 16px;
}

.section-title {
  font-size: 14px;
  color: #969799;
  margin-bottom: 12px;
}

.question-scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
  -webkit-overflow-scrolling: touch;
}

.question-scroll::-webkit-scrollbar {
  display: none;
}

.question-card {
  position: relative;
  flex-shrink: 0;
  width: 120px;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  background: #f7f8fa;
}

.question-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-index {
  position: absolute;
  top: 4px;
  left: 4px;
  background: rgba(25, 137, 250, 0.9);
  color: white;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
}

.settings-section {
  margin-top: 12px;
}

.tips-section {
  margin-top: 16px;
  padding: 0 16px;
}

.generate-section {
  margin-top: 24px;
  padding: 0 16px;
}
</style>
