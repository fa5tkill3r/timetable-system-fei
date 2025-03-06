<!-- src/pages/admin_old.vue -->
<template>
  <div class="flex h-screen">
    <!-- Sidebar -->
    <div class="w-64 border-r bg-card shadow-sm flex flex-col">
      <div class="h-16 flex items-center px-4 border-b">
        <h2 class="text-lg font-semibold">Admin Dashboard</h2>
      </div>

      <nav class="p-2 space-y-1 flex-1 overflow-auto">
        <!-- Term-specific data group -->
        <div class="py-2">
          <h3 class="px-3 text-xs font-medium text-muted-foreground mb-2">Current Term Data</h3>
          <div class="space-y-1">
            <RouterLink
              to="/admin/buildings"
              class="flex items-center px-3 py-2 text-sm rounded-md transition-colors"
              :class="$route.path.includes('buildings') ? 'bg-accent text-accent-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'"
            >
              <BuildingIcon class="h-4 w-4 mr-2" />
              <span>Buildings</span>
            </RouterLink>
            <RouterLink
              to="/admin/equipment"
              class="flex items-center px-3 py-2 text-sm rounded-md transition-colors"
              :class="$route.path.includes('equipment') ? 'bg-accent text-accent-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'"
            >
              <WrenchIcon class="h-4 w-4 mr-2" />
              <span>Equipment</span>
            </RouterLink>
            <RouterLink
              to="/admin/subjects"
              class="flex items-center px-3 py-2 text-sm rounded-md transition-colors"
              :class="$route.path.includes('subjects') ? 'bg-accent text-accent-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'"
            >
              <BookOpenIcon class="h-4 w-4 mr-2" />
              <span>Subjects</span>
            </RouterLink>
          </div>
        </div>

        <!-- Separator -->
        <div class="h-px bg-border my-2"></div>

        <!-- Universal admin_old data group -->
        <div class="py-2">
          <h3 class="px-3 text-xs font-medium text-muted-foreground mb-2">Administration</h3>
          <div class="space-y-1">
            <RouterLink
              to="/admin/terms"
              class="flex items-center px-3 py-2 text-sm rounded-md transition-colors"
              :class="$route.path.includes('terms') ? 'bg-accent text-accent-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'"
            >
              <CalendarIcon class="h-4 w-4 mr-2" />
              <span>Terms</span>
            </RouterLink>
            <RouterLink
              to="/admin/import"
              class="flex items-center px-3 py-2 text-sm rounded-md transition-colors"
              :class="$route.path.includes('import') ? 'bg-accent text-accent-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'"
            >
              <DownloadIcon class="h-4 w-4 mr-2" />
              <span>Import</span>
            </RouterLink>
          </div>
        </div>
      </nav>
    </div>

    <!-- Main content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <header class="h-16 border-b bg-card flex items-center px-6">
        <h1 class="text-xl font-semibold">{{ pageTitle }}</h1>
      </header>

      <main class="flex-1 overflow-auto">
        <router-view></router-view>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useRoute } from 'vue-router'
  import {
    BookOpenIcon,
    CalendarIcon,
    DownloadIcon,
    BuildingIcon,
    WrenchIcon,
  } from 'lucide-vue-next'

  const route = useRoute()
  const pageTitle = computed(() => {
    switch(route.path) {
      case '/admin_old/subjects': return 'Subjects'
      case '/admin_old/buildings': return 'Buildings'
      case '/admin_old/equipment': return 'Equipment'
      case '/admin/import': return 'Import Files'
      case '/admin_old/terms': return 'Terms Management'
      default: return 'Admin Dashboard'
    }
  })
</script>