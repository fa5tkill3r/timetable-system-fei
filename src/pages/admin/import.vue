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
        <FileExplorer v-model="selectedDirectory" />

        <div class="flex justify-end pt-4">
          <Button
            :disabled="!selectedDirectory || loading"
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
            Create schema from term
          </Button>
          <Button variant="outline" class="w-full justify-start" @click="reset">
            <XIcon class="h-4 w-4 mr-2" />
            Start over
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import {
    XIcon,
    CheckIcon,
    ArrowRightIcon
  } from 'lucide-vue-next'
  import { Button } from '@/components/ui/button'
  import { client } from '@/lib/client.ts'
  import FileExplorer from '@/components/common/FileExplorer.vue'

  const router = useRouter()

  // Types
  interface Term {
    id: number;
    year_start: string | number;
    semester: string | number;
  }

  type StepId = 'browse' | 'importing' | 'success';

  const steps = [
    { id: 'browse' as const, label: 'Browse Directories' },
    { id: 'success' as const, label: 'Confirm Import' },
    { id: 'schema' as const, label: 'Create schema' },
  ];

  // State
  const selectedDirectory = ref('')
  const loading = ref(false)
  const error = ref<string | null>(null)
  const step = ref<StepId>('browse')

  // Import functionality
  async function importDirectory() {
    if (!selectedDirectory.value) return

    step.value = 'importing'

    try {
      const { data, error: importError } = await client.POST('/api/imports_exports/fei/terms/import/dir/', {
        params: {
          query: {
            path: selectedDirectory.value,
          },
        },
      })

      if (importError) {
        error.value = 'Failed to import directory'
        step.value = 'browse'
        return
      }

      step.value = 'success'
    } catch (err) {
      error.value = 'An error occurred during import'
      step.value = 'browse'
      console.error(err)
    }
  }

  // Navigate to schema page
  function moveToNextStep() {
    router.push('/admin/schemas')
  }

  function reset() {
    step.value = 'browse'
    selectedDirectory.value = ''
    error.value = null
  }
</script>