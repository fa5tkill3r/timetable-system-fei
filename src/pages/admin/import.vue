<template>
  <div class="container py-6 space-y-6">
    <!-- Step indicator -->
    <div class="space-y-2">
      <div class="flex items-center space-x-3">
        <div v-for="(s, index) in steps" :key="s.id" class="flex items-center">
          <div
            class="rounded-full w-8 h-8 flex items-center justify-center"
            :class="step === s.id ? 'bg-primary text-primary-foreground' : 'bg-muted'">
            {{ index + 1 }}
          </div>
          <span class="ml-2" :class="step === s.id ? 'font-medium' : 'text-muted-foreground'">{{ s.label }}</span>
          <div v-if="index < steps.length - 1" class="w-12 h-px bg-muted mx-2"></div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="border rounded-lg shadow-sm p-6 bg-card">
      <!-- Step 1: Directory Browser -->
      <div v-if="step === 'browse'" class="space-y-4">
        <!-- Current path -->
        <div class="flex items-center space-x-2">
          <Button variant="outline" size="sm" @click="navigateUp" :disabled="currentPath === ''">
            <ChevronUpIcon class="h-4 w-4 mr-2" />
            Up
          </Button>
          <div class="px-3 py-1 bg-muted rounded-md text-sm flex-1 overflow-x-auto">
            <span class="whitespace-nowrap">{{ currentPath || '/' }}</span>
          </div>
        </div>

        <!-- File browser -->
        <div class="border rounded-md h-[400px] overflow-y-auto">
          <div v-if="loading" class="flex justify-center items-center h-full">
            <div class="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
          <div v-else-if="error" class="p-4 text-destructive text-center">
            {{ error }}
          </div>
          <div v-else class="divide-y">
            <div
              v-for="item in directoryContents"
              :key="item.name"
              @click="handleItemClick(item)"
              class="flex items-center p-3 hover:bg-accent cursor-pointer transition-colors"
              :class="{'bg-primary/10': isSelectedDir(item)}"
            >
              <FolderIcon v-if="item.isDirectory" class="h-4 w-4 mr-2 text-blue-500" />
              <FileIcon v-else class="h-4 w-4 mr-2" :class="isCsvFile(item.name) ? 'text-green-500' : 'text-gray-500'" />
              <span>{{ item.name }}</span>
              <span v-if="isSelectedDir(item)" class="ml-2 text-xs bg-primary/20 px-2 py-0.5 rounded-full">Selected</span>
            </div>
            <div v-if="directoryContents.length === 0" class="p-4 text-center text-muted-foreground">
              This directory is empty
            </div>
          </div>
        </div>

        <!-- Current directory status -->
        <div class="p-3 bg-muted rounded-md">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <FolderIcon class="h-4 w-4 mr-2 text-primary" />
              <span>Current directory: <span class="font-medium">{{ currentPath || '/' }}</span></span>
            </div>
            <div class="flex items-center">
              <span v-if="hasCsvFiles" class="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                CSV files found: {{ csvFileCount }}
              </span>
              <span v-else class="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                No CSV files
              </span>
            </div>
          </div>
        </div>

        <div class="flex justify-end pt-4">
          <Button
            :disabled="!hasCsvFiles || loading"
            @click="importDirectory"
          >
            Import Current Directory
          </Button>
        </div>
      </div>

      <!-- Other steps remain the same -->
      <!-- Step 2: Importing -->
      <div v-else-if="step === 'importing'" class="py-12 flex flex-col items-center">
        <div class="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
        <p class="text-lg font-medium">Importing data from selected directory...</p>
      </div>

      <!-- Step 3: Success -->
      <div v-else-if="step === 'success'" class="py-4 space-y-6">
        <div class="bg-green-50 border border-green-200 rounded-md p-4">
          <div class="flex">
            <CheckIcon class="h-5 w-5 text-green-500 mr-2" />
            <p>Import successful! The directory has been processed.</p>
          </div>
        </div>
        <p class="text-lg font-medium">What would you like to do next?</p>
        <div class="space-y-3">
          <Button class="w-full justify-start" @click="moveToNextStep">
            <ArrowRightIcon class="h-4 w-4 mr-2" />
            Import data with selected term
          </Button>
          <Button variant="outline" class="w-full justify-start" @click="reset">
            <XIcon class="h-4 w-4 mr-2" />
            Start over
          </Button>
        </div>
      </div>

      <!-- Step 4: Select Term -->
      <div v-else-if="step === 'select-term'" class="py-4 space-y-6">
        <p class="text-lg font-medium">Select the AIS term to import:</p>
        <div class="space-y-4">
          <Select v-model="selectedTermString">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Select a term" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="term in terms"
                :key="term.id"
                :value="String(term.id)"
              >
                {{ term.year_start }} - {{ term.semester }}
              </SelectItem>
            </SelectContent>
          </Select>

          <div class="flex justify-between pt-4">
            <Button variant="outline" @click="step = 'success'">
              Back
            </Button>
            <Button
              :disabled="!selectedTermString"
              @click="importWithTerm"
            >
              Import with selected term
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import {
    ChevronUpIcon,
    FolderIcon,
    FileIcon,
    XIcon,
    CheckIcon,
    ArrowRightIcon
  } from 'lucide-vue-next'
  import { Button } from '@/components/ui/button'
  import { client } from '@/lib/client.ts'
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

  // Types
  interface FileItem {
    name: string;
    isDirectory: boolean;
  }

  interface Term {
    id: number;
    year_start: string | number;
    semester: string | number;
  }

  type StepId = 'browse' | 'importing' | 'success' | 'select-term';

  const steps = [
    { id: 'browse' as const, label: 'Browse Directories' },
    { id: 'success' as const, label: 'Confirm Import' },
    { id: 'select-term' as const, label: 'Select Term' }
  ];

  // State
  const currentPath = ref('')
  const directoryContents = ref<FileItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const step = ref<StepId>('browse')
  const terms = ref<Term[]>([])
  const selectedTermString = ref<string>('')
  const selectedTerm = computed(() => selectedTermString.value ? parseInt(selectedTermString.value) : null)

  // CSV detection
  const csvFileCount = computed(() => {
    return directoryContents.value.filter(item => !item.isDirectory && isCsvFile(item.name)).length
  })
  const hasCsvFiles = computed(() => csvFileCount.value > 0)

  function isCsvFile(filename: string): boolean {
    return filename.toLowerCase().endsWith('.csv')
  }

  function isSelectedDir(item: FileItem): boolean {
    // No need to select individual directories anymore
    return false
  }

  // Directory navigation
  async function fetchDirectoryContents() {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await client.GET('/api/import/lsData/', {
        params: { query: { path: currentPath.value } }
      })

      if (fetchError) {
        error.value = 'Failed to fetch directory contents'
        return
      }

      // Transform API response format
      const directories = ((data?.dirs as string[]) || []).map((name: string) => ({
        name,
        isDirectory: true
      }))

      const files = ((data?.files as string[]) || []).map((name: string) => ({
        name,
        isDirectory: false
      }))

      directoryContents.value = [...directories, ...files]
    } catch (err) {
      error.value = 'An error occurred while fetching directory contents'
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  function navigateUp() {
    if (currentPath.value === '') return

    const parts = currentPath.value.split('/')
    parts.pop()
    currentPath.value = parts.join('/')
    fetchDirectoryContents()
  }

  function handleItemClick(item: FileItem) {
    if (item.isDirectory) {
      currentPath.value = currentPath.value
        ? `${currentPath.value}/${item.name}`
        : item.name
      fetchDirectoryContents()
    }
    // We don't select files anymore, just navigate directories
  }

  // Import functionality
  async function importDirectory() {
    if (!hasCsvFiles.value) return

    step.value = 'importing'

    try {
      const { data, error: importError } = await client.POST('/api/imports_exports/fei/terms/import/dir/', {
        params: { path: currentPath.value }
      })

      if (importError) {
        error.value = 'Failed to import directory'
        step.value = 'browse'
        return
      }

      // Fetch available terms for next step
      await fetchTerms()

      step.value = 'success'
    } catch (err) {
      error.value = 'An error occurred during import'
      step.value = 'browse'
      console.error(err)
    }
  }

  // Fetch available terms for import
  async function fetchTerms() {
    try {
      // Using fetch instead of client to avoid TypeScript issues
      const response = await fetch('/api/imports_exports/fei/terms?limit=100')
      const data = await response.json()

      if (!response.ok) {
        error.value = 'Failed to fetch terms'
        return
      }

      if (data && 'results' in data) {
        terms.value = data.results as Term[]
      }
    } catch (err) {
      console.error('Failed to fetch terms:', err)
    }
  }

  // Move to term selection step
  function moveToNextStep() {
    step.value = 'select-term'
  }

  // Import with selected term
  async function importWithTerm() {
    if (!selectedTerm.value) return

    try {
      const { data, error: importError } = await client.POST('/imports_exports/fei/import/db', {
        params: {
          query: { id: selectedTerm.value },
          header: { 'X-Term': `term_${new Date().getFullYear()}` }
        }
      })

      if (importError) {
        error.value = 'Failed to import with selected term'
        return
      }

      reset()
    } catch (err) {
      error.value = 'Failed to import with selected term'
      console.error(err)
    }
  }

  function reset() {
    step.value = 'browse'
    currentPath.value = ''
    error.value = null
    selectedTermString.value = ''
    fetchDirectoryContents()
  }

  // Initialize
  onMounted(() => {
    fetchDirectoryContents()
  })
</script>