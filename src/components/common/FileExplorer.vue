<template>
  <div class="space-y-4">
    <div class="flex items-center space-x-2">
      <Button variant="outline" size="sm" @click="navigateUp" :disabled="currentPath === ''">
        <ChevronUpIcon class="h-4 w-4 mr-2" />
        Up
      </Button>
      <div class="px-3 py-1 bg-muted rounded-md text-sm flex-1 overflow-x-auto">
        <span class="whitespace-nowrap">{{ currentPath || '/' }}</span>
      </div>
    </div>

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
          :class="{'bg-primary/10': selectedPath === getCurrentFullPath(item)}"
        >
          <FolderIcon v-if="item.isDirectory" class="h-4 w-4 mr-2 text-blue-500" />
          <FileIcon v-else class="h-4 w-4 mr-2" :class="isCsvFile(item.name) ? 'text-green-500' : 'text-gray-500'" />
          <span>{{ item.name }}</span>
          <span v-if="selectedPath === getCurrentFullPath(item)" class="ml-2 text-xs bg-primary/20 px-2 py-0.5 rounded-full">Selected</span>
        </div>
        <div v-if="directoryContents.length === 0" class="p-4 text-center text-muted-foreground">
          This directory is empty
        </div>
      </div>
    </div>

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
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, watch } from 'vue'
  import { ChevronUpIcon, FolderIcon, FileIcon } from 'lucide-vue-next'
  import { Button } from '@/components/ui/button'
  import { client } from '@/lib/client.ts'

  interface FileItem {
    name: string;
    isDirectory: boolean;
  }

  const props = defineProps<{
    initialPath?: string;
    modelValue?: string;
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: string];
    'directory-selected': [path: string];
    'csv-stats': [stats: { count: number, hasFiles: boolean }];
  }>()

  const currentPath = ref(props.initialPath || '')
  const directoryContents = ref<FileItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedPath = computed(() => props.modelValue || '')

  const csvFileCount = computed(() => {
    return directoryContents.value.filter(item => !item.isDirectory && isCsvFile(item.name)).length
  })
  
  const hasCsvFiles = computed(() => csvFileCount.value > 0)

  watch([csvFileCount, hasCsvFiles], () => {
    emit('csv-stats', {
      count: csvFileCount.value,
      hasFiles: hasCsvFiles.value
    })
  })

  function isCsvFile(filename: string): boolean {
    return filename.toLowerCase().endsWith('.csv')
  }

  function getCurrentFullPath(item: FileItem): string {
    return currentPath.value
      ? `${currentPath.value}/${item.name}`
      : item.name
  }

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

      const responseData = data as any


      const directories = ((responseData?.dirs as string[]) || []).map((name: string) => ({
        name,
        isDirectory: true
      }))

      const files = ((responseData?.files as string[]) || []).map((name: string) => ({
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
      const newPath = currentPath.value
        ? `${currentPath.value}/${item.name}`
        : item.name
      currentPath.value = newPath
      fetchDirectoryContents()
      emit('update:modelValue', newPath)
      emit('directory-selected', newPath)
    }
  }

  watch(() => props.initialPath, (newPath) => {
    if (newPath !== undefined && newPath !== currentPath.value) {
      currentPath.value = newPath
      fetchDirectoryContents()
    }
  })

  onMounted(() => {
    fetchDirectoryContents()
  })
</script>
