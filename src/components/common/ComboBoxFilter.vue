<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Component } from 'vue'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { CheckIcon, CirclePlus } from 'lucide-vue-next'

interface RoomFilterOption {
  label: string
  value: string | number
  icon?: Component
  count?: number
}

interface RoomFilterProps {
  title: string
  options: RoomFilterOption[]
  modelValue?: (string | number)[] // Added to support v-model
}

const props = defineProps<RoomFilterProps>()
const emit = defineEmits<{
  'update:selectedValues': [value: (string | number)[]]
  'update:modelValue': [value: (string | number)[]] // Added for v-model
}>()

// Use internal selectedValues but sync with external modelValue
const selectedValues = ref<Set<string | number>>(new Set(props.modelValue || []))

// Watch for external changes (like reset)
watch(() => props.modelValue, (newValue) => {
  if (newValue !== undefined) {
    selectedValues.value = new Set(newValue)
  }
}, { deep: true })

function toggleOption(option: RoomFilterOption) {
  const newSelectedValues = new Set(selectedValues.value)

  if (newSelectedValues.has(option.value)) {
    newSelectedValues.delete(option.value)
  } else {
    newSelectedValues.add(option.value)
  }

  selectedValues.value = newSelectedValues
  const valuesArray = Array.from(newSelectedValues)
  emit('update:selectedValues', valuesArray)
  emit('update:modelValue', valuesArray)
}

function clearFilters() {
  selectedValues.value = new Set()
  emit('update:selectedValues', [])
  emit('update:modelValue', [])
}

// Limit displayed options to 20 items
const searchQuery = ref<string>('')

// Update displayedOptions to filter by search query
const displayedOptions = computed(() => {
  const filteredOptions = props.options.filter(option =>
    option.label.toLowerCase().includes(searchQuery.value.toLowerCase())
  )

  return filteredOptions.slice(0, 20)
})

// Updated count of filtered options (for showing X of Y items)
const filteredOptionsCount = computed(() => {
  return props.options.filter(option =>
    option.label.toLowerCase().includes(searchQuery.value.toLowerCase())
  ).length
})
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button variant="outline" size="sm" class="h-8 border-dashed">
        <CirclePlus class="mr-2 h-4 w-4" />
        {{ title }}
        <template v-if="selectedValues.size > 0">
          <Separator orientation="vertical" class="mx-2 h-4" />
          <Badge variant="secondary" class="rounded-sm px-1 font-normal lg:hidden">
            {{ selectedValues.size }}
          </Badge>
          <div class="hidden space-x-1 lg:flex">
            <Badge v-if="selectedValues.size > 2" variant="secondary" class="rounded-sm px-1 font-normal">
              {{ selectedValues.size }} selected
            </Badge>

            <template v-else>
              <Badge v-for="option in props.options.filter((option) => selectedValues.has(option.value))"
                :key="option.value" variant="secondary" class="rounded-sm px-1 font-normal">
                {{ option.label }}
              </Badge>
            </template>
          </div>
        </template>
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-[200px] p-0" align="start">
      <Command>
        <CommandInput :placeholder="title" :value="searchQuery"
          @input="event => searchQuery = (event.target as HTMLInputElement).value" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup>
            <CommandItem v-for="option in displayedOptions" :key="option.value" :value="option"
              @select="() => toggleOption(option)">
              <div :class="cn(
                'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                selectedValues.has(option.value)
                  ? 'bg-primary text-primary-foreground'
                  : 'opacity-50 [&_svg]:invisible',
              )">
                <CheckIcon :class="cn('h-4 w-4')" />
              </div>
              <component :is="option.icon" v-if="option.icon" class="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{{ option.label }}</span>
              <span v-if="option.count" class="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
                {{ option.count }}
              </span>
            </CommandItem>
          </CommandGroup>

          <div v-if="filteredOptionsCount > 20" class="py-2 px-2 text-xs text-center text-muted-foreground">
            Showing 20 of {{ filteredOptionsCount }} items
          </div>

          <template v-if="selectedValues.size > 0">
            <CommandSeparator />
            <CommandGroup>
              <CommandItem class="justify-center text-center" @select="clearFilters">
                Clear filters
              </CommandItem>
            </CommandGroup>
          </template>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</template>