<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
      <DialogHeader>
        <DialogTitle
          >Import Data to "{{ schema?.human_name }}" Schema</DialogTitle
        >
        <DialogDescription>
          Select a term and directory containing CSV files to import to your
          schema.
        </DialogDescription>
      </DialogHeader>

      <div class="py-4">
        <!-- Step indicator -->
        <div class="mb-6 flex items-center justify-center">
          <div
            v-for="(s, index) in steps"
            :key="s"
            class="flex items-center"
          >
            <div
              class="flex h-8 w-8 items-center justify-center rounded-full"
              :class="
                currentStep === index
                  ? 'bg-primary text-primary-foreground'
                  : currentStep > index
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
              "
            >
              {{ index + 1 }}
            </div>
            <span
              class="mx-2"
              :class="
                currentStep === index ? 'font-medium' : 'text-muted-foreground'
              "
            >
              {{ s }}
            </span>
            <div
              v-if="index < steps.length - 1"
              class="mx-2 h-px w-12"
              :class="currentStep > index ? 'bg-primary' : 'bg-muted'"
            ></div>
          </div>
        </div>

        <!-- Step 1: Term Selection -->
        <div v-if="currentStep === 0">
          <!-- Term Filters Section -->
          <div class="mb-4 space-y-2 border-b pb-4">
            <h3 class="text-sm font-medium">Term Filters</h3>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <Label for="year">Year</Label>
                <Select v-model="filters.year">
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    <SelectItem
                      v-for="year in availableYearRange"
                      :key="year"
                      :value="year.toString()"
                    >
                      {{ year }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label for="semester">Semester</Label>
                <Select v-model="filters.semester">
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Semesters</SelectItem>
                    <SelectItem
                      v-for="sem in ['ZS', 'LS']"
                      :key="sem"
                      :value="sem"
                    >
                      {{ sem }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label for="department">Department</Label>
                <Select v-model="filters.department">
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem
                      v-for="dept in availableDepartments"
                      :key="dept"
                      :value="dept"
                    >
                      {{ dept }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <!-- Terms List -->
          <div class="space-y-4">
            <div
              class="max-h-[350px] min-h-[250px] overflow-y-auto rounded-md border"
            >
              <div
                v-if="loadingTerms"
                class="flex h-40 items-center justify-center"
              >
                <div
                  class="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
                ></div>
              </div>
              <div
                v-else-if="filteredTerms.length === 0"
                class="flex h-40 items-center justify-center text-muted-foreground"
              >
                No terms found for the selected filters
              </div>
              <RadioGroup
                v-else
                v-model="selectedTermId"
              >
                <div class="px-1 py-1">
                  <div
                    v-for="term in filteredTerms"
                    :key="term.id"
                    class="mb-1 flex items-center space-x-2 rounded-md p-2 hover:bg-accent"
                    :class="{
                      'bg-accent/50': selectedTermId === term.id!.toString(),
                    }"
                  >
                    <RadioGroupItem
                      :value="term.id!.toString()"
                      :id="`term-${term.id}`"
                    />
                    <label
                      :for="`term-${term.id}`"
                      class="flex-1 cursor-pointer"
                    >
                      {{ term.semester || '?' }} {{ term.year_start || '?' }}
                      {{ term.department || '' }}
                      <span
                        v-if="term.phd"
                        class="ml-1 rounded-full bg-blue-100 px-1 py-0.5 text-xs text-blue-800"
                        >PhD</span
                      >
                    </label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>
        </div>

        <!-- Step 2: File Selection -->
        <div v-else-if="currentStep === 1">
          <p class="mb-4">
            Selected Term:
            <span class="font-medium">
              {{ selectedTerm?.semester }} {{ selectedTerm?.year_start }}
              {{ selectedTerm?.department }}
              <span
                v-if="selectedTerm?.phd"
                class="ml-1 rounded-full bg-blue-100 px-1 py-0.5 text-xs text-blue-800"
                >PhD</span
              >
            </span>
          </p>
          <div class="mb-4">
            <FileExplorer
              v-model="selectedDirectory"
              @csv-stats="handleCsvStats"
            />
          </div>
        </div>

        <!-- Step 3: Confirmation -->
        <div v-else-if="currentStep === 2">
          <div class="space-y-4">
            <div class="rounded-md border bg-muted/30 p-4">
              <h4 class="mb-2 font-medium">Review Import Details</h4>
              <div class="space-y-2">
                <p>
                  <span class="text-muted-foreground">Schema:</span>
                  {{ schema?.human_name }}
                </p>
                <p>
                  <span class="text-muted-foreground">Term:</span>
                  {{ selectedTerm?.semester }} {{ selectedTerm?.year_start }}
                  <span
                    v-if="selectedTerm?.phd"
                    class="ml-1 rounded-full bg-blue-100 px-1 py-0.5 text-xs text-blue-800"
                    >PhD</span
                  >
                </p>
                <p>
                  <span class="text-muted-foreground">Department:</span>
                  {{ selectedTerm?.department || 'Not specified' }}
                </p>
                <p>
                  <span class="text-muted-foreground">Import Directory:</span>
                  {{ selectedDirectory || 'None selected' }}
                </p>
              </div>
            </div>

            <div
              class="flex items-center space-x-2 text-sm"
              :class="hasCsvFiles ? 'text-green-600' : 'text-amber-600'"
            >
              <CheckCircleIcon
                v-if="hasCsvFiles"
                class="h-4 w-4"
              />
              <AlertCircleIcon
                v-else
                class="h-4 w-4"
              />
              <span>{{
                hasCsvFiles
                  ? `CSV Files Found: ${csvFileCount}`
                  : 'No CSV files found in selected directory'
              }}</span>
            </div>
          </div>
        </div>

        <!-- Final result screens -->
        <div v-else-if="currentStep === 3 && importing">
          <div class="flex flex-col items-center justify-center py-8">
            <div
              class="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"
            ></div>
            <p>Importing data... This may take a moment.</p>
          </div>
        </div>

        <div v-else-if="currentStep === 3 && importSuccess">
          <div class="mb-4 rounded-md border border-green-200 bg-green-50 p-4">
            <div class="flex">
              <CheckIcon class="mr-2 h-5 w-5 flex-shrink-0 text-green-500" />
              <p>
                Import successful! The data has been imported to your schema.
              </p>
            </div>
          </div>
        </div>

        <div v-else-if="currentStep === 3 && importError">
          <div class="mb-4 rounded-md border border-red-200 bg-red-50 p-4">
            <div class="flex">
              <AlertTriangleIcon
                class="mr-2 h-5 w-5 flex-shrink-0 text-red-500"
              />
              <div>
                <p class="font-medium">Import failed</p>
                <p class="text-sm">
                  {{ errorMessage || 'An unknown error occurred' }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation buttons -->
        <div class="mt-6 flex justify-between">
          <Button
            v-if="currentStep > 0 && currentStep < 3"
            variant="outline"
            @click="currentStep--"
          >
            Back
          </Button>
          <div v-else></div>

          <div>
            <Button
              variant="outline"
              @click="emit('update:open', false)"
              class="mr-2"
            >
              {{ currentStep === 3 ? 'Close' : 'Cancel' }}
            </Button>

            <Button
              v-if="currentStep < 2"
              @click="nextStep"
              :disabled="
                (currentStep === 0 && !selectedTermId) ||
                (currentStep === 1 && !selectedDirectory)
              "
            >
              Next
            </Button>

            <Button
              v-else-if="currentStep === 2"
              @click="importData"
              :disabled="!canImport || importing"
            >
              Import Data
            </Button>

            <Button
              v-else-if="currentStep === 3 && importError"
              variant="outline"
              @click="currentStep = 0"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onMounted } from 'vue'
  import {
    CheckIcon,
    AlertTriangleIcon,
    CheckCircleIcon,
    AlertCircleIcon,
  } from 'lucide-vue-next'
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
  } from '@/components/ui/dialog'
  import { Button } from '@/components/ui/button'
  import { Label } from '@/components/ui/label'
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select'
  import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
  import FileExplorer from '@/components/common/FileExplorer.vue'
  import { client } from '@/lib/client'
  import type { components } from '@/types/schema'

  type Schema = components['schemas']['schema']
  type Term = components['schemas']['AISObdobie']

  const props = defineProps<{
    open: boolean
    schema?: Schema
  }>()

  const emit = defineEmits<{
    'update:open': [value: boolean]
    success: []
  }>()

  const steps = ['Select Term', 'Select Directory', 'Confirm Import']
  const currentStep = ref(0)

  const terms = ref<Term[]>([])
  const selectedTermId = ref<string>('')
  const loadingTerms = ref(false)
  const currentYear = new Date().getFullYear()

  const availableYearRange = computed<number[]>(() => {
    const years: number[] = []
    for (let year = currentYear + 1; year >= 2010; year--) {
      years.push(year)
    }
    return years
  })

  const filters = ref({
    year: currentYear.toString(),
    semester: 'all',
    department: 'all',
  })

  const filteredTerms = computed(() => {
    if (filters.value.department === 'all') {
      return terms.value
    }
    return terms.value.filter(
      (term) => term.department === filters.value.department,
    )
  })

  const availableDepartments = computed<string[]>(() => {
    const departments = new Set<string>(
      terms.value
        .map((t: Term) => t.department)
        .filter((dept): dept is string => dept !== undefined && dept !== null),
    )
    return [...departments].sort()
  })

  const selectedDirectory = ref('')
  const hasCsvFiles = ref(false)
  const csvFileCount = ref(0)

  const importing = ref(false)
  const importSuccess = ref(false)
  const importError = ref(false)
  const errorMessage = ref('')

  const selectedTerm = computed<Term | undefined>(() => {
    if (!selectedTermId.value) return undefined
    return terms.value.find((t) => t.id!.toString() === selectedTermId.value)
  })

  const canImport = computed(() => {
    return (
      !!props.schema?.id && !!selectedTermId.value && !!selectedDirectory.value
    )
  })

  async function fetchTerms() {
    loadingTerms.value = true

    try {
      const yearFilter =
        filters.value.year === 'all' ? undefined : filters.value.year
      const semesterFilter =
        filters.value.semester === 'all'
          ? undefined
          : (filters.value.semester as 'LS' | 'ZS' | undefined)

      const { data } = await client.GET('/api/imports_exports/fei/terms/', {
        params: {
          query: {
            year_start_contains: yearFilter,
            semester: semesterFilter,
            limit: 100,
          },
        },
      })

      if (data) {
        terms.value = Array.isArray(data.results)
          ? data.results
          : Array.isArray(data)
            ? data
            : []
      }
    } catch (err) {
      console.error('Error fetching terms:', err)
    } finally {
      loadingTerms.value = false
    }
  }

  function nextStep() {
    if (currentStep.value < steps.length) {
      currentStep.value++
    }
  }

  async function importData() {
    if (!canImport.value) return

    currentStep.value = 3
    importing.value = true
    importSuccess.value = false
    importError.value = false

    try {
      const formattedPath = selectedDirectory.value.startsWith('/')
        ? selectedDirectory.value
        : `/${selectedDirectory.value}`

      const { error } = await client.POST(
        '/api/imports_exports/fei/import/dir/',

        {
          params: {
            query: {
              path: formattedPath,
              term: Number(selectedTermId.value),
            },
            header: {
              'X-Term': props.schema?.schema_name || '',
            },
          },
        },
      )

      if (error) {
        importError.value = true
        errorMessage.value = error.message || 'Failed to import data'
        return
      }

      importSuccess.value = true
      emit('success')
    } catch (err: any) {
      importError.value = true
      errorMessage.value = err.message || 'An error occurred during import'
      console.error(err)
    } finally {
      importing.value = false
    }
  }

  function closeDialog() {
    emit('update:open', false)

    setTimeout(resetState, 300)
  }

  function resetState() {
    currentStep.value = 0
    selectedTermId.value = ''
    selectedDirectory.value = ''
    importSuccess.value = false
    importError.value = false
    errorMessage.value = ''
  }

  watch(
    [() => filters.value.year, () => filters.value.semester],
    ([newYear, newSemester], [oldYear, oldSemester]) => {
      if (newYear !== oldYear || newSemester !== oldSemester) {
        fetchTerms()
      }
    },
  )

  function handleCsvStats(stats: { count: number; hasFiles: boolean }) {
    hasCsvFiles.value = stats.hasFiles
    csvFileCount.value = stats.count
  }

  watch(
    () => props.open,
    (isOpen) => {
      if (isOpen) {
        resetState()
        fetchTerms()
      }
    },
  )

  onMounted(() => {
    if (props.open) {
      fetchTerms()
    }
  })

  watch(
    filteredTerms,
    (newFilteredTerms) => {
      if (
        selectedTermId.value &&
        !newFilteredTerms.some(
          (term) => term.id?.toString() === selectedTermId.value,
        )
      ) {
        selectedTermId.value = ''
      }
    },
    { immediate: true },
  )
</script>
