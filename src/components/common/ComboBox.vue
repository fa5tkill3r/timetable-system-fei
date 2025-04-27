<script setup lang="ts">
import { defineProps, watch, ref, onMounted, computed } from 'vue'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils.ts'
import { toTypedSchema } from '@vee-validate/zod'
import { Check, ChevronsUpDown, Option, X } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import * as z from 'zod'

// Use defineModel for two-way binding
const selection = defineModel<any>('selection', {
  required: true,
  default: null,
})

export interface ComboboxOption {
  id: any
  name: string
}

const props = defineProps({
  options: {
    type: Array as () => ComboboxOption[],
    required: true,
    default: () => [],
    validator: (value: any[]): value is ComboboxOption[] => {
      return value.every((option) => 'id' in option && 'name' in option)
    },
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: false,
  },
  searchPlaceholder: {
    type: String,
    default: 'Search options...',
  },
  loading: {
    type: Boolean,
    default: false,
  },
  multiple: {
    type: Boolean,
    default: false,
  }
})

// Initialize selection as array if multiple mode is active
onMounted(() => {
  if (props.multiple && !Array.isArray(selection.value)) {
    selection.value = selection.value ? [selection.value] : []
  }
})

const formSchema = toTypedSchema(
  z.object({
    selection: z.any({
      required_error: 'Please select an option.',
    }),
  }),
)

const { handleSubmit, setFieldValue, values } = useForm({
  validationSchema: formSchema,
})

const isOpen = ref(false)

const handleSelect = (optionId: any) => {
  if (props.multiple) {
    // Handle multi-select
    if (Array.isArray(selection.value)) {
      const index = selection.value.indexOf(optionId)
      if (index === -1) {
        selection.value = [...selection.value, optionId]
      } else {
        selection.value = selection.value.filter(id => id !== optionId)
      }
    } else {
      selection.value = [optionId]
    }
    
    // Keep dropdown open for multi-select
  } else {
    // Single select behavior
    setFieldValue('selection', optionId)
    selection.value = optionId
    isOpen.value = false
  }
}

const removeItem = (optionId: any) => {
  if (props.multiple && Array.isArray(selection.value)) {
    selection.value = selection.value.filter(id => id !== optionId)
  }
}

const displayText = computed(() => {
  if (!selection.value) return props.searchPlaceholder
  
  if (props.multiple && Array.isArray(selection.value)) {
    if (selection.value.length === 0) return props.searchPlaceholder
    
    const first = props.options.find(opt => opt.id === selection.value[0])?.name
    return selection.value.length === 1 
      ? first 
      : `${first} +${selection.value.length - 1} more`
  }
  
  return props.options.find(option => option.id === selection.value)?.name || props.searchPlaceholder
})

const isOptionSelected = (optionId: any) => {
  if (props.multiple && Array.isArray(selection.value)) {
    return selection.value.includes(optionId)
  }
  return optionId === values.selection
}

onMounted(() => {
  if (selection.value !== null && selection.value !== undefined) {
    setFieldValue('selection', selection.value)
  }
})

watch(() => selection.value, (newValue) => {
  if (newValue !== values.selection) {
    setFieldValue('selection', newValue)
  }
})
</script>

<template>
  <FormField name="selection" class="w-full">
    <FormItem class="flex flex-col">
      <FormLabel>{{ title }}</FormLabel>
      <Popover v-model:open="isOpen">
        <PopoverTrigger as-child>
          <FormControl>
            <Button variant="outline" role="combobox" :class="cn('w-full flex justify-between', !values.selection && 'text-muted-foreground')">
              <span class="truncate">{{ displayText }}</span>
              <ChevronsUpDown class="ml-auto h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent class="w-[var(--radix-popover-trigger-width)] p-0">
          <Command>
            <CommandInput :placeholder="searchPlaceholder" />
            <!-- Selected tags/pills for multi-select -->
            <div v-if="multiple && Array.isArray(selection) && selection.length > 0" class="flex flex-wrap gap-1 p-2">
              <div 
                v-for="selectedId in selection" 
                :key="selectedId"
                class="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs"
              >
                {{ options.find(opt => opt.id === selectedId)?.name }}
                <button @click.stop="removeItem(selectedId)" type="button" class="rounded-full h-4 w-4 flex items-center justify-center hover:bg-muted">
                  <X class="h-3 w-3" />
                </button>
              </div>
            </div>
            <CommandList>
              <div v-if="loading" class="flex items-center justify-center p-2">
                <div class="h-4 w-4 animate-spin mr-2" /> Loading...
              </div>
              <CommandEmpty v-else>
                <slot name="empty">Nič sme nenašli</slot>
              </CommandEmpty>
              <CommandGroup v-if="!loading">
                <CommandItem 
                  v-for="option in options" 
                  :key="option.id" 
                  :value="option.name" 
                  @select="() => handleSelect(option.id)"
                >
                  <Check :class="cn(
                    'mr-2 h-4 w-4',
                    isOptionSelected(option.id) ? 'opacity-100' : 'opacity-0',
                  )" />
                  {{ option.name }}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <FormDescription>
        {{ description }}
      </FormDescription>
      <FormMessage />
    </FormItem>
  </FormField>
</template>
