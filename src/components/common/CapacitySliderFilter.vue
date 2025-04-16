<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { CirclePlus } from 'lucide-vue-next'

interface CapacitySliderFilterProps {
  title?: string
  min?: number
  max?: number
  step?: number
  modelValue?: [number, number]
}

const props = withDefaults(defineProps<CapacitySliderFilterProps>(), {
  title: 'Capacity',
  min: 0,
  max: 300,
  step: 5
})

const emit = defineEmits<{
  'update:modelValue': [value: [number, number]]
}>()

const range = ref<[number, number]>(props.modelValue || [props.min, props.max])

watch(() => props.modelValue, (newValue) => {
  if (newValue !== undefined) {
    range.value = newValue
  }
}, { deep: true })

const hasActiveFilter = computed(() => {
  return range.value[0] > props.min || range.value[1] < props.max
})

function updateRange(newRange: number[] | undefined) {
  if (!newRange) return
  range.value = [newRange[0] ?? props.min, newRange[1] ?? props.max]
  emit('update:modelValue', range.value)
}

function formatCapacity(value: number): string {
  if (value >= props.max) return `${props.max}+`
  return value.toString()
}
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button variant="outline" size="sm" class="h-8 border-dashed">
        <CirclePlus class="mr-2 h-4 w-4" />
        {{ title }}
        <template v-if="hasActiveFilter">
          <Separator orientation="vertical" class="mx-2 h-4" />
          <Badge variant="secondary" class="rounded-sm px-1 font-normal">
            {{ formatCapacity(range[0]) }} - {{ formatCapacity(range[1]) }}
          </Badge>
        </template>
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-[300px] p-4">
      <div class="space-y-5">
        <div class="text-sm font-medium leading-none mb-4">
          Capacity Range: {{ formatCapacity(range[0]) }} - {{ formatCapacity(range[1]) }}
        </div>
        
        <Slider v-model="range" :min="min" :max="max" :step="step" class="w-full" @update:modelValue="updateRange" />

        <div class="flex items-center justify-between text-xs text-muted-foreground">
          <div>{{ min }}</div>
          <div>{{ max }}+</div>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
