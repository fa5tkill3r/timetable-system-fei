import { defineStore } from 'pinia'
import { ref } from 'vue'

interface User {
  id: string
  name: string
  email: string
}

export const useAuthStore = defineStore('auth', () => {
  const userId = ref<string | null>(localStorage.getItem('userId'))
  const user = ref<User | null>(null)
  const isAuthenticated = ref(!!userId.value)

  try {
    const storedUser = localStorage.getItem('userData')
    if (storedUser) {
      user.value = JSON.parse(storedUser)
    }
  } catch (e) {
    console.error('Failed to parse stored user data')
  }

  function login(email: string, password: string) {
    const userObj: User = {
      id: password,
      name: email.split('@')[0]!,
      email: email,
    }

    userId.value = userObj.id
    user.value = userObj
    isAuthenticated.value = true

    localStorage.setItem('userId', userObj.id)
    localStorage.setItem('userData', JSON.stringify(userObj))
  }

  function logout() {
    userId.value = null
    user.value = null
    isAuthenticated.value = false

    localStorage.removeItem('userId')
    localStorage.removeItem('userData')
  }

  return {
    userId,
    user,
    isAuthenticated,
    login,
    logout,
  }
})
