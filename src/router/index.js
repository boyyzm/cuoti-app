import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/folder/:id',
    name: 'FolderView',
    component: () => import('@/views/FolderView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/photo-upload',
    name: 'PhotoUpload',
    component: () => import('@/views/PhotoUpload.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/practice-setup',
    name: 'PracticeSetup',
    component: () => import('@/views/PracticeSetup.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/practice-preview/:id',
    name: 'PracticePreview',
    component: () => import('@/views/PracticePreview.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/Admin.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()
  
  // 如果需要登录但用户未登录
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next('/')
    return
  }
  
  // 如果需要管理员权限但用户不是管理员
  if (to.meta.requiresAdmin && userStore.profile?.role !== 'admin') {
    next('/home')
    return
  }
  
  // 如果已登录用户访问登录页，跳转到首页
  if (to.path === '/' && userStore.isLoggedIn) {
    next('/home')
    return
  }
  
  next()
})

export default router
