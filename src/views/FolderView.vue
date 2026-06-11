<template>
  <div class="page-container">
    <!-- 顶部导航 -->
    <van-nav-bar
      :title="folderName"
      left-text="返回"
      fixed
      :z-index="100"
      @click-left="goBack"
    >
      <template #right>
        <van-popover
          v-model:show="showMenu"
          :actions="menuActions"
          @select="onMenuSelect"
          placement="bottom-end"
        >
          <template #reference>
            <van-icon name="ellipsis" size="20" />
          </template>
        </van-popover>
      </template>
    </van-nav-bar>

    <!-- 内容区域 -->
    <div class="content-area" style="padding-top: 46px;">
      <!-- 子文件夹列表 -->
      <div v-if="subFolders.length > 0" class="section">
        <div class="section-title">子文件夹</div>
        <FolderCard
          v-for="subFolder in subFolders"
          :key="subFolder.id"
          :folder="subFolder"
          @click="goToSubFolder(subFolder)"
        />
      </div>

      <!-- 题目网格 -->
      <div v-if="questions.length > 0" class="section">
        <div class="section-title">
          题目 ({{ questions.length }})
          <span v-if="selectedQuestions.length > 0" class="selected-count">
            已选 {{ selectedQuestions.length }} 道
          </span>
        </div>
        <van-grid :column="2" :gutter="8" class="question-grid">
          <van-grid-item v-for="q in questions" :key="q.id">
            <div
              class="question-item"
              :class="{ selected: selectedQuestions.includes(q.id) }"
              @click="toggleSelect(q.id)"
              @longpress="toggleSelect(q.id)"
            >
              <img 
                :src="q.image_url" 
                :alt="'题目' + q.id" 
                class="question-thumb"
                @click.stop="previewImage(q)"
              />
              <div class="question-overlay">
                <van-icon 
                  :name="selectedQuestions.includes(q.id) ? 'success' : 'circle'" 
                  :color="selectedQuestions.includes(q.id) ? '#1989fa' : '#fff'"
                />
              </div>
            </div>
          </van-grid-item>
        </van-grid>
      </div>

      <!-- 空状态 -->
      <div v-if="subFolders.length === 0 && questions.length === 0 && !loading" class="empty-state">
        <div class="icon">📷</div>
        <p>还没有题目</p>
        <p style="font-size: 12px; margin-top: 8px;">点击下方按钮拍摄错题</p>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="bottom-bar" v-if="selectedQuestions.length > 0">
      <van-button type="primary" block round @click="startPractice">
        组卷练习 ({{ selectedQuestions.length }}道)
      </van-button>
    </div>

    <!-- 新建子文件夹按钮 -->
    <div class="action-bar" v-if="selectedQuestions.length === 0">
      <van-button 
        type="default" 
        block 
        round 
        @click="showNewFolderDialog = true"
        style="margin-bottom: 12px;"
      >
        <van-icon name="plus" /> 新建子文件夹
      </van-button>
    </div>

    <!-- 悬浮拍照按钮 -->
    <FloatingButton @photo-taken="handlePhotoTaken" />

    <!-- 新建文件夹弹窗 -->
    <van-dialog
      v-model:show="showNewFolderDialog"
      title="新建子文件夹"
      show-cancel-button
      @confirm="createSubFolder"
    >
      <van-field
        v-model="newFolderName"
        placeholder="请输入文件夹名称"
        input-align="center"
        style="margin: 16px 0;"
      />
    </van-dialog>

    <!-- 图片预览 -->
    <van-image-preview
      v-model:show="showImagePreview"
      :images="previewImages"
      :start-position="previewIndex"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { useUserStore } from '@/stores/user'
import { supabase } from '@/lib/supabase'
import FolderCard from '@/components/FolderCard.vue'
import FloatingButton from '@/components/FloatingButton.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const folderId = computed(() => route.params.id)

const folderName = ref('文件夹')
const subFolders = ref([])
const questions = ref([])
const selectedQuestions = ref([])
const loading = ref(false)
const showMenu = ref(false)
const showNewFolderDialog = ref(false)
const newFolderName = ref('')
const showImagePreview = ref(false)
const previewImages = ref([])
const previewIndex = ref(0)

const menuActions = [
  { text: '重命名', value: 'rename' },
  { text: '删除', value: 'delete' }
]

// 加载文件夹数据
const loadData = async () => {
  loading.value = true
  try {
    // 加载文件夹信息
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('*')
      .eq('id', folderId.value)
      .single()
    
    if (folderError) throw folderError
    folderName.value = folder.name
    
    // 加载子文件夹
    const { data: subs, error: subsError } = await supabase
      .from('folders')
      .select(`
        *,
        questions:questions(count)
      `)
      .eq('parent_id', folderId.value)
      .eq('user_id', userStore.userId)
    
    if (subsError) throw subsError
    subFolders.value = (subs || []).map(f => ({
      ...f,
      questionCount: f.questions?.[0]?.count || 0
    }))
    
    // 加载题目
    const { data: questionsData, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('folder_id', folderId.value)
      .eq('user_id', userStore.userId)
      .order('created_at', { ascending: false })
    
    if (questionsError) throw questionsError
    questions.value = questionsData || []
  } catch (error) {
    console.error('加载数据失败:', error)
    showToast('加载失败')
  } finally {
    loading.value = false
  }
}

// 返回
const goBack = () => {
  router.back()
}

// 跳转到子文件夹
const goToSubFolder = (folder) => {
  router.push(`/folder/${folder.id}`)
}

// 菜单选择
const onMenuSelect = async (action) => {
  if (action.value === 'rename') {
    // 重命名逻辑
    const name = prompt('请输入新名称:', folderName.value)
    if (name && name !== folderName.value) {
      await renameFolder(name)
    }
  } else if (action.value === 'delete') {
    // 删除确认
    await showConfirmDialog({
      title: '确认删除',
      message: '确定要删除这个文件夹及其所有内容吗？'
    })
    await deleteFolder()
  }
}

// 重命名文件夹
const renameFolder = async (newName) => {
  try {
    const { error } = await supabase
      .from('folders')
      .update({ name: newName, updated_at: new Date().toISOString() })
      .eq('id', folderId.value)
    
    if (error) throw error
    folderName.value = newName
    showToast('重命名成功')
  } catch (error) {
    console.error('重命名失败:', error)
    showToast('重命名失败')
  }
}

// 删除文件夹
const deleteFolder = async () => {
  try {
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', folderId.value)
    
    if (error) throw error
    showToast('删除成功')
    router.back()
  } catch (error) {
    console.error('删除失败:', error)
    showToast('删除失败')
  }
}

// 创建子文件夹
const createSubFolder = async () => {
  if (!newFolderName.value.trim()) {
    showToast('请输入文件夹名称')
    return
  }
  
  try {
    const { error } = await supabase
      .from('folders')
      .insert({
        user_id: userStore.userId,
        name: newFolderName.value.trim(),
        parent_id: folderId.value
      })
    
    if (error) throw error
    
    showToast('创建成功')
    newFolderName.value = ''
    loadData()
  } catch (error) {
    console.error('创建子文件夹失败:', error)
    showToast('创建失败')
  }
}

// 切换选择
const toggleSelect = (questionId) => {
  const index = selectedQuestions.value.indexOf(questionId)
  if (index > -1) {
    selectedQuestions.value.splice(index, 1)
  } else {
    selectedQuestions.value.push(questionId)
  }
}

// 预览图片
const previewImage = (question) => {
  previewImages.value = [question.image_url]
  previewIndex.value = 0
  showImagePreview.value = true
}

// 开始练习
const startPractice = () => {
  // 将选中的题目保存到本地存储
  localStorage.setItem('selected_questions', JSON.stringify(selectedQuestions.value))
  router.push('/practice-setup')
}

// 处理拍照
const handlePhotoTaken = (imageData) => {
  router.push({
    path: '/photo-upload',
    query: { 
      image: imageData,
      folder: folderId.value
    }
  })
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.section {
  padding: 12px;
}

.section-title {
  font-size: 14px;
  color: #969799;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.selected-count {
  color: #1989fa;
  font-size: 12px;
}

.question-grid {
  background: transparent;
}

.question-item {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background: #f7f8fa;
}

.question-item.selected {
  border: 2px solid #1989fa;
}

.question-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.question-overlay {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bottom-bar {
  position: fixed;
  bottom: 90px;
  left: 16px;
  right: 16px;
  z-index: 90;
}

.action-bar {
  position: fixed;
  bottom: 90px;
  left: 16px;
  right: 16px;
  z-index: 90;
}
</style>
