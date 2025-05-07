<script setup lang="ts">
import Navigation from '@/components/Navigation.vue'
import SchemaSwitcher from './components/SchemaSwitcher.vue'
import Toaster from '@/components/ui/toast/Toaster.vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

const route = useRoute()

// Define which routes use the auth layout
const authRoutes = ['/login', '/register', '/forgot-password']

// Determine which layout to use based on the current route
const isAuthRoute = computed(() => {
  return authRoutes.includes(route.path)
})
</script>

<template>
  <Toaster />

  <!-- Switch between layouts based on route -->
  <AuthLayout v-if="isAuthRoute">
    <RouterView />
  </AuthLayout>

  <DefaultLayout v-else />
</template>

<style scoped></style>
