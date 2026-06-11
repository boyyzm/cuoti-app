<template>
  <div class="page-container">
    <!-- 顶部导航 -->
    <van-nav-bar
      title="我的错题本"
      left-text=""
      :fixed="true"
      :z-index="100"
    >
      <template #right>
        <van-icon 
          v-if="userStore.isAdmin" 
          name="setting-o" 
          size="20" 
          @click="goToAdmin"
        />
      </template>
    </van-nav-bar>

    <!-- 下拉刷新 -->
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh" style="padding-top: 46px;">
      <!-- 空状态 -->
      <div v-if="folders.length === 0 && !loading" class="empty-state">
        <div class="icon">📁</div>
        <p>还没有文件夹</p>
        <p style="font-size: 12px; margin-top: 8px;">点击下方按钮创建第一个文件夹</p>
      </div>

      <!-- 文件夹列表 -->
      <div v-else class="folder-list">
        <FolderCard
          v-for="folder in folders"
          :key="folder.id"
          :folder="folder"
          @click="goToFolder(folder)"
          @long-press="enterSelectMode(folder)"
        />
      </div>
    </van-pull-refresh>

    <!-- 新建文件夹按钮 -->
    <div class="action-bar">
      <van-button 
        type="default" 
        block 
        round 
        @click="showNewFolderDialog = true"
        style="margin-bottom: 12px;"
      >
        <van-icon name="plus" /> 新建文件夹
      </van-button>
    </div>

    <!-- 悬浮拍照按钮 -->
    <FloatingButton @photo-taken="handlePhotoTaken" />

    <!-- 新建文件夹弹窗 -->
    <van-dialog
      v-model:show="showNewFolderDialog"
      title="新建文件夹"
      show-cancel-button
      @confirm="createFolder"
    >
      <van-field
        v-model="newFolderName"
        placeholder="请输入文件夹名称"
        input-align="center"
        style="margin: 16px 0;"
      />
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showDialog } from 'vant'
import { useUserStore } from '@/stores/user'
import { supabase } from '@/lib/supabase'
import FolderCard from '@/components/FolderCard.vue'
import FloatingButton from '@/components/FloatingButton.vue'

const router = useRouter()
const userStore = useUserStore()

const folders = ref([])
const loading = ref(false)
const refreshing = ref(false)
const showNewFolderDialog = ref(false)
const newFolderName = ref('')

// 加载文件夹列表
const loadFolders = async () => {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('folders')
      .select(`
        *,
        questions:questions(count)
      `)
      .is('parent_id', null)
      .eq('user_id', userStore.userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // 处理题目数量
    folders.value = (data || []).map(folder => ({
      ...folder,
      questionCount: folder.questions?.[0]?.count || 0
    }))
  } catch (error) {
    console.error('加载文件夹失败:', error)
    showToast('加载失败')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

// 下拉刷新
const onRefresh = () => {
  loadFolders()
}

// 创建文件夹
const createFolder = async () => {
  if (!newFolderName.value.trim()) {
    showToast('请输入文件夹名称')
    return
  }
  
  try {
    const { error } = await supabase
      .from('folders')
      .insert({
        user_id: userStore.userId,
        name: newFolderName.value.trim()
      })
    
    if (error) throw error
    
    showToast('创建成功')
    newFolderName.value = ''
    loadFolders()
  } catch (error) {
    console.error('创建文件夹失败:', error)
    showToast('创建失败')
  }
}

// 跳转到文件夹详情
const goToFolder = (folder) => {
  router.push(`/folder/${folder.id}`)
}

// 进入选择模式（长按）
const enterSelectMode = (folder) => {
  showDialog({
    title: folder.name,
    message: '1. 重命名\n2. 删除',
    showCancelButton: true,
    confirmButtonText: '重命名',
    cancelButtonText: '删除',
  }).then(() => {
    // 重命名
    showRenameDialog(folder)
  }).catch(() => {
    // 删除
    deleteFolder(folder)
  })
}

// 重命名文件夹
const showRenameDialog = async (folder) => {
  const { value } = await showDialog({
    title: '重命名文件夹',
    showCancelButton: true,
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    message: '',
    render: () => {
      const input = document.createElement('input')
      input.value = folder.name
      input.className = 'van-field__control'
      input.placeholder = '请输入新名称'
      return input
    }
  })
}

// 删除文件夹
const deleteFolder = async (folder) => {
  try {
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', folder.id)
    
    if (error) throw error
    
    showToast('删除成功')
    loadFolders()
  } catch (error) {
    console.error('删除文件夹失败:', error)
    showToast('删除失败')
  }
}

// 跳转到管理页面
const goToAdmin = () => {
  router.push('/admin')
}

// 处理拍照
const handlePhotoTaken = (imageData) => {
  router.push({
    path: '/photo-upload',
    query: { image: imageData }
  })
}

onMounted(() => {
  loadFolders()
})
</script>

<style scoped>
.folder-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  padding: 12px;
}

.action-bar {
  position: fixed;
  bottom: 90px;
  left: 16px;
  right: 16px;
  z-index: 90;
}
</style>
