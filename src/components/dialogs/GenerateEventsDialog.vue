<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useForm } from 'vee-validate'
import { z } from 'zod'
import { toTypedSchema } from '@vee-validate/zod'
import { useTimetableEventStore } from '@/store/timetableEvents'
import { useSubjectGroupStore } from '@/store/subjectGroups'
import { Loader2 } from 'lucide-vue-next'
import { components } from 'schema'
import ComboBox from '@/components/common/ComboBox.vue'

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
const selectedSubjectGroup = ref<string[]>([]) // Keep as array for multi-select
const progressMessage = ref('')
const totalGroups = ref(0)
const processedGroups = ref(0)

// Form validation schema
const formSchema = toTypedSchema(
  z.object({
    subjectGroupName: z.string().array().min(1, "At least one subject group is required"),
  })
)

// Setup form
const { handleSubmit, values, setFieldValue, errors, resetForm } = useForm({
  validationSchema: formSchema,
  initialValues: {
    subjectGroupName: [],
  }
})

// Watch for changes to the selected subject group to update form field
watch(selectedSubjectGroup, (newValue) => {
  setFieldValue('subjectGroupName', newValue)
})

// Watch for dialog open state to load subject groups
watch(() => props.open, async (isOpen) => {
  if (isOpen && subjectGroupStore.subjectGroupGroups.length === 0) {
    try {
      await subjectGroupStore.fetchSubjectGroupGroups()
    } finally {
      // No need to manage local loading state
    }
  }
}, { immediate: true })

// Format subject groups for combobox
const subjectGroupOptions = computed(() => {
  return subjectGroupStore.subjectGroupGroups.map(group => ({
    id: group.name, // Use name as the id since that's what we need
    name: group.name
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
  
  // Track success and errors
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  }
  
  try {
    const groups = Array.isArray(values.subjectGroupName) ? values.subjectGroupName : [values.subjectGroupName]
    totalGroups.value = groups.length
    processedGroups.value = 0
    
    // Process each selected group sequentially
    for (const groupName of groups) {
      progressMessage.value = `Processing group: ${groupName} (${processedGroups.value + 1}/${totalGroups.value})`
      
      try {
        const result = await timetableEventStore.generateTimetableEvents(
          props.timetable.id!,
          groupName,
        )
        
        if (result.success) {
          results.success++
        } else {
          results.failed++
          results.errors.push(`${groupName}: ${result.error}`)
        }
      } catch (error) {
        results.failed++
        results.errors.push(`${groupName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      
      processedGroups.value++
    }
    
    // Generate final message
    if (results.failed === 0) {
      emit('generate', { 
        success: true, 
        message: `Successfully generated events for all ${results.success} subject groups.` 
      })
      updateOpen(false)
    } else if (results.success === 0) {
      emit('generate', { 
        success: false, 
        message: `Failed to generate events: ${results.errors.join('; ')}` 
      })
    } else {
      emit('generate', { 
        success: true, 
        message: `Generated events for ${results.success} groups with ${results.failed} failures. Errors: ${results.errors.join('; ')}` 
      })
      updateOpen(false)
    }
  } catch (error) {
    emit('generate', { 
      success: false, 
      message: `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}` 
    })
  } finally {
    isGenerating.value = false
    progressMessage.value = ''
    totalGroups.value = 0
    processedGroups.value = 0
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
        <ComboBox
          :options="subjectGroupOptions"
          title="Subject Group"
          search-placeholder="Select subject group..."
          :loading="subjectGroupStore.isLoadingGroups"
          v-model:selection="selectedSubjectGroup"
          :multiple="true"
          description="Select one or more subject groups to generate events for"
        >
          <template #empty>No subject groups found.</template>
        </ComboBox>
        
        <FormField name="subjectGroupName">
          <FormItem>
            <FormMessage />
          </FormItem>
        </FormField>
        
        <!-- Show progress when generating multiple groups -->
        <div v-if="isGenerating && totalGroups > 1" class="text-sm">
          <div class="mb-2">{{ progressMessage }}</div>
          <div class="w-full bg-secondary h-2 rounded-full overflow-hidden">
            <div 
              class="bg-primary h-2 transition-all duration-300" 
              :style="`width: ${(processedGroups / totalGroups) * 100}%`"
            ></div>
          </div>
          <div class="mt-1 text-xs text-muted-foreground text-right">
            {{ processedGroups }}/{{ totalGroups }} groups processed
          </div>
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
