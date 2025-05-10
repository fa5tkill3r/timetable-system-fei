<template>
  <div class="container space-y-6 py-6">
    <!-- Step indicator -->
    <div class="space-y-2">
      <div class="flex items-center space-x-3">
        <div
          v-for="(s, index) in steps"
          :key="s.id"
          class="flex items-center"
        >
          <div
            class="flex h-8 w-8 items-center justify-center rounded-full"
            :class="
              step === s.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
            "
          >
            {{ index + 1 }}
          </div>
          <span
            class="ml-2"
            :class="step === s.id ? 'font-medium' : 'text-muted-foreground'"
            >{{ s.label }}</span
          >
          <div
            v-if="index < steps.length - 1"
            class="mx-2 h-px w-12 bg-muted"
          ></div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="rounded-lg border bg-card p-6 shadow-sm">
      <!-- Step 1: Directory Browser -->
      <div
        v-if="step === 'browse'"
        class="space-y-4"
      >
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
      <div
        v-else-if="step === 'importing'"
        class="flex flex-col items-center py-12"
      >
        <div
          class="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"
        ></div>
        <p class="text-lg font-medium">
          Importing data from selected directory...
        </p>
      </div>

      <!-- Step 3: Success -->
      <div
        v-else-if="step === 'success'"
        class="space-y-6 py-4"
      >
        <div class="rounded-md border border-green-200 bg-green-50 p-4">
          <div class="flex">
            <CheckIcon class="mr-2 h-5 w-5 text-green-500" />
            <p>Import successful! The directory has been processed.</p>
          </div>
        </div>
        <p class="text-lg font-medium">What would you like to do next?</p>
        <div class="space-y-3">
          <Button
            class="w-full justify-start"
            @click="moveToNextStep"
          >
            <ArrowRightIcon class="mr-2 h-4 w-4" />
            Create schema from term
          </Button>
          <Button
            variant="outline"
            class="w-full justify-start"
            @click="reset"
          >
            <XIcon class="mr-2 h-4 w-4" />
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
  import { XIcon, CheckIcon, ArrowRightIcon } from 'lucide-vue-next'
  import { Button } from '@/components/ui/button'
  import { client } from '@/lib/client.ts'
  import FileExplorer from '@/components/common/FileExplorer.vue'

  const router = useRouter()

  interface Term {
    id: number
    year_start: string | number
    semester: string | number
  }

  type StepId = 'browse' | 'importing' | 'success'

  const steps = [
    { id: 'browse' as const, label: 'Browse Directories' },
    { id: 'success' as const, label: 'Confirm Import' },
    { id: 'schema' as const, label: 'Create schema' },
  ]

  const selectedDirectory = ref('')
  const loading = ref(false)
  const error = ref<string | null>(null)
  const step = ref<StepId>('browse')

  async function importDirectory() {
    if (!selectedDirectory.value) return

    step.value = 'importing'

    try {
      const { data, error: importError } = await client.POST(
        '/api/imports_exports/fei/terms/import/dir/',
        {
          params: {
            query: {
              path: selectedDirectory.value,
            },
          },
        },
      )

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

  function moveToNextStep() {
    router.push('/admin/schemas')
  }

  function reset() {
    step.value = 'browse'
    selectedDirectory.value = ''
    error.value = null
  }
</script>
