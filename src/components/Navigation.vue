<script setup lang="ts">
  import { cn } from '@/lib/utils'

  const links = [
    {
      to: '/',
      text: 'navigation.dashboard',
    },
    {
      to: '/timetables',
      text: 'navigation.timetables',
    },
    {
      to: '/requirements',
      text: 'navigation.requirements',
    },
    {
      to: '/admin',
      text: 'navigation.admin',
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
      {{ $t(link.text) }}
    </RouterLink>
  </nav>
</template>
