<script setup lang="ts">
  import DashboardTimetable from '@/components/dashboard/DashboardTimetable.vue'
  import { useAuthStore } from '@/store/auth'

  const authStore = useAuthStore()
</script>

<template>
  <div class="flex-1 flex-col space-y-4 p-8 pt-6">
    <div class="flex items-center justify-between space-y-2">
      <h2 class="text-3xl font-bold tracking-tight">Dashboard</h2>
      <div
        v-if="authStore.user"
        class="text-sm text-muted-foreground"
      >
        Welcome, {{ authStore.user.name }}
      </div>
    </div>

    <div class="col-span-2 rounded-lg border shadow">
      <div class="p-6">
        <DashboardTimetable />
      </div>
    </div>
  </div>
</template>
