<template>
  <nav class="border-b">
    <div class="container flex h-14 items-center px-4 sm:px-6 lg:px-8">
      <div class="mr-4 hidden md:flex">
        <RouterLink to="/" class="flex items-center space-x-2">
          <img src="@/assets/logo.svg" alt="Logo" class="h-8 w-8" />
          <span class="font-bold">MyApp</span>
        </RouterLink>
      </div>
      <div class="flex items-center space-x-4 lg:space-x-6">
        <RouterLink to="/" class="text-sm font-medium transition-colors hover:text-primary">
          Dashboard
        </RouterLink>
        <RouterLink to="/timetables" class="text-sm font-medium transition-colors hover:text-primary">
          Timetables
        </RouterLink>
        <RouterLink to="/admin" class="text-sm font-medium transition-colors hover:text-primary">
          Admin
        </RouterLink>
      </div>
      <div class="ml-auto flex items-center space-x-4">
        <button class="text-sm font-medium transition-colors hover:text-primary">Login</button>
        <button class="text-sm font-medium transition-colors hover:text-primary">Register</button>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>