<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>Import Data to Schema</DialogTitle>
        <DialogDescription>
          Select a directory containing CSV files to import to "{{ schema?.term }}" schema.
        </DialogDescription>
      </DialogHeader>

      <div v-if="step === 'browse'" class="py-4">
        <FileExplorer v-model="selectedDirectory" />

        <div class="mt-4 flex justify-end space-x-2">
          <Button variant="outline" @click="emit('update:open', false)">Cancel</Button>
          <Button :disabled="!selectedDirectory || importing" @click="importData">
            <ImportIcon v-if="!importing" class="mr-2 h-4 w-4" />
            <div v-else class="mr-2 h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full">
            </div>
            Import
          </Button>
        </div>
      </div>

      <div v-else-if="step === 'success'" class="py-4">
        <div class="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
          <div class="flex">
            <CheckIcon class="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
            <p>Import successful! The data has been imported to the schema.</p>
          </div>
        </div>

        <div class="flex justify-end">
          <Button @click="closeDialog">Done</Button>
        </div>
      </div>

      <div v-else-if="step === 'error'" class="py-4">
        <div class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <div class="flex">
            <AlertTriangleIcon class="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
            <p>Import failed: {{ errorMessage || 'An unknown error occurred' }}</p>
          </div>
        </div>

        <div class="flex justify-end space-x-2">
          <Button variant="outline" @click="step = 'browse'">Try Again</Button>
          <Button variant="destructive" @click="closeDialog">Close</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ImportIcon, CheckIcon, AlertTriangleIcon } from 'lucide-vue-next'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import FileExplorer from '@/components/common/file-explorer.vue'
import { client } from '@/lib/client'
import type { components } from '@/../schema'

type Schema = components['schemas']['schema'];
type Step = 'browse' | 'success' | 'error';

const props = defineProps<{
  open: boolean;
  schema?: Schema;
}>()

const emit = defineEmits<{
  'update:open': [value: boolean];
  'success': [];
}>()

const selectedDirectory = ref('')
const step = ref<Step>('browse')
const importing = ref(false)
const errorMessage = ref('')

async function importData() {
  if (!selectedDirectory.value || !props.schema?.id) return

  importing.value = true

  try {
    const { error } = await client.POST('/api/imports_exports/fei/import/dir/', {
      params: {
        query: {
          path: selectedDirectory.value,
          schema_id: props.schema?.id
        }
      }
    })

    if (error) {
      step.value = 'error'
      errorMessage.value = error.message || 'Failed to import data'
      return
    }

    step.value = 'success'
    emit('success')
  } catch (err: any) {
    step.value = 'error'
    errorMessage.value = err.message || 'An error occurred during import'
    console.error(err)
  } finally {
    importing.value = false
  }
}

function closeDialog() {
  emit('update:open', false)
  // Reset the state when the dialog is closed
  setTimeout(() => {
    step.value = 'browse'
    selectedDirectory.value = ''
    errorMessage.value = ''
  }, 300)
}
</script>
