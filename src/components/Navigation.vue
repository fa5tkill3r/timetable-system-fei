<script setup lang="ts">
import { cn } from '@/lib/utils'

const links = [
  {
    to: "/",
    text: "Dashboard",
  },
  {
    to: "/timetable",
    text: "Timetable editor",
  },
  {
    to: "/data",
    text: "Data",
  },
  {
    to: "/settings",
    text: "Settings",
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
<!--    <a-->
<!--        href="/examples/dashboard"-->
<!--        class="text-sm font-medium transition-colors hover:text-primary"-->
<!--    >-->
<!--      Dashboard-->
<!--    </a>-->
<!--    <a-->
<!--        href="/examples/dashboard"-->
<!--        class="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"-->
<!--    >-->
<!--      Timetable Editor-->
<!--    </a>-->
<!--    <a-->
<!--        href="/examples/dashboard"-->
<!--        class="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"-->
<!--    >-->
<!--      Data-->
<!--    </a>-->
<!--    <a-->
<!--        href="/examples/dashboard"-->
<!--        class="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"-->
<!--    >-->
<!--      Settings-->
<!--    </a>-->
  </nav>
</template>