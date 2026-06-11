import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

export const useUserStore = defineStore('user', () => {
  // 状态
  const session = ref(null)
  const profile = ref(null)
  const loading = ref(false)

  // 计算属性
  const isLoggedIn = computed(() => !!session.value)
  const isAdmin = computed(() => profile.value?.role === 'admin')
  const userId = computed(() => session.value?.user?.id)

  // 初始化 - 从localStorage恢复会话
  const initAuth = async () => {
    const savedSession = localStorage.getItem('cuoti_session')
    if (savedSession) {
      try {
        session.value = JSON.parse(savedSession)
        await fetchProfile()
      } catch (e) {
        console.error('恢复会话失败:', e)
        localStorage.removeItem('cuoti_session')
      }
    }
  }

  // 登录
  const login = async (username, password) => {
    loading.value = true
    try {
      // 将用户名转换为邮箱格式
      const email = `${username}@cuoti.local`
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error
      
      session.value = data.session
      localStorage.setItem('cuoti_session', JSON.stringify(data.session))
      
      await fetchProfile()
      
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    } finally {
      loading.value = false
    }
  }

  // 登出
  const logout = async () => {
    await supabase.auth.signOut()
    session.value = null
    profile.value = null
    localStorage.removeItem('cuoti_session')
  }

  // 获取用户资料
  const fetchProfile = async () => {
    if (!session.value?.user) return
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.value.user.id)
      .single()
    
    if (!error && data) {
      profile.value = data
    }
  }

  // 更新资料
  const updateProfile = async (updates) => {
    if (!session.value?.user) return { success: false }
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', session.value.user.id)
      .select()
      .single()
    
    if (!error && data) {
      profile.value = data
      return { success: true }
    }
    return { success: false, error: error.message }
  }

  return {
    session,
    profile,
    loading,
    isLoggedIn,
    isAdmin,
    userId,
    initAuth,
    login,
    logout,
    fetchProfile,
    updateProfile
  }
})
