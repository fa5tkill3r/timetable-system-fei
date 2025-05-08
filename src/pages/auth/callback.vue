<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { LoaderCircle } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

definePage({
	meta: {
		public: true,
		notAuthOnly: true
	}
})

onMounted(async () => {
	const code = route.query.code as string
	const state = route.query.state as string

	const savedState = localStorage.getItem('oauth_state')
	localStorage.removeItem('oauth_state')

	if (!code || state !== savedState) {
		console.error('Invalid OAuth callback')
		router.push('/login')
		return
	}

	const success = await authStore.handleGoogleCallback(code)

	if (success) {
		router.push('/')
	} else {
		router.push('/login')
	}
})
</script>

<template>
	<div class="flex h-screen w-screen items-center justify-center">
		<div class="text-center">
			<LoaderCircle class="h-12 w-12 animate-spin mx-auto" />
		</div>
	</div>
</template>