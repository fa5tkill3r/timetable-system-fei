<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import type { Component } from 'vue'
  import { cn } from '@/lib/utils'
  import { Badge } from '@/components/ui/badge'
  import { Button } from '@/components/ui/button'
  import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
  } from '@/components/ui/command'
  import {
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from '@/components/ui/popover'
  import { Separator } from '@/components/ui/separator'
  import { CheckIcon, CirclePlus } from 'lucide-vue-next'

  export interface RoomFilterOption {
    label: string
    value: string | number
    icon?: Component
    count?: number
  }

  interface RoomFilterProps {
    title: string
    options: RoomFilterOption[]
    modelValue?: (string | number)[]
  }

  const props = defineProps<RoomFilterProps>()
  const emit = defineEmits<{
    'update:selectedValues': [value: (string | number)[]]
    'update:modelValue': [value: (string | number)[]]
  }>()

  const selectedValues = ref<Set<string | number>>(
    new Set(props.modelValue || []),
  )

  watch(
    () => props.modelValue,
    (newValue) => {
      if (newValue !== undefined) {
        selectedValues.value = new Set(newValue)
      }
    },
    { deep: true },
  )

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

  const searchQuery = ref<string>('')

  const displayedOptions = computed(() => {
    // If no search query, return all selected options first,
    // then other options (up to 20 total)
    if (!searchQuery.value.trim()) {
      const selectedOptions = props.options.filter((option) =>
        selectedValues.value.has(option.value),
      )
      const remainingOptions = props.options
        .filter((option) => !selectedValues.value.has(option.value))
        .slice(0, Math.max(0, 20 - selectedOptions.length))
      return [...selectedOptions, ...remainingOptions]
    }

    // When searching, only include options that match the search query
    // (including selected options only if they match the search)
    return (
      props.options
        .filter((option) =>
          option.label.toLowerCase().includes(searchQuery.value.toLowerCase()),
        )
        // Sort to put selected items first if they match search
        .sort((a, b) => {
          const aSelected = selectedValues.value.has(a.value) ? -1 : 0
          const bSelected = selectedValues.value.has(b.value) ? -1 : 0
          return aSelected - bSelected
        })
        .slice(0, 20)
    )
  })

  const filteredOptionsCount = computed(() => {
    return props.options.filter((option) =>
      option.label.toLowerCase().includes(searchQuery.value.toLowerCase()),
    ).length
  })
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        size="sm"
        class="h-8 border-dashed"
      >
        <CirclePlus class="mr-2 h-4 w-4" />
        {{ title }}
        <template v-if="selectedValues.size > 0">
          <Separator
            orientation="vertical"
            class="mx-2 h-4"
          />
          <Badge
            variant="secondary"
            class="rounded-sm px-1 font-normal lg:hidden"
          >
            {{ selectedValues.size }}
          </Badge>
          <div class="hidden space-x-1 lg:flex">
            <Badge
              v-if="selectedValues.size > 2"
              variant="secondary"
              class="rounded-sm px-1 font-normal"
            >
              {{ selectedValues.size }} selected
            </Badge>

            <template v-else>
              <Badge
                v-for="option in props.options.filter((option) =>
                  selectedValues.has(option.value),
                )"
                :key="option.value"
                variant="secondary"
                class="rounded-sm px-1 font-normal"
              >
                {{ option.label }}
              </Badge>
            </template>
          </div>
        </template>
      </Button>
    </PopoverTrigger>
    <PopoverContent
      class="w-[200px] p-0"
      align="start"
    >
      <Command
        v-model:search-term="searchQuery"
        :filter-function="(a) => a"
      >
        <CommandInput :placeholder="title" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup>
            <CommandItem
              v-for="option in displayedOptions"
              :key="option.value"
              :value="option.value"
              @select="() => toggleOption(option)"
            >
              <div
                :class="
                  cn(
                    'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                    selectedValues.has(option.value)
                      ? 'bg-primary text-primary-foreground'
                      : 'opacity-50 [&_svg]:invisible',
                  )
                "
              >
                <CheckIcon :class="cn('h-4 w-4')" />
              </div>
              <component
                :is="option.icon"
                v-if="option.icon"
                class="mr-2 h-4 w-4 text-muted-foreground"
              />
              <span>{{ option.label }}</span>
              <span
                v-if="option.count"
                class="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs"
              >
                {{ option.count }}
              </span>
            </CommandItem>
          </CommandGroup>

          <div
            v-if="filteredOptionsCount > 20"
            class="px-2 py-2 text-center text-xs text-muted-foreground"
          >
            Showing 20 of {{ filteredOptionsCount }} items
          </div>

          <template v-if="selectedValues.size > 0">
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                class="justify-center text-center"
                value="clear"
                @select="clearFilters"
              >
                Clear filters
              </CommandItem>
            </CommandGroup>
          </template>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</template>
