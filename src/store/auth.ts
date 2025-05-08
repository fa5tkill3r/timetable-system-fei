import { defineStore } from 'pinia'
import { ref } from 'vue'

const OAUTH_CONFIG = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
  redirectUri:
    import.meta.env.VITE_GOOGLE_REDIRECT_URI ||
    'http://localhost:5173/auth/callback',
  scope: import.meta.env.VITE_GOOGLE_SCOPE || 'email profile',
  authUrl:
    import.meta.env.VITE_GOOGLE_AUTH_URL ||
    'https://accounts.google.com/o/oauth2/auth',
  tokenUrl:
    import.meta.env.VITE_GOOGLE_TOKEN_URL ||
    'https://oauth2.googleapis.com/token',
  userInfoUrl:
    import.meta.env.VITE_GOOGLE_USERINFO_URL ||
    'https://www.googleapis.com/oauth2/v2/userinfo',
}

interface User {
  id: string
  name: string
  email: string
  googleId?: string
  picture?: string
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

  function initiateGoogleLogin() {
    const state = Math.random().toString(36).substring(2)
    localStorage.setItem('oauth_state', state)

    const authUrl = new URL(OAUTH_CONFIG.authUrl)
    authUrl.searchParams.append('client_id', OAUTH_CONFIG.clientId)
    authUrl.searchParams.append('redirect_uri', OAUTH_CONFIG.redirectUri)
    authUrl.searchParams.append('response_type', 'code')
    authUrl.searchParams.append('scope', OAUTH_CONFIG.scope)
    authUrl.searchParams.append('state', state)

    window.location.href = authUrl.toString()
  }

  async function handleGoogleCallback(code: string) {
    try {
      const tokenResponse = await fetch(OAUTH_CONFIG.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: OAUTH_CONFIG.clientId,
          client_secret: OAUTH_CONFIG.clientSecret,
          redirect_uri: OAUTH_CONFIG.redirectUri,
          grant_type: 'authorization_code',
        }),
      })

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for tokens')
      }

      const tokenData = await tokenResponse.json()

      const userInfoResponse = await fetch(OAUTH_CONFIG.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      })

      if (!userInfoResponse.ok) {
        throw new Error('Failed to get user info')
      }

      const googleUser = await userInfoResponse.json()

      const userObj: User = {
        id: googleUser.id,
        googleId: googleUser.id,
        name: googleUser.name,
        email: googleUser.email,
        picture: googleUser.picture,
      }

      userId.value = userObj.id
      user.value = userObj
      isAuthenticated.value = true

      localStorage.setItem('userId', userObj.id)
      localStorage.setItem('userData', JSON.stringify(userObj))

      return true
    } catch (error) {
      console.error('Google authentication error:', error)
      return false
    }
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
    handleGoogleCallback,
    initiateGoogleLogin,
  }
})
