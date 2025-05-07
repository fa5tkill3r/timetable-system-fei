import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { useAuthStore } from './store/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE),
  routes,
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  console.log('authenticated', authStore.isAuthenticated)

  if (to.path === '/login') {
    if (authStore.isAuthenticated) {
      next('/')
    } else {
      next()
    }
  } else {
    if (!authStore.isAuthenticated) {
      next('/login')
    } else {
      next()
    }
  }
})

export default router
