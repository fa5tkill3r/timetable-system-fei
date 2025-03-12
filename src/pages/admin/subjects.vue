<template>
  <div class="container py-6 space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-semibold">Subject Management</h1>
      <Button @click="openCreateDialog()">Create New Subject</Button>
    </div>

    <!-- Subject listing -->
    <div class="border rounded-lg shadow-sm bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Nominal Semester</TableHead>
            <TableHead class="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="subjectStore.isLoading">
            <TableCell colspan="4" class="text-center py-4">
              <div class="flex justify-center items-center">
                <div class="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
                Loading subjects...
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-else-if="subjectStore.subjects.length === 0">
            <TableCell colspan="4" class="text-center py-4 text-muted-foreground">
              No subjects found. Create your first subject.
            </TableCell>
          </TableRow>
          <TableRow v-for="subject in subjectStore.subjects" :key="subject.id">
            <TableCell>{{ subject.name }}</TableCell>
            <TableCell>{{ subject.code }}</TableCell>
            <TableCell>{{ subject.nominal_semester }}</TableCell>
            <TableCell class="text-right">
              <div class="flex justify-end space-x-2">
                <Button variant="outline" size="sm" @click="openEditDialog(subject)">
                  <PencilIcon class="h-4 w-4" />
                  <span class="sr-only">Edit</span>
                </Button>
                <Button variant="outline" size="sm" @click="confirmDelete(subject)">
                  <TrashIcon class="h-4 w-4" />
                  <span class="sr-only">Delete</span>
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Create/Edit Subject Dialog -->
    <Dialog :open="dialogVisible" @update:open="dialogVisible = $event">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{{ isEditMode ? 'Edit Subject' : 'Create Subject' }}</DialogTitle>
          <DialogDescription>
            {{ isEditMode ? 'Update the subject details below.' : 'Fill in the details to create a new subject.' }}
          </DialogDescription>
        </DialogHeader>
        <form @submit.prevent="saveSubject">
          <div class="grid gap-4 py-4">
            <div class="grid gap-2">
              <Label for="name">Name</Label>
              <Input id="name" v-model="subject.name" required />
            </div>
            <div class="grid gap-2">
              <Label for="code">Code</Label>
              <Input id="code" v-model="subject.code" required />
            </div>
            <div class="grid gap-2">
              <Label for="nominal_semester">Nominal Semester</Label>
              <!-- @vue-ignore -->
              <Input id="nominal_semester" v-model="subject.nominal_semester" type="number" required />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" :disabled="dialogLoading">
              <span v-if="dialogLoading" class="mr-2">
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

    <!-- Confirmation dialog for deletion -->
    <Dialog :open="deleteDialog" @update:open="deleteDialog = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Subject</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this subject? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="deleteDialog = false">Cancel</Button>
          <Button variant="destructive" @click="deleteSubject" :disabled="deleteLoading">
            <span v-if="deleteLoading" class="mr-2">
              <div
                class="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full inline-block">
              </div>
            </span>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useSubjectStore } from '@/store/subjects'
import { PencilIcon, TrashIcon } from 'lucide-vue-next'
import { useToast } from '@/components/ui/toast/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { components } from 'schema'

type SubjectRequest = components['schemas']['SubjectRequest']
type Subject = components['schemas']['Subject']

// Initialize store and toast
const subjectStore = useSubjectStore()
const { toast } = useToast()

// Dialog state
const dialogVisible = ref(false)
const dialogLoading = ref(false)
const isEditMode = computed(() => !!subject.value.id)

// Delete dialog state
const deleteDialog = ref(false)
const deleteLoading = ref(false)
const subjectToDelete = ref<Subject | null>(null)

// Subject form data
const subject = ref<Subject>({
  id: undefined,
  name: '',
  code: '',
  nominal_semester: 1 as number | null
})

const subjectRequest = computed<SubjectRequest>(() => {
  return {
    name: subject.value.name,
    code: subject.value.code,
    nominal_semester: subject.value.nominal_semester
  }
})

// Open create dialog
function openCreateDialog() {
  resetSubjectForm()
  dialogVisible.value = true
}

// Open edit dialog for a subject
function openEditDialog(subjectData: Subject) {
  subject.value = { ...subjectData }
  dialogVisible.value = true
}

// Reset form data
function resetSubjectForm() {
  subject.value = {
    id: undefined,
    name: '',
    code: '',
    nominal_semester: 1 as number
  }
}

// Save subject (create or update)
async function saveSubject() {
  dialogLoading.value = true

  try {
    if (subject.value.id) {
      // Update existing subject
      const result = await subjectStore.updateSubject(subject.value.id, subjectRequest.value)
      if (result) {
        toast({
          title: "Subject updated",
          description: `Subject "${subject.value.name}" has been updated successfully.`
        })
      }
    } else {
      // Create new subject
      const result = await subjectStore.createSubject(subjectRequest.value)
      if (result) {
        toast({
          title: "Subject created",
          description: `Subject "${subject.value.name}" has been created successfully.`
        })
      }
    }

    // Close dialog on success
    dialogVisible.value = false
  } catch (error) {
    toast({
      title: "Error",
      description: `Failed to ${subject.value.id ? 'update' : 'create'} subject.`,
      variant: "destructive"
    })
  } finally {
    dialogLoading.value = false
  }
}

// Confirm deletion of a subject
function confirmDelete(subjectData: Subject) {
  subjectToDelete.value = subjectData
  deleteDialog.value = true
}

// Delete a subject
async function deleteSubject() {
  if (!subjectToDelete.value?.id) return

  deleteLoading.value = true
  try {
    const success = await subjectStore.deleteSubject(subjectToDelete.value.id)
    if (success) {
      toast({
        title: "Subject deleted",
        description: `Subject "${subjectToDelete.value.name}" has been deleted.`
      })
      deleteDialog.value = false
    } else {
      toast({
        title: "Delete failed",
        description: "There was an error deleting the subject.",
        variant: "destructive",
      })
    }
  } finally {
    deleteLoading.value = false
  }
}
</script>
