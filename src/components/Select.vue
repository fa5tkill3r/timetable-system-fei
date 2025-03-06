<script setup lang="ts">
  import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select'
  import { ref, watch } from 'vue'

  const props = defineProps<{
    items: string[],
    placeholder?: string,
  }>()

  const model = defineModel<string>()
</script>

<template>
  <Select v-model="model">
    <SelectTrigger class="w-[180px]">
      <SelectValue :placeholder="props.placeholder || 'Select an option'" />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectItem v-for="item in props.items" :key="item" :value="item">
          {{ item }}
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>