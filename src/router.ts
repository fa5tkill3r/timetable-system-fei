import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { useAuthStore } from './store/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE),
  routes,
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.public) {
    if (to.meta.notAuthOnly && authStore.isAuthenticated) {
      return next('/')
    }
    return next()
  } else {
    if (!authStore.isAuthenticated) {
      return next('/login')
    }
    return next()
  }
})

export default router
