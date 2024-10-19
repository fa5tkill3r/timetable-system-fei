<script setup lang="ts">
import HelloWorld from './components/HelloWorld.vue'
import Dashboard from "@/pages/index.vue";
import TimetableSwitcher from "@/components/TimetableSwitcher.vue";
import Navigation from "@/components/Navigation.vue";



</script>

<template>
  <div class="hidden flex-col md:flex">
    <div class="border-b">
      <div class="flex h-16 items-center px-4">
        <TimetableSwitcher />
        <Navigation class="mx-6" />
        <div class="ml-auto flex items-center space-x-4">
          <Search />
          <UserNav />
        </div>
      </div>
    </div>
    <RouterView />
  </div>
</template>

<style scoped>

</style>
