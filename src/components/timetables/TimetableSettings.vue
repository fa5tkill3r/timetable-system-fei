<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Settings, RotateCcw } from 'lucide-vue-next'
import { useTimetableSettingsStore } from '@/store/timetableSettings'
import { computed } from 'vue'
import type { TimetableConfig } from '@/utils/timetable'

const timetableSettingsStore = useTimetableSettingsStore()

const config = computed(() => timetableSettingsStore.config)
const compactView = computed(() => timetableSettingsStore.compactView)

const updateConfig = (key: keyof TimetableConfig, value: number) => {
  timetableSettingsStore.updateConfig({
    ...config.value,
    [key]: value
  })
}

const updateCompactView = (value: boolean) => {
  timetableSettingsStore.updateCompactView(value)
}

const resetSettings = () => {
  timetableSettingsStore.resetSettings()
}
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button variant="outline" size="icon" class="h-8 w-8">
        <Settings class="h-4 w-4" />
        <span class="sr-only">{{ $t('timetable.settings.title') }}</span>
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-80">
      <div class="grid gap-4">
        <div class="flex items-center justify-between">
          <h4 class="font-medium leading-none">
            {{ $t('timetable.settings.title') }}
          </h4>
          <Button variant="ghost" size="icon" @click="resetSettings" :title="$t('timetable.settings.resetToDefaults')">
            <RotateCcw class="h-4 w-4" />
          </Button>
        </div>
        <p class="text-sm text-muted-foreground">
          {{ $t('timetable.settings.description') }}
        </p>

        <div class="flex items-center space-x-2">
          <Switch id="compact-view" :checked="compactView" @update:checked="updateCompactView" />
          <Label for="compact-view">{{ $t('timetable.settings.compactView') }}</Label>
        </div>

        <div class="grid gap-2">
          <div class="grid grid-cols-3 items-center gap-4">
            <Label for="cell-width">{{ $t('timetable.settings.cellWidth') }}</Label>
            <Input id="cell-width" type="number" :model-value="config.CELL_WIDTH"
              @update:modelValue="updateConfig('CELL_WIDTH', Number($event))" class="col-span-2 h-8" />
          </div>

          <div class="grid grid-cols-3 items-center gap-4">
            <Label for="cell-height">{{ $t('timetable.settings.cellHeight') }}</Label>
            <Input id="cell-height" type="number" :model-value="config.CELL_HEIGHT"
              @update:modelValue="updateConfig('CELL_HEIGHT', Number($event))" class="col-span-2 h-8" />
          </div>

          <div class="grid grid-cols-3 items-center gap-4">
            <Label for="header-height">{{ $t('timetable.settings.headerHeight') }}</Label>
            <Input id="header-height" type="number" :model-value="config.HEADER_HEIGHT"
              @update:modelValue="updateConfig('HEADER_HEIGHT', Number($event))" class="col-span-2 h-8" />
          </div>

          <div class="grid grid-cols-3 items-center gap-4">
            <Label for="day-column-width">{{ $t('timetable.settings.dayColumnWidth') }}</Label>
            <Input id="day-column-width" type="number" :model-value="config.DAY_COLUMN_WIDTH"
              @update:modelValue="updateConfig('DAY_COLUMN_WIDTH', Number($event))" class="col-span-2 h-8" />
          </div>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>