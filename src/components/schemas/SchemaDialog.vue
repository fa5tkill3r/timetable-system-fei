<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>{{ isEditMode ? 'Edit Schema' : 'Create Schema' }}</DialogTitle>
        <DialogDescription>
          {{ isEditMode ? 'Update the schema details below.' : 'Fill in the details to create a new schema.' }}
        </DialogDescription>
      </DialogHeader>
      <form @submit.prevent="handleSubmit">
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label for="human_name">Name</Label>
            <Input id="human_name" v-model="formData.human_name" required placeholder="Enter schema name" />
          </div>
          
          <div class="space-y-2">
            <Label for="start-date">Start Date</Label>
            <Popover>
              <PopoverTrigger as-child>
                <Button
                  id="start-date"
                  variant="outline"
                  :class="cn(
                    'w-full justify-start text-left font-normal',
                    !startDate && 'text-muted-foreground'
                  )"
                >
                  <CalendarIcon class="mr-2 h-4 w-4"/>
                  {{ startDate ? df.format(startDate.toDate(getLocalTimeZone())) : "Select start date" }}
                </Button>
              </PopoverTrigger>
              <PopoverContent class="w-auto p-0">
                <Calendar
                  mode="single"
                  v-model="startDate"
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div class="space-y-2">
            <Label for="end-date">End Date</Label>
            <Popover>
              <PopoverTrigger as-child>
                <Button
                  id="end-date"
                  variant="outline"
                  :class="cn(
                    'w-full justify-start text-left font-normal',
                    !endDate && 'text-muted-foreground'
                  )"
                >
                  <CalendarIcon class="mr-2 h-4 w-4"/>
                  {{ endDate ? df.format(endDate.toDate(getLocalTimeZone())) : "Select end date" }}
                </Button>
              </PopoverTrigger>
              <PopoverContent class="w-auto p-0">
                <Calendar
                  mode="single"
                  v-model="endDate"
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="$emit('update:open', false)">Cancel</Button>
          <Button type="submit" :disabled="isLoading || !isFormValid">
            <span v-if="isLoading" class="mr-2">
              <div
                class="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full inline-block">
              </div>
            </span>
            {{ isEditMode ? 'Update' : 'Create' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { CalendarIcon } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import type { components } from '@/../schema'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import {
  CalendarDate,
  DateFormatter,
  getLocalTimeZone,
  parseDate
} from "@internationalized/date"

type Schema = components['schemas']['schema']
type SchemaRequest = components['schemas']['schemaRequest']

const props = defineProps<{
  open: boolean
  schema?: Schema | null
  isLoading?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save': [schemaData: SchemaRequest, id?: number]
}>()

const isEditMode = computed(() => !!props.schema?.id)

// Date formatting
const df = new DateFormatter('en', {
  dateStyle: 'long',
})

// Date pickers
const startDate = ref<CalendarDate>()
const endDate = ref<CalendarDate>()

// Form data with default values
const formData = ref<SchemaRequest>({
  human_name: '',
  start_date: '',
  end_date: ''
})

// Check if form is valid
const isFormValid = computed(() => {
  return !!formData.value.human_name && 
         formData.value.human_name.trim() !== '' &&
         !!startDate.value &&
         !!endDate.value
})

// Update form data when schema prop changes
watch(() => props.schema, (newSchema) => {
  if (newSchema) {
    formData.value = {
      human_name: newSchema.human_name || '',
      start_date: newSchema.start_date || '',
      end_date: newSchema.end_date || ''
    }
    
    // Parse dates for the date pickers
    if (newSchema.start_date) {
      try {
        startDate.value = parseDate(newSchema.start_date)
      } catch (e) {
        console.error('Error parsing start date:', e)
      }
    }
    
    if (newSchema.end_date) {
      try {
        endDate.value = parseDate(newSchema.end_date)
      } catch (e) {
        console.error('Error parsing end date:', e)
      }
    }
  } else {
    // Reset form if no schema is provided
    resetForm()
  }
}, { immediate: true })

function handleSubmit() {
  if (!isFormValid.value) return
  
  // Prepare data for submission
  const requestData: SchemaRequest = {
    human_name: formData.value.human_name,
    start_date: startDate.value?.toString() || '',
    end_date: endDate.value?.toString() || ''
  }
  
  emit('save', requestData, props.schema?.id)
}

function resetForm() {
  formData.value = {
    human_name: '',
    start_date: '',
    end_date: ''
  }
  startDate.value = undefined
  endDate.value = undefined
}
</script>
