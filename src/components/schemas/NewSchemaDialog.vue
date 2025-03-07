<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Create New Schema</DialogTitle>
        <DialogDescription>
          Select a term to create a new schema from existing imported data.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-4">
        <div class="space-y-2">
          <Label for="term">Select Imported Term Data</Label>
          <Select v-model="selectedTermId">
            <SelectTrigger>
              <SelectValue placeholder="Select a term" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="term in terms" :key="term.id" :value="term.id">
                {{ term.year_start }} - {{ term.semester }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p v-if="!selectedTermId" class="text-sm text-muted-foreground">
            Select a term to continue
          </p>
        </div>

        <div class="space-y-2">
          <Label for="name">Schema Term Name</Label>
          <Input id="name" v-model="schema.term" placeholder="Enter a name for the term" />
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
          <Checkbox id="is-active" v-model:checked="schema.is_active" />
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
  import { ref, computed, watch } from 'vue'
  import { format, formatISO } from 'date-fns'
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
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
  import type { components } from '@/../schema'

  interface Term {
    id: number;
    year_start: string | number;
    semester: string | number;
  }

  type SchemaRequest = components['schemas']['schemaRequest'];


  const props = defineProps<{
    open: boolean;
    terms: Term[];
    schema: SchemaRequest;
    termId: number | null;
  }>()

  const emit = defineEmits<{
    'update:open': [value: boolean];
    'update:termId': [value: number | null];
    'create': [schema: SchemaRequest, termId: number];
  }>()

  const selectedTermId = computed({
    get: () => props.termId,
    set: (value) => emit('update:termId', value)
  })

  // Date pickers
  const startDate = ref<Date | undefined>(undefined)
  const endDate = ref<Date | undefined>(undefined)

  // Computed
  const canCreateSchema = computed(() => {
    return selectedTermId.value &&
      props.schema.term.trim() !== '' &&
      startDate.value &&
      endDate.value
  })

  function createSchema() {
    if (!canCreateSchema.value || !selectedTermId.value) return

    // Convert dates to ISO format strings
    const schemaWithDates = {
      ...props.schema,
      start_date: startDate.value ? formatISO(startDate.value, { representation: 'date' }) : '',
      end_date: endDate.value ? formatISO(endDate.value, { representation: 'date' }) : '',
    }

    emit('create', schemaWithDates, selectedTermId.value)
  }

  // When a term is selected, update the term name field
  watch(selectedTermId, (newId) => {
    if (newId) {
      const selectedTerm = props.terms.find(term => term.id === newId)
      if (selectedTerm) {
        props.schema.term = `${selectedTerm.year_start} - ${selectedTerm.semester}`
      }
    }
  })
</script>