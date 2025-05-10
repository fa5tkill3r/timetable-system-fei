<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { Button } from '@/components/ui/button'
  import { Languages } from 'lucide-vue-next'
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu'
  import { watch } from 'vue'

  const i18n = useI18n()

  watch(
    () => i18n.locale.value,
    (newLocale) => {
      localStorage.setItem('locale', newLocale)
    },
  )
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="outline"
        size="sm"
        class="h-8 w-8 p-0"
      >
        <Languages class="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem
        v-for="availableLocale in $i18n.availableLocales"
        :key="`locale-${availableLocale}`"
        @click="$i18n.locale = availableLocale"
      >
        <span :class="{ 'font-bold': $i18n.locale === availableLocale }">
          {{ availableLocale === 'sk' ? 'Slovenčina' : 'English' }}
        </span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
