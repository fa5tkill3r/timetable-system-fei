<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Create New Schema</DialogTitle>
        <DialogDescription>
          Create a new schema by entering a name and date range.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-4">
        <div class="space-y-2">
          <Label for="name">Schema Name</Label>
          <Input id="name" v-model="schemaRequest.term" placeholder="Enter a name for the schema"/>
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

        <div class="flex items-center space-x-2">
          <Checkbox id="is-active" v-model:checked="schemaRequest.is_active"/>
          <Label for="is-active">Set as active schema</Label>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="$emit('update:open', false)">Cancel</Button>
        <Button
          :disabled="!canCreateSchema"
          @click="createSchema"
        >
          Create Schema
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import {ref, computed} from 'vue'
import {CalendarIcon} from 'lucide-vue-next'
import {cn} from '@/lib/utils'
import {Button} from '@/components/ui/button'
import {Checkbox} from '@/components/ui/checkbox'
import {Calendar} from '@/components/ui/calendar'
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import type {components} from '@/../schema'
import {client} from "@/lib/client.ts"
import {
  CalendarDate,
  DateFormatter,
  getLocalTimeZone,
  toCalendarDate,
  fromDate,
} from "@internationalized/date"

type SchemaRequest = components['schemas']['schemaRequest'];
type Schema = components['schemas']['schema'];

const props = defineProps<{
  open: boolean;
}>()

// Date pickers
const startDate = ref<CalendarDate>()
const endDate = ref<CalendarDate>()

const df = new DateFormatter('sk-SK', {
  dateStyle: 'long',
})

const schemaRequest = ref<SchemaRequest>({
  term: '',
  start_date: '',
  end_date: '',
  is_active: false
})

// Emit events
const emit = defineEmits<{
  'update:open': [value: boolean];
  'schema-created': [schema: Schema];
}>()

// Computed
const canCreateSchema = computed<boolean>(() => {
  return !!schemaRequest.value.term && 
         schemaRequest.value.term.trim() !== '' &&
         !!startDate.value &&
         !!endDate.value
})

async function createSchema() {
  if (!canCreateSchema.value) return

  // Format dates to ISO strings for the API
  const formattedStartDate = startDate.value?.toDate(getLocalTimeZone()).toISOString().split('T')[0]
  const formattedEndDate = endDate.value?.toDate(getLocalTimeZone()).toISOString().split('T')[0]
  
  // Prepare request
  const request = {
    ...schemaRequest.value,
    start_date: formattedStartDate,
    end_date: formattedEndDate
  }

  try {
    const {data, error} = await client.POST('/api/schemas/', {
      body: request
    })

    if (error) {
      console.error('Error creating schema:', error)
      return
    }

    if (data) {
      emit('schema-created', data)
      emit('update:open', false)
      resetForm()
    }
  } catch (err) {
    console.error('Error creating schema:', err)
  }
}

function resetForm() {
  schemaRequest.value = {
    term: '',
    start_date: '',
    end_date: '',
    is_active: false
  }
  startDate.value = undefined
  endDate.value = undefined
}
</script>