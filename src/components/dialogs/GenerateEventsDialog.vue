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

// Form validation schema
const formSchema = toTypedSchema(
  z.object({
    subjectGroupName: z.string().min(1, "Subject group is required"),
  })
)

// Setup form
const { handleSubmit, values, setFieldValue, errors, resetForm } = useForm({
  validationSchema: formSchema,
  initialValues: {
    subjectGroupName: '',
  }
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
  try {
    const result = await timetableEventStore.generateTimetableEvents(
      props.timetable.id,
      values.subjectGroupName,
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
        <ComboBox
          :options="subjectGroupOptions"
          title="Subject Group"
          search-placeholder="Select subject group..."
          :loading="subjectGroupStore.isLoadingGroups"
          @update:selection="setFieldValue('subjectGroupName', $event)"
        >
          <template #empty>No subject groups found.</template>
        </ComboBox>
        
        <FormField name="subjectGroupName">
          <FormItem>
            <FormMessage />
          </FormItem>
        </FormField>
        
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
