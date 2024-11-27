<script setup lang="ts">
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
import { Check, ChevronsUpDown } from 'lucide-vue-next'


const languages = [
  { label: 'English', value: 'en' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
  { label: 'Spanish', value: 'es' },
  { label: 'Portuguese', value: 'pt' },
  { label: 'Russian', value: 'ru' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Korean', value: 'ko' },
  { label: 'Chinese', value: 'zh' },
]




</script>

<template>
  <FormField name="language">
    <FormItem class="flex flex-col">
      <FormLabel>Language</FormLabel>
      <Popover>
        <PopoverTrigger as-child>
          <FormControl>
            <Button
              variant="outline"
              role="combobox"
              :class="cn('w-[200px] justify-between', !values.language && 'text-muted-foreground')"
            >
              {{ values.language ? languages.find(
              (language) => language.value === values.language,
            )?.label : 'Select language...' }}
              <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent class="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="Search language..." />
            <CommandEmpty>Nothing found.</CommandEmpty>
            <CommandList>
              <CommandGroup>
                <CommandItem
                  v-for="language in languages"
                  :key="language.value"
                  :value="language.label"
                  @select="() => {
                      setFieldValue('language', language.value)
                    }"
                >
                  <Check
                    :class="cn('mr-2 h-4 w-4', language.value === values.language ? 'opacity-100' : 'opacity-0')"
                  />
                  {{ language.label }}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <FormDescription>
        This is the language that will be used in the dashboard.
      </FormDescription>
      <FormMessage />
    </FormItem>
  </FormField>
</template>

<style scoped>

</style>