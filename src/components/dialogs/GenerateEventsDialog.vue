<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { useForm } from 'vee-validate'
import { z } from 'zod'
import { toTypedSchema } from '@vee-validate/zod'
import { useTimetableEventStore } from '@/store/timetableEvents'
import { useSubjectGroupStore } from '@/store/subjectGroups'
import { Loader2, Check, ChevronsUpDown } from 'lucide-vue-next'
import { components } from 'schema'
import { cn } from '@/lib/utils'

type Timetable = components['schemas']['TT']

const props = defineProps<{
  open: boolean
  timetable: Timetable | null
  isLoading?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'generate': [result: { success: boolean, message: string }]
}>()

const timetableEventStore = useTimetableEventStore()
const subjectGroupStore = useSubjectGroupStore()
const isGenerating = ref(false)
const isLoadingGroups = ref(false)

// Form validation schema
const formSchema = toTypedSchema(
  z.object({
    subjectGroupName: z.string().min(1, "Subject group is required"),
    ttProgram: z.string().min(1, "Program specification is required"),
  })
)

// Setup form
const { handleSubmit, values, setFieldValue, errors, resetForm } = useForm({
  validationSchema: formSchema,
  initialValues: {
    subjectGroupName: '',
    ttProgram: ''
  }
})

// Watch for dialog open state to load subject groups
watch(() => props.open, async (isOpen) => {
  if (isOpen && subjectGroupStore.subjectGroups.length === 0) {
    isLoadingGroups.value = true
    try {
      await subjectGroupStore.fetchSubjectGroups()
    } finally {
      isLoadingGroups.value = false
    }
  }
}, { immediate: true })

// Format subject groups for combobox
const subjectGroupOptions = computed(() => {
  return subjectGroupStore.subjectGroups.map(group => ({
    label: group.name,
    value: group.name
  }))
})

// Update open state
const updateOpen = (value: boolean) => {
  emit('update:open', value)
  if (!value) {
    resetForm()
  }
}

// Generate events
const onSubmit = handleSubmit(async (values) => {
  if (!props.timetable) return
  
  isGenerating.value = true
  try {
    const result = await timetableEventStore.generateTimetableEvents(
      props.timetable,
      values.subjectGroupName,
      values.ttProgram
    )
    
    if (result.success) {
      emit('generate', { 
        success: true, 
        message: 'Events generated successfully!' 
      })
      updateOpen(false)
    } else {
      emit('generate', { 
        success: false, 
        message: `Failed to generate events: ${result.error}` 
      })
    }
  } catch (error) {
    emit('generate', { 
      success: false, 
      message: `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}` 
    })
  } finally {
    isGenerating.value = false
  }
})
</script>

<template>
  <Dialog :open="open" @update:open="updateOpen">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Generate Timetable Activities</DialogTitle>
        <DialogDescription>
          Generate activities for {{ timetable?.name || 'this timetable' }} using the options below.
        </DialogDescription>
      </DialogHeader>
      
      <form @submit.prevent="onSubmit" class="space-y-4">
        <FormField name="subjectGroupName">
          <FormItem class="flex flex-col">
            <FormLabel>Subject Group</FormLabel>
            <Popover>
              <PopoverTrigger as-child>
                <FormControl>
                  <Button
                    variant="outline"
                    role="combobox"
                    :class="cn('w-full justify-between', !values.subjectGroupName && 'text-muted-foreground')"
                  >
                    {{ values.subjectGroupName ? subjectGroupOptions.find(
                      (group) => group.value === values.subjectGroupName,
                    )?.label : 'Select subject group...' }}
                    <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent class="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <CommandInput placeholder="Search subject groups..." />
                  <CommandList>
                    <div v-if="isLoadingGroups" class="flex items-center justify-center p-2">
                      <Loader2 class="h-4 w-4 animate-spin mr-2" /> Loading...
                    </div>
                    <CommandEmpty>No subject groups found.</CommandEmpty>
                    <CommandGroup v-if="!isLoadingGroups">
                      <CommandItem
                        v-for="group in subjectGroupOptions"
                        :key="group.value"
                        :value="group.label"
                        @select="() => {
                          setFieldValue('subjectGroupName', group.value)
                        }"
                      >
                        {{ group.label }}
                        <Check
                          :class="cn('ml-auto h-4 w-4', group.value === values.subjectGroupName ? 'opacity-100' : 'opacity-0')"
                        />
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FormMessage>
              {{ errors.subjectGroupName }}
            </FormMessage>
          </FormItem>
        </FormField>
        
        <div class="space-y-2">
          <Label for="ttProgram">Program Specification</Label>
          <Input
            id="ttProgram"
            v-model="values.ttProgram"
            placeholder="Enter program specification"
          />
          <p v-if="errors.ttProgram" class="text-sm text-red-500">
            {{ errors.ttProgram }}
          </p>
        </div>
        
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            @click="updateOpen(false)"
            :disabled="isGenerating || props.isLoading"
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            :disabled="isGenerating || props.isLoading"
          >
            <Loader2 v-if="isGenerating || props.isLoading" class="mr-2 h-4 w-4 animate-spin" />
            Generate
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
