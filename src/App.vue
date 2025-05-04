<script setup lang="ts">
import Navigation from '@/components/Navigation.vue'
import SchemaSwitcher from './components/SchemaSwitcher.vue'
import Toaster from '@/components/ui/toast/Toaster.vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Languages } from 'lucide-vue-next'
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'

const i18n = useI18n()

watch(() => i18n.locale.value, (newLocale) => {
  localStorage.setItem('locale', newLocale)
})
</script>

<template>
  <Toaster />
  <div class="flex flex-col h-screen">
    <div class="border-b">
      <div class="flex h-16 items-center px-4">
        <SchemaSwitcher />
        <div class="flex flex-1 items-center justify-between">
          <Navigation class="mx-6" />
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="outline" size="sm" class="h-8 w-8 p-0">
                <Languages class="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem v-for="availableLocale in $i18n.availableLocales" :key="`locale-${availableLocale}`"
                @click="$i18n.locale = availableLocale">
                <span :class="{ 'font-bold': $i18n.locale === availableLocale }">
                  {{ availableLocale === 'sk' ? 'Slovenčina' : 'English' }}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
    <RouterView class="flex-1 flex overflow-hidden" />
  </div>
</template>

<style scoped></style>
