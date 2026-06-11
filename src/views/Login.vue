<template>
  <div class="login-page">
    <div class="login-card">
      <!-- Logo区域 -->
      <div class="logo-area">
        <div class="logo">
          <svg viewBox="0 0 100 100" class="logo-svg">
            <defs>
              <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#1989fa" />
                <stop offset="100%" style="stop-color:#4facfe" />
              </linearGradient>
            </defs>
            <rect width="100" height="100" rx="20" fill="url(#logoGrad)"/>
            <text x="50" y="60" font-family="Arial" font-size="40" fill="white" text-anchor="middle">✎</text>
          </svg>
        </div>
        <h1 class="app-name">错题举一反三</h1>
        <p class="app-desc">AI智能出题，轻松举一反三</p>
      </div>

      <!-- 登录表单 -->
      <van-form @submit="handleLogin">
        <van-cell-group inset>
          <van-field
            v-model="username"
            name="username"
            label=""
            placeholder="请输入用户名"
            :rules="[{ required: true, message: '请输入用户名' }]"
          >
            <template #left-icon>
              <van-icon name="user-o" />
            </template>
          </van-field>
          
          <van-field
            v-model="password"
            type="password"
            name="password"
            label=""
            placeholder="请输入密码"
            :rules="[{ required: true, message: '请输入密码' }]"
          >
            <template #left-icon>
              <van-icon name="lock" />
            </template>
          </van-field>
        </van-cell-group>

        <div style="margin: 16px;">
          <van-button
            round
            block
            type="primary"
            native-type="submit"
            :loading="loading"
            loading-text="登录中..."
          >
            登 录
          </van-button>
        </div>
      </van-form>

      <!-- 底部提示 -->
      <div class="login-tip">
        <p>管理员请使用管理员账号登录</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const username = ref('')
const password = ref('')
const loading = ref(false)

const handleLogin = async () => {
  if (loading.value) return
  
  loading.value = true
  try {
    const result = await userStore.login(username.value, password.value)
    
    if (result.success) {
      showToast({ message: '登录成功', position: 'top' })
      router.push('/home')
    } else {
      showToast({ message: result.error || '登录失败', position: 'top' })
    }
  } catch (error) {
    showToast({ message: '登录异常', position: 'top' })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1989fa 0%, #4facfe 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 360px;
  background: white;
  border-radius: 16px;
  padding: 32px 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.logo-area {
  text-align: center;
  margin-bottom: 32px;
}

.logo {
  width: 80px;
  height: 80px;
  margin: 0 auto 16px;
}

.logo-svg {
  width: 100%;
  height: 100%;
}

.app-name {
  font-size: 24px;
  font-weight: bold;
  color: #323233;
  margin-bottom: 8px;
}

.app-desc {
  font-size: 14px;
  color: #969799;
}

.login-tip {
  text-align: center;
  margin-top: 16px;
  font-size: 12px;
  color: #c8c9cc;
}
</style>
