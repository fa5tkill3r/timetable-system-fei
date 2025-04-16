<script setup lang="ts">
  import { defineProps, defineEmits, watch, ref } from 'vue'
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
  import { toast } from '@/components/ui/toast'
  import { cn } from '@/lib/utils.ts'
  import { toTypedSchema } from '@vee-validate/zod'
  import { Check, ChevronsUpDown } from 'lucide-vue-next'
  import { useForm } from 'vee-validate'
  import * as z from 'zod'
  import { NavigationMenuContent } from 'radix-vue'

  const props = defineProps({
    options: {
      type: Array,
      required: true,
      default: () => [],
      validator: (value: any[]) => {
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
  })

  const emit = defineEmits(['update:selection'])

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
    setFieldValue('selection', optionId)
    isOpen.value = false
  }

  // Watch for changes to the selection and emit them to parent
  watch(() => values.selection, (newValue) => {
    emit('update:selection', newValue)
  })
</script>

<template>
  <FormField name="selection" class="w-full">
    <FormItem class="flex flex-col">
      <FormLabel>{{ title }}</FormLabel>
      <Popover v-model:open="isOpen">
        <PopoverTrigger as-child>
          <FormControl>
            <Button
              variant="outline"
              role="combobox"
              :class="
                cn('w-full', !values.selection && 'text-muted-foreground')
              "
            >
              {{
                values.selection
                  ? options.find((option) => option.id === values.selection)
                      ?.name
                  : searchPlaceholder
              }}
              <ChevronsUpDown class="ml-auto h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent class="w-[var(--radix-popover-trigger-width)] p-0">
          <Command>
            <CommandInput :placeholder="searchPlaceholder" />
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
                  @select="
                    () => {
                      handleSelect(option.id)
                    }
                  "
                >
                  <Check
                    :class="
                      cn(
                        'mr-2 h-4 w-4',
                        option.id === values.selection
                          ? 'opacity-100'
                          : 'opacity-0',
                      )
                    "
                  />
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
