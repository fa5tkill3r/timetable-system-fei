<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{{ isEditMode ? 'Edit Subject' : 'Create Subject' }}</DialogTitle>
        <DialogDescription>
          {{ isEditMode ? 'Update the subject details below.' : 'Fill in the details to create a new subject.' }}
        </DialogDescription>
      </DialogHeader>
      <form @submit.prevent="handleSubmit">
        <div class="grid gap-4 py-4">
          <div class="grid gap-2">
            <Label for="name">Name</Label>
            <Input id="name" v-model="formData.name" required />
          </div>
          <div class="grid gap-2">
            <Label for="code">Code</Label>
            <Input id="code" v-model="formData.code" required />
          </div>
          <div class="grid gap-2">
            <Label for="nominal_semester">Nominal Semester</Label>
            <!-- @vue-ignore -->
            <Input id="nominal_semester" v-model="formData.nominal_semester" type="number" required />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" :disabled="isLoading">
            <span v-if="isLoading" class="mr-2">
              <div
                class="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full inline-block">
              </div>
            </span>
            {{ isEditMode ? 'Update' : 'Create' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { components } from '@/types/schema'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'

type Subject = components['schemas']['Subject']
type SubjectRequest = components['schemas']['SubjectRequest']

const props = defineProps<{
  open: boolean
  subject?: Subject | null
  isLoading?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save': [subjectData: SubjectRequest, id?: number]
}>()

const isEditMode = computed(() => !!props.subject?.id)

// Form data with default values
const formData = ref<SubjectRequest>({
  name: '',
  code: '',
  nominal_semester: 1
})

// Update form data when subject prop changes
watch(() => props.subject, (newSubject) => {
  if (newSubject) {
    formData.value = {
      name: newSubject.name || '',
      code: newSubject.code || '',
      nominal_semester: newSubject.nominal_semester || 1
    }
  } else {
    // Reset form if no subject is provided
    formData.value = {
      name: '',
      code: '',
      nominal_semester: 1
    }
  }
}, { immediate: true })

function handleSubmit() {
  emit('save', formData.value, props.subject?.id)
}
</script>
