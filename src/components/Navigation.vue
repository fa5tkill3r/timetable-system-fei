<script setup lang="ts">
  import { cn } from '@/lib/utils'

  const links = [
    {
      to: '/',
      text: 'Dashboard',
    },
    {
      to: '/timetables',
      text: 'Timetables',
    },
    {
      to: '/requirements',
      text: 'Requirements',
    },
    {
      to: '/admin',
      text: 'Admin',
    },
  ]
</script>

<template>
  <nav
    :class="cn('flex items-center space-x-4 lg:space-x-6', $attrs.class ?? '')"
  >
    <RouterLink
      v-for="link in links"
      :key="link.to"
      :to="link.to"
      class="text-sm font-medium transition-colors hover:text-primary"
    >
      {{ link.text }}
    </RouterLink>
  </nav>
</template>
