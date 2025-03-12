<script setup lang="ts">
  import { computed } from 'vue'
  import { useRoute } from 'vue-router'
  import {
    BookOpenIcon,
    CalendarIcon,
    DownloadIcon,
    BuildingIcon,
    WrenchIcon,
    LibraryIcon,
  } from 'lucide-vue-next'

  const route = useRoute()

  // Navigation data structure
  const navSections = [
    {
      title: 'Current Term Data',
      items: [
        {
          label: 'Buildings',
          path: '/admin/buildings',
          pathMatch: 'buildings',
          icon: BuildingIcon
        },
        {
          label: 'Equipment',
          path: '/admin/equipment',
          pathMatch: 'equipment',
          icon: WrenchIcon
        },
        {
          label: 'Subjects',
          path: '/admin/subjects',
          pathMatch: 'subjects',
          icon: BookOpenIcon
        }
      ]
    },
    {
      title: 'Administration',
      items: [
        {
          label: 'Schemas',
          path: '/admin/schemas',
          pathMatch: 'schemas',
          icon: LibraryIcon
        },
        {
          label: 'Terms',
          path: '/admin/terms',
          pathMatch: 'terms',
          icon: CalendarIcon
        },
        {
          label: 'Import',
          path: '/admin/import',
          pathMatch: 'import',
          icon: DownloadIcon
        }
      ]
    }
  ]

  const pageTitles: Record<string, string> = {
    '/admin/subjects': 'Subjects',
    '/admin/buildings': 'Buildings',
    '/admin/equipment': 'Equipment',
    '/admin/import': 'Import Files',
    '/admin/terms': 'Terms Management',
    default: 'Admin Dashboard'
  }

  const pageTitle = computed(() => {
    return pageTitles[route.path] || pageTitles['default']
  })
</script>

<template>
  <div class="flex flex-col flex-1 h-full">
    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar -->
      <div class="w-64 border-r bg-card shadow-sm flex flex-col">
        <div class="h-16 flex items-center px-4 border-b">
          <h2 class="text-lg font-semibold">Admin Dashboard</h2>
        </div>

        <nav class="p-2 space-y-1 flex-1 overflow-auto">
          <!-- Nav sections -->
          <template v-for="(section, sectionIndex) in navSections" :key="`section-${sectionIndex}`">
            <div class="py-2">
              <h3 class="px-3 text-xs font-medium text-muted-foreground mb-2">{{ section.title }}</h3>
              <div class="space-y-1">
                <RouterLink
                  v-for="item in section.items"
                  :key="item.path"
                  :to="item.path"
                  class="flex items-center px-3 py-2 text-sm rounded-md transition-colors"
                  :class="$route.path.includes(item.pathMatch) ? 'bg-accent text-accent-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'"
                >
                  <component :is="item.icon" class="h-4 w-4 mr-2" />
                  <span>{{ item.label }}</span>
                </RouterLink>
              </div>
            </div>

            <!-- Add separator between sections if not last section -->
            <div v-if="sectionIndex < navSections.length - 1" class="h-px bg-border my-2"></div>
          </template>
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
  </div>
</template>