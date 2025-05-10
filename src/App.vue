<script setup lang="ts">
  import Toaster from '@/components/ui/toast/Toaster.vue'
  import { onMounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import AuthLayout from '@/layouts/AuthLayout.vue'
  import DefaultLayout from '@/layouts/DefaultLayout.vue'
  import { LoaderCircle } from 'lucide-vue-next'

  const route = useRoute()
  const router = useRouter()
  const isInitialized = ref(false)

  onMounted(async () => {
    await router.isReady()
    isInitialized.value = true
  })
</script>

<template>
  <Toaster />

  <div
    v-if="!isInitialized"
    class="flex h-screen w-screen items-center justify-center"
  >
    <div class="text-center">
      <LoaderCircle class="mx-auto h-12 w-12 animate-spin" />
    </div>
  </div>

  <template v-else>
    <AuthLayout v-if="route.meta.public">
      <RouterView />
    </AuthLayout>

    <DefaultLayout v-else>
      <RouterView />
    </DefaultLayout>
  </template>
</template>

<style scoped></style>
