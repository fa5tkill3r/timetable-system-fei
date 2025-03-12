<script setup lang="ts">
import Navigation from '@/components/Navigation.vue'
import SchemaSwitcher from './components/SchemaSwitcher.vue'
</script>

<template>
  <div class="flex flex-col h-screen">
    <div class="border-b">
      <div class="flex h-16 items-center px-4">
        <SchemaSwitcher />
        <Navigation class="mx-6" />
        <div class="ml-auto flex items-center space-x-4">
          <Search />
          <UserNav />
        </div>
      </div>
    </div>
    <RouterView class="flex-1 flex overflow-hidden" />
  </div>
</template>

<style scoped></style>
