<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Edit Schema</DialogTitle>
        <DialogDescription>
          Update the details of your schema.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-4">
        <div class="space-y-2">
          <Label for="edit-name">Schema Term</Label>
          <Input id="edit-name" v-model="localSchema.term" placeholder="Enter a name for the term" />
        </div>

        <div class="space-y-2">
          <Label for="edit-start-date">Start Date</Label>
          <Popover>
            <PopoverTrigger as-child>
              <Button
                id="edit-start-date"
                variant="outline"
                :class="cn(
                  'w-full justify-start text-left font-normal',
                  !startDate && 'text-muted-foreground'
                )"
              >
                <CalendarIcon class="mr-2 h-4 w-4" />
                {{ startDate ? format(startDate, 'PPP') : "Select start date" }}
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
          <Label for="edit-end-date">End Date</Label>
          <Popover>
            <PopoverTrigger as-child>
              <Button
                id="edit-end-date"
                variant="outline"
                :class="cn(
                  'w-full justify-start text-left font-normal',
                  !endDate && 'text-muted-foreground'
                )"
              >
                <CalendarIcon class="mr-2 h-4 w-4" />
                {{ endDate ? format(endDate, 'PPP') : "Select end date" }}
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
          <Checkbox id="edit-is-active" v-model:checked="localSchema.is_active" />
          <Label for="edit-is-active">Set as active schema</Label>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="$emit('update:open', false)">Cancel</Button>
        <Button @click="updateSchema">Update Schema</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { format, parseISO, formatISO } from 'date-fns'
  import { CalendarIcon } from 'lucide-vue-next'
  import { cn } from '@/lib/utils'
  import { Button } from '@/components/ui/button'
  import { Checkbox } from '@/components/ui/checkbox'
  import { Calendar } from '@/components/ui/calendar'
  import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '@/components/ui/dialog'
  import { Input } from '@/components/ui/input'
  import { Label } from '@/components/ui/label'
  import type { components } from '@/../schema'

  type Schema = components['schemas']['schema'];

  const props = defineProps<{
    open: boolean;
    schema: Schema;
  }>()

  const emit = defineEmits<{
    'update:open': [value: boolean];
    'update': [schema: Schema];
  }>()

  // Local copy of the schema
  const localSchema = ref<Schema>({
    id: 0,
    term: '',
    start_date: '',
    end_date: '',
    is_active: false,
  })

  // Date pickers
  const startDate = ref<Date | undefined>(undefined)
  const endDate = ref<Date | undefined>(undefined)

  function updateSchema() {
    // Update schema dates from Date objects
    const updatedSchema = {
      ...localSchema.value,
      start_date: startDate.value ? formatISO(startDate.value, { representation: 'date' }) : '',
      end_date: endDate.value ? formatISO(endDate.value, { representation: 'date' }) : '',
    }

    emit('update', updatedSchema)
  }

  // Convert ISO string to Date object
  function isoToDate(isoString: string | null | undefined): Date | undefined {
    if (!isoString) return undefined
    try {
      return parseISO(isoString)
    } catch (e) {
      console.error('Error converting ISO to Date:', e)
      return undefined
    }
  }

  // When the schema prop changes, update local copy and date pickers
  watch(() => props.schema, (newSchema) => {
    if (newSchema) {
      localSchema.value = { ...newSchema }
      startDate.value = isoToDate(newSchema.start_date)
      endDate.value = isoToDate(newSchema.end_date)
    }
  }, { immediate: true })
</script>