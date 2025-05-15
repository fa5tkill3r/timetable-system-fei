<template>
  <div class="container space-y-6 py-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">Subject Management</h1>
      <Button @click="openCreateDialog()">Create New Subject</Button>
    </div>

    <DataTable
      :data="subjectStore.subjects"
      :columns="columns"
      :is-loading="subjectStore.isLoading"
      :page-index="pageIndex"
      :page-size="pageSize"
      :search-term="searchTerm"
      :initialColumnVisibility="initialColumnVisibility"
      enable-search
      enable-column-visibility
      enable-pagination
      search-placeholder="Search subjects..."
      @search-change="searchTerm = $event"
      @update:page-index="pageIndex = $event"
    >
      <template #empty>
        <div class="py-4 text-center text-muted-foreground">
          No subjects found. Create your first subject.
        </div>
      </template>

      <template #pagination="{ filteredCount }">
        <TablePagination
          :current-page="pageIndex"
          :page-size="pageSize"
          :total-count="filteredCount"
          @page-change="pageIndex = $event"
        />
      </template>
    </DataTable>

    <SubjectDialog
      :open="dialogVisible"
      :subject="selectedSubject"
      :is-loading="dialogLoading"
      @update:open="dialogVisible = $event"
      @save="saveSubject"
    />

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
  import { ref, h } from 'vue'
  import { useSubjectStore } from '@/store/subjects'
  import { PencilIcon, TrashIcon } from 'lucide-vue-next'
  import { useToast } from '@/components/ui/toast/use-toast'
  import { Button } from '@/components/ui/button'
  import DataTable from '@/components/common/DataTable.vue'
  import TablePagination from '@/components/common/TablePagination.vue'
  import SubjectDialog from '@/components/subjects/SubjectDialog.vue'
  import DeleteSubjectDialog from '@/components/subjects/DeleteSubjectDialog.vue'
  import { components } from '@/types/schema'
  import { type ColumnDef } from '@tanstack/vue-table'

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

  const pageIndex = ref(0)
  const pageSize = ref(10)
  const searchTerm = ref('')

  const initialColumnVisibility = ref({
    code: true,
    nominal_semester: true,
  })

  const columns: ColumnDef<Subject>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => row.getValue('name'),
    },
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => row.getValue('code'),
    },
    {
      accessorKey: 'nominal_semester',
      header: 'Nominal Semester',
      cell: ({ row }) => row.getValue('nominal_semester'),
    },
    {
      id: 'actions',
      header: () => h('div', { class: 'text-right' }, 'Actions'),
      cell: ({ row }) => {
        const subject = row.original

        return h('div', { class: 'flex justify-end space-x-2' }, [
          h(
            Button,
            {
              variant: 'outline',
              size: 'sm',
              onClick: (e: MouseEvent) => {
                e.stopPropagation()
                openEditDialog(subject)
              },
            },
            () => h(PencilIcon, { class: 'h-4 w-4' }),
          ),
          h(
            Button,
            {
              variant: 'outline',
              size: 'sm',
              onClick: (e: MouseEvent) => {
                e.stopPropagation()
                confirmDelete(subject)
              },
            },
            () => h(TrashIcon, { class: 'h-4 w-4' }),
          ),
        ])
      },
    },
  ]

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
