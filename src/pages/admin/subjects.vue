<template>
  <div class="container space-y-6 py-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">Subject Management</h1>
      <Button @click="openCreateDialog()">Create New Subject</Button>
    </div>

    <!-- Subject listing -->
    <div class="overflow-hidden rounded-lg border bg-card shadow-sm">
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
            <TableCell
              colspan="4"
              class="py-4 text-center"
            >
              <div class="flex items-center justify-center">
                <div
                  class="mr-2 h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
                ></div>
                Loading subjects...
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-else-if="subjectStore.subjects.length === 0">
            <TableCell
              colspan="4"
              class="py-4 text-center text-muted-foreground"
            >
              No subjects found. Create your first subject.
            </TableCell>
          </TableRow>
          <TableRow
            v-for="subject in subjectStore.subjects"
            :key="subject.id"
          >
            <TableCell>{{ subject.name }}</TableCell>
            <TableCell>{{ subject.code }}</TableCell>
            <TableCell>{{ subject.nominal_semester }}</TableCell>
            <TableCell class="text-right">
              <div class="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  @click="openEditDialog(subject)"
                >
                  <PencilIcon class="h-4 w-4" />
                  <span class="sr-only">Edit</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  @click="confirmDelete(subject)"
                >
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
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '@/components/ui/table'
  import SubjectDialog from '@/components/subjects/SubjectDialog.vue'
  import DeleteSubjectDialog from '@/components/subjects/DeleteSubjectDialog.vue'
  import { components } from '@/types/schema'

  type SubjectRequest = components['schemas']['SubjectRequest']
  type Subject = components['schemas']['Subject']

  const subjectStore = useSubjectStore()
  const { toast } = useToast()

  const dialogVisible = ref(false)
  const dialogLoading = ref(false)
  const selectedSubject = ref<Subject | null>(null)

  const deleteDialog = ref(false)
  const deleteLoading = ref(false)
  const subjectToDelete = ref<Subject | null>(null)

  function openCreateDialog() {
    selectedSubject.value = null
    dialogVisible.value = true
  }

  function openEditDialog(subjectData: Subject) {
    selectedSubject.value = { ...subjectData }
    dialogVisible.value = true
  }

  async function saveSubject(subjectData: SubjectRequest, id?: number) {
    dialogLoading.value = true

    try {
      if (id) {
        const result = await subjectStore.updateSubject(id, subjectData)
        if (result) {
          toast({
            title: 'Subject updated',
            description: `Subject "${subjectData.name}" has been updated successfully.`,
          })
        }
      } else {
        const result = await subjectStore.createSubject(subjectData)
        if (result) {
          toast({
            title: 'Subject created',
            description: `Subject "${subjectData.name}" has been created successfully.`,
          })
        }
      }

      dialogVisible.value = false
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${id ? 'update' : 'create'} subject.`,
        variant: 'destructive',
      })
    } finally {
      dialogLoading.value = false
    }
  }

  function confirmDelete(subjectData: Subject) {
    subjectToDelete.value = subjectData
    deleteDialog.value = true
  }

  async function deleteSubject() {
    if (!subjectToDelete.value?.id) return

    deleteLoading.value = true
    try {
      const success = await subjectStore.deleteSubject(subjectToDelete.value.id)
      if (success) {
        toast({
          title: 'Subject deleted',
          description: `Subject "${subjectToDelete.value.name}" has been deleted.`,
        })
        deleteDialog.value = false
      } else {
        toast({
          title: 'Delete failed',
          description: 'There was an error deleting the subject.',
          variant: 'destructive',
        })
      }
    } finally {
      deleteLoading.value = false
    }
  }
</script>
