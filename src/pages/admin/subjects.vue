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

    <!-- Subject Dialog Component -->
    <SubjectDialog 
      :open="dialogVisible" 
      :subject="selectedSubject"
      :is-loading="dialogLoading"
      @update:open="dialogVisible = $event"
      @save="saveSubject"
    />

    <!-- Delete Dialog Component -->
    <DeleteSubjectDialog 
      :open="deleteDialog" 
      :subject="subjectToDelete"
      :is-loading="deleteLoading"
      @update:open="deleteDialog = $event"
      @delete="deleteSubject"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSubjectStore } from '@/store/subjects'
import { PencilIcon, TrashIcon } from 'lucide-vue-next'
import { useToast } from '@/components/ui/toast/use-toast'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import SubjectDialog from '@/components/subjects/SubjectDialog.vue'
import DeleteSubjectDialog from '@/components/subjects/DeleteSubjectDialog.vue'
import { components } from '@/types/schema'

type SubjectRequest = components['schemas']['SubjectRequest']
type Subject = components['schemas']['Subject']

// Initialize store and toast
const subjectStore = useSubjectStore()
const { toast } = useToast()

// Dialog state
const dialogVisible = ref(false)
const dialogLoading = ref(false)
const selectedSubject = ref<Subject | null>(null)

// Delete dialog state
const deleteDialog = ref(false)
const deleteLoading = ref(false)
const subjectToDelete = ref<Subject | null>(null)

// Open create dialog
function openCreateDialog() {
  selectedSubject.value = null
  dialogVisible.value = true
}

// Open edit dialog for a subject
function openEditDialog(subjectData: Subject) {
  selectedSubject.value = { ...subjectData }
  dialogVisible.value = true
}

// Save subject (create or update)
async function saveSubject(subjectData: SubjectRequest, id?: number) {
  dialogLoading.value = true

  try {
    if (id) {
      // Update existing subject
      const result = await subjectStore.updateSubject(id, subjectData)
      if (result) {
        toast({
          title: "Subject updated",
          description: `Subject "${subjectData.name}" has been updated successfully.`
        })
      }
    } else {
      // Create new subject
      const result = await subjectStore.createSubject(subjectData)
      if (result) {
        toast({
          title: "Subject created",
          description: `Subject "${subjectData.name}" has been created successfully.`
        })
      }
    }

    // Close dialog on success
    dialogVisible.value = false
  } catch (error) {
    toast({
      title: "Error",
      description: `Failed to ${id ? 'update' : 'create'} subject.`,
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
