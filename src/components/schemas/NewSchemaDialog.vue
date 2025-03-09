<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create New Schema</DialogTitle>
        <DialogDescription>
          Select a term to create a new schema from existing imported data.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-4">
        <!-- Term Filters Section -->
        <div class="space-y-2 border-b pb-4">
          <h3 class="text-sm font-medium">Term Filters</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            <div>
              <Label for="year">Year</Label>
              <Select v-model="remoteFilters.year">
                <SelectTrigger>
                  <SelectValue placeholder="Filter by year"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="year in availableYearRange" :key="year" :value="year.toString()">
                    {{ year }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label for="semester">Semester</Label>
              <Select v-model="remoteFilters.semester">
                <SelectTrigger>
                  <SelectValue placeholder="Filter by semester"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Semesters</SelectItem>
                  <SelectItem v-for="sem in availableSemesters" :key="sem" :value="sem">
                    {{ sem }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label for="department">Department</Label>
              <Select v-model="localFilters.department">
                <SelectTrigger>
                  <SelectValue placeholder="Filter by department"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem v-for="dept in availableDepartments" :key="dept" :value="dept">
                    {{ dept }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <!-- Loading indicator -->
        <div v-if="loading" class="flex justify-center py-2">
          <span class="text-sm text-muted-foreground">Loading terms...</span>
        </div>

        <div class="space-y-2">
          <Label for="term">Select Imported Term Data</Label>
          <Select v-model="selectedTermId">
            <SelectTrigger>
              <SelectValue placeholder="Select a term"/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="term in filteredTerms" :key="term.id" :value="term.id?.toString()">
                {{ term.semester }} {{ term.year_start }} - {{ term.department }} {{ term.phd ? 'PhD' : '' }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p v-if="!selectedTermId" class="text-sm text-muted-foreground">
            Select a term to continue
          </p>
        </div>

        <div class="space-y-2">
          <Label for="name">Schema Term Name</Label>
          <Input id="name" v-model="schemaRequest.term" placeholder="Enter a name for the term"/>
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
import {ref, computed, watch, onMounted} from 'vue'
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
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import type {components} from '@/../schema'
import {client} from "@/lib/client.ts";
import {
  CalendarDate,
  DateFormatter,
  parseAbsoluteToLocal,
  ZonedDateTime,
  getLocalTimeZone,
  parseDate,
  parseDateTime,
  toCalendarDate,
  parseZonedDateTime,
  fromDate,
} from "@internationalized/date";

type Term = components['schemas']['AISObdobie'];
type SchemaRequest = components['schemas']['schemaRequest'];
type Schema = components['schemas']['schema'];

// Terms are now fetched from API based on filters
const terms = ref<Term[]>([])
const loading = ref<boolean>(false)

// Define static semester options
const STATIC_SEMESTERS: string[] = ['ZS', 'LS']  // Winter Semester, Summer Semester

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

const selectedTermId = ref<string | undefined>(undefined)


// Simplified emits with proper types
const emit = defineEmits<{
  'update:open': [value: boolean];
  'schema-created': [schema: Schema, termId: number];
}>()

const currentYear: number = new Date().getFullYear()

// Generate year range from 2010 to next year
const availableYearRange = computed<number[]>(() => {
  const years: number[] = []
  for (let year = currentYear + 1; year >= 2010; year--) {
    years.push(year)
  }
  return years
})

// Term filtering - default to current year
const remoteFilters = ref<{
  year: string;
  semester: string;
}>({
  year: currentYear.toString(),
  semester: 'all'
})

const localFilters = ref<{
  department: string;
}>({
  department: 'all'
})

// We now filter terms locally for department
const filteredTerms = computed<Term[]>(() => {
  if (localFilters.value.department === 'all') {
    return terms.value
  }

  return terms.value.filter((term: Term) =>
      term.department === localFilters.value.department
  )
})

// Using static semester options instead
const availableSemesters = computed<string[]>(() => STATIC_SEMESTERS)

const availableDepartments = computed<string[]>(() => {
  const departments = new Set<string>(
      terms.value
          .map((t: Term) => t.department)
          .filter((dept): dept is string => dept !== undefined && dept !== null)
  )
  return [...departments].sort()
})

// Selected term details
const selectedTerm = computed<Term | null>(() => {
  if (!selectedTermId.value) return null
  return terms.value.find((t: Term) => t.id.toString() === selectedTermId.value) || null
})


// Computed
const canCreateSchema = computed<boolean>(() => {
  return !!selectedTermId.value &&
      !!schemaRequest.value.term && schemaRequest.value.term.trim() !== '' &&
      !!startDate.value &&
      !!endDate.value
})

function createSchema() {
  if (!canCreateSchema.value || !selectedTermId.value) return

  schemaRequest.value.start_date = startDate.value?.toString() || ''
  schemaRequest.value.end_date = endDate.value ? endDate.value.toString() : ''
  schemaRequest.value.term = selectedTermId.value.toString()

  client.POST('/api/schemas/', {
    body: schemaRequest.value
  }).then(({data}) => {
    if (data) {
      emit('schema-created', data, parseInt(selectedTermId.value))
      emit('update:open', false)
      clearAll()
    }
  }).catch((err) => {
    console.error('Error creating schema:', err)
  })
}

async function fetchTerms(): Promise<void> {
  try {
    loading.value = true

    // Only use year and semester for API filtering
    const yearFilter = remoteFilters.value.year === 'all' ? undefined : remoteFilters.value.year
    const semesterFilter: 'LS' | 'ZS' | undefined = remoteFilters.value.semester === 'all' ? undefined : remoteFilters.value.semester as 'LS' | 'ZS' | undefined

    const {data} = await client.GET('/api/imports_exports/fei/terms/', {
      params: {
        query: {
          year_start_contains: yearFilter,
          semester: semesterFilter,
          limit: 100
        }
      },
    })

    if (data) {
      // Ensure we're handling the response structure correctly
      terms.value = Array.isArray(data.results) ? data.results :
          (Array.isArray(data) ? data : [])
    }
  } catch (err) {
    console.error('Error fetching terms:', err)
  } finally {
    loading.value = false
  }
}

function clearAll() {
  selectedTermId.value = undefined
  schemaRequest.value.term = ''
  schemaRequest.value.is_active = false
  startDate.value = undefined
  endDate.value = undefined
}

// When a term is selected, update the term name field and date fields
watch(selectedTerm, (newTerm) => {
  if (newTerm) {
    schemaRequest.value.term = newTerm.id.toString()

    // Set start and end dates if available in the term
    if (newTerm.start_date) {
      try {
        startDate.value = toCalendarDate(fromDate(new Date(newTerm.start_date), getLocalTimeZone()))
      } catch (err) {
        console.error('Error parsing start date:', err)
      }
    }

    if (newTerm.end_date) {
      try {
        endDate.value = toCalendarDate(fromDate(new Date(newTerm.end_date), getLocalTimeZone()))
      } catch (err) {
        console.error('Error parsing end date:', err)
      }
    }
  } else {
    clearAll()
  }
}, {immediate: true})

// Watch only remote filters to trigger API calls
let filterTimeout: number | null = null
watch(() => ({...remoteFilters.value}), () => {
  if (filterTimeout) {
    clearTimeout(filterTimeout)
  }

  filterTimeout = setTimeout(() => {
    fetchTerms()
  }, 300) as unknown as number
}, {deep: true})

watch([filteredTerms, selectedTermId], () => {
  if (selectedTermId.value && 
      !filteredTerms.value.some(term => term.id.toString() === selectedTermId.value)) {

    clearAll()
  }
})

onMounted(() => {
  fetchTerms()
})
</script>