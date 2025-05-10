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

  const navSections = [
    {
      title: 'Current Term Data',
      items: [
        {
          label: 'Buildings',
          path: '/admin/buildings',
          pathMatch: 'buildings',
          icon: BuildingIcon,
        },
        {
          label: 'Equipment',
          path: '/admin/equipment',
          pathMatch: 'equipment',
          icon: WrenchIcon,
        },
        {
          label: 'Subjects',
          path: '/admin/subjects',
          pathMatch: 'subjects',
          icon: BookOpenIcon,
        },
      ],
    },
    {
      title: 'Administration',
      items: [
        {
          label: 'Schemas',
          path: '/admin/schemas',
          pathMatch: 'schemas',
          icon: LibraryIcon,
        },
        {
          label: 'Terms',
          path: '/admin/terms',
          pathMatch: 'terms',
          icon: CalendarIcon,
        },
        {
          label: 'Import',
          path: '/admin/import',
          pathMatch: 'import',
          icon: DownloadIcon,
        },
      ],
    },
  ]

  const pageTitles: Record<string, string> = {
    '/admin/subjects': 'Subjects',
    '/admin/buildings': 'Buildings',
    '/admin/equipment': 'Equipment',
    '/admin/import': 'Import Files',
    '/admin/terms': 'Terms Management',
    default: 'Admin Dashboard',
  }

  const pageTitle = computed(() => {
    return pageTitles[route.path] || pageTitles['default']
  })
</script>

<template>
  <div class="flex h-full flex-1 flex-col">
    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar -->
      <div class="flex w-64 flex-col border-r bg-card shadow-sm">
        <div class="flex h-16 items-center border-b px-4">
          <h2 class="text-lg font-semibold">Admin Dashboard</h2>
        </div>

        <nav class="flex-1 space-y-1 overflow-auto p-2">
          <!-- Nav sections -->
          <template
            v-for="(section, sectionIndex) in navSections"
            :key="`section-${sectionIndex}`"
          >
            <div class="py-2">
              <h3 class="mb-2 px-3 text-xs font-medium text-muted-foreground">
                {{ section.title }}
              </h3>
              <div class="space-y-1">
                <RouterLink
                  v-for="item in section.items"
                  :key="item.path"
                  :to="item.path"
                  class="flex items-center rounded-md px-3 py-2 text-sm transition-colors"
                  :class="
                    $route.path.includes(item.pathMatch)
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  "
                >
                  <component
                    :is="item.icon"
                    class="mr-2 h-4 w-4"
                  />
                  <span>{{ item.label }}</span>
                </RouterLink>
              </div>
            </div>

            <!-- Add separator between sections if not last section -->
            <div
              v-if="sectionIndex < navSections.length - 1"
              class="my-2 h-px bg-border"
            ></div>
          </template>
        </nav>
      </div>

      <!-- Main content -->
      <div class="flex flex-1 flex-col overflow-hidden">
        <header class="flex h-16 items-center border-b bg-card px-6">
          <h1 class="text-xl font-semibold">{{ pageTitle }}</h1>
        </header>

        <main class="flex-1 overflow-auto">
          <router-view></router-view>
        </main>
      </div>
    </div>
  </div>
</template>
