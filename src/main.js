import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Vant from 'vant'
import 'vant/lib/index.css'
import router from './router'
import App from './App.vue'
import './style.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Vant)

// 先mount再初始化认证，确保页面能渲染
app.mount('#app')

// 初始化认证状态（异步，不阻塞渲染）
import { useUserStore } from './stores/user'
const userStore = useUserStore()
userStore.initAuth().catch(e => {
  console.error('初始化认证失败:', e)
})

// 注册Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js')
      .then(registration => {
        console.log('SW registered:', registration)
      })
      .catch(error => {
        console.log('SW registration failed:', error)
      })
  })
}
