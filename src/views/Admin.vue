<template>
  <div class="page-container">
    <!-- 顶部导航 -->
    <van-nav-bar
      title="用户管理"
      left-text="返回"
      fixed
      :z-index="100"
      @click-left="goBack"
    />

    <!-- 内容区域 -->
    <div class="content-area" style="padding-top: 46px;">
      <!-- 用户列表 -->
      <div class="user-list">
        <van-cell-group inset>
          <van-cell
            v-for="user in users"
            :key="user.id"
            :title="user.username"
            :label="'创建时间: ' + formatDate(user.created_at)"
            center
          >
            <template #right-icon>
              <van-button
                v-if="user.username !== 'admin'"
                size="small"
                type="danger"
                plain
                @click="confirmDelete(user)"
              >
                删除
              </van-button>
            </template>
          </van-cell>
        </van-cell-group>
      </div>

      <!-- 空状态 -->
      <div v-if="users.length === 0 && !loading" class="empty-state">
        <div class="icon">👥</div>
        <p>暂无其他用户</p>
      </div>
    </div>

    <!-- 底部新建按钮 -->
    <div class="bottom-action">
      <van-button type="primary" block round @click="showCreateDialog = true">
        <van-icon name="plus" /> 新建用户
      </van-button>
    </div>

    <!-- 新建用户弹窗 -->
    <van-dialog
      v-model:show="showCreateDialog"
      title="新建用户"
      show-cancel-button
      :before-close="handleCreate"
    >
      <van-field
        v-model="newUsername"
        label="用户名"
        placeholder="请输入用户名"
        style="margin: 16px 0;"
      />
      <van-field
        v-model="newPassword"
        type="password"
        label="密码"
        placeholder="留空使用默认密码123456"
        style="margin: 0 0 16px 0;"
      />
    </van-dialog>

    <!-- 删除确认弹窗 -->
    <van-dialog
      v-model:show="showDeleteDialog"
      title="确认删除"
      show-cancel-button
      :before-close="handleDelete"
    >
      <div style="padding: 16px; text-align: center;">
        确定要删除用户 <strong>{{ userToDelete?.username }}</strong> 吗？<br/>
        此操作不可恢复。
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { useUserStore } from '@/stores/user'
import { adminApi } from '@/lib/api'

const router = useRouter()
const userStore = useUserStore()

const users = ref([])
const loading = ref(false)
const showCreateDialog = ref(false)
const showDeleteDialog = ref(false)
const newUsername = ref('')
const newPassword = ref('')
const userToDelete = ref(null)

// 加载用户列表
const loadUsers = async () => {
  loading.value = true
  try {
    const token = userStore.session?.access_token
    const result = await adminApi.getUsers(token)
    
    if (result.success) {
      users.value = result.users || []
    } else {
      throw new Error(result.error)
    }
  } catch (error) {
    console.error('加载用户失败:', error)
    showToast('加载失败')
  } finally {
    loading.value = false
  }
}

// 返回
const goBack = () => {
  router.back()
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// 新建用户
const handleCreate = async (action) => {
  if (action === 'cancel') return true
  
  if (!newUsername.value.trim()) {
    showToast('请输入用户名')
    return false
  }
  
  // 用户名只能是字母数字下划线
  if (!/^[a-zA-Z0-9_]+$/.test(newUsername.value)) {
    showToast('用户名只能包含字母、数字和下划线')
    return false
  }
  
  try {
    const token = userStore.session?.access_token
    const password = newPassword.value || undefined // 使用undefined表示默认密码
    
    const result = await adminApi.createUser(newUsername.value, password, token)
    
    if (result.success) {
      showToast('创建成功')
      newUsername.value = ''
      newPassword.value = ''
      loadUsers()
      return true
    } else {
      showToast(result.error || '创建失败')
      return false
    }
  } catch (error) {
    console.error('创建用户失败:', error)
    showToast('创建失败')
    return false
  }
}

// 确认删除
const confirmDelete = async (user) => {
  userToDelete.value = user
  showDeleteDialog.value = true
}

// 删除用户
const handleDelete = async (action) => {
  if (action === 'cancel') return true
  
  if (!userToDelete.value) return true
  
  try {
    const token = userStore.session?.access_token
    const result = await adminApi.deleteUser(userToDelete.value.id, token)
    
    if (result.success) {
      showToast('删除成功')
      loadUsers()
    } else {
      showToast(result.error || '删除失败')
    }
  } catch (error) {
    console.error('删除用户失败:', error)
    showToast('删除失败')
  } finally {
    userToDelete.value = null
    return true
  }
}

onMounted(() => {
  // 检查管理员权限
  if (!userStore.isAdmin) {
    showToast('无权限访问')
    router.back()
    return
  }
  
  loadUsers()
})
</script>

<style scoped>
.user-list {
  margin-bottom: 20px;
}

.bottom-action {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: #f7f8fa;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
}
</style>
