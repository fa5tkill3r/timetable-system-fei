<template>
  <div class="flex flex-col space-y-4 p-8 pt-6">
    <div class="flex items-center justify-between space-y-2">
      <h2 class="text-3xl font-bold tracking-tight">Timetables</h2>
      <div class="flex items-center space-x-2">
        <Button @click="openTimetableDialog()">Create New Timetable</Button>
      </div>
    </div>

    <DataTable :data="timetables" :columns="columns" :is-loading="timetableStore.isLoading" :search-term="searchTerm"
      :page-index="pageIndex" :page-size="pageSize" enable-search enable-selection enable-column-visibility
      search-placeholder="Search timetables..." @search-change="onSearchChange"
      @selection-change="onSelectionChange">
      <template #empty>
        <div class="text-center p-4">
          <p class="text-muted-foreground">No timetables found</p>
          <Button variant="outline" class="mt-2" @click="openTimetableDialog">Create your first
            timetable</Button>
        </div>
      </template>

      <template #selection-actions>
        <div class="space-x-2">
          <Button variant="outline" size="sm">
            Export Selected
          </Button>
          <Button variant="destructive" size="sm">
            Delete Selected
          </Button>
        </div>
      </template>

      <template #pagination="{ filteredCount, selectedCount }">
        <TablePagination :current-page="pageIndex" :page-size="pageSize" :total-count="filteredCount"
          :selected-count="selectedCount" @page-change="onPageChange" />
      </template>
    </DataTable>

    <!-- Dialogs -->
    <TimetableDialog :open="dialogVisible" :timetable="selectedTimetable" :is-loading="dialogLoading"
      @update:open="dialogVisible = $event" @save="saveTimetable" />

    <ConfirmDeleteDialog :open="deleteDialogVisible" :title="deleteDialogTitle" :description="deleteDialogDescription"
      :is-loading="dialogLoading" @update:open="deleteDialogVisible = $event" @confirm="handleDelete" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import { useTimetableStore } from '@/store/timetables'
import { useToast } from '@/components/ui/toast/use-toast'
import { Button } from '@/components/ui/button'
import { PencilIcon, TrashIcon, ArrowUpDown, CalendarIcon } from 'lucide-vue-next'
import DataTable from '@/components/common/DataTable.vue'
import TimetableDialog from '@/components/timetables/TimetableDialog.vue'
import ConfirmDeleteDialog from '@/components/dialogs/ConfirmDeleteDialog.vue'
import { RouterLink } from 'vue-router'
import { Checkbox } from '@/components/ui/checkbox'
import { type ColumnDef } from '@tanstack/vue-table'
import { components } from 'schema'
import TablePagination from '@/components/common/TablePagination.vue'
import { Badge, BadgeVariants } from '@/components/ui/badge'

type Timetable = components['schemas']['TT']

// States
const timetableStore = useTimetableStore()
const { toast } = useToast()
const timetables = computed(() => timetableStore.timetables)
const searchTerm = ref('')
const pageIndex = ref(0)
const pageSize = ref(10)
const selectedRows = ref({})

// Dialog states
const dialogVisible = ref(false)
const deleteDialogVisible = ref(false)
const dialogLoading = ref(false)
const selectedTimetable = ref<Timetable | null>(null)
const deleteDialogTitle = ref('')
const deleteDialogDescription = ref('')
const itemToDelete = ref<number | null>(null)

// Define table columns - adjust these based on the actual schema
const columns: ColumnDef<Timetable>[] = [
  {
    id: 'select',
    header: ({ table }) => h(Checkbox, {
      'modelValue': table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
      'onUpdate:modelValue': (value: boolean) => table.toggleAllPageRowsSelected(!!value),
      'ariaLabel': 'Select all',
    }),
    cell: ({ row }) => h(Checkbox, {
      'modelValue': row.getIsSelected(),
      'onUpdate:modelValue': (value: boolean) => row.toggleSelected(!!value),
      'ariaLabel': 'Select row',
    }),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return h(Button, {
        variant: 'ghost',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      }, () => ['Name', h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })])
    },
    cell: ({ row }) => {
      const id = row.original.id
      const name = row.getValue('name')
      return h(RouterLink, {
        to: `/timetables/${id}`,
        class: 'font-medium hover:underline text-primary'
      }, () => name)
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as Timetable['status']

      // Example status rendering with badges
      let variant = 'default' as BadgeVariants['variant']
      if (status === 'PUBLISHED') variant = 'default'
      if (status === 'WIP') variant = 'secondary'
      if (status === 'HIDDEN') variant = 'outline'

      return h(Badge, { variant }, () => status)
    },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => {
      return h(Button, {
        variant: 'ghost',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      }, () => ['Created At', h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })])
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue('created_at'))
      return h('div', {}, date.toLocaleDateString())
    },
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const timetable = row.original

      return h('div', { class: 'flex justify-end space-x-2' }, [
        h(RouterLink, {
          to: `/timetables/${timetable.id}/activities`,
        }, () => h(Button, {
          variant: 'outline',
          size: 'sm',
        }, () => h(CalendarIcon, { class: 'h-4 w-4' }))),
        h(Button, {
          variant: 'outline',
          size: 'sm',
          onClick: () => openTimetableDialog(timetable),
        }, () => h(PencilIcon, { class: 'h-4 w-4' })),
        h(Button, {
          variant: 'outline',
          size: 'sm',
          onClick: () => confirmDeleteTimetable(timetable),
        }, () => h(TrashIcon, { class: 'h-4 w-4' })),
      ])
    },
  },
]

// Event handlers
const onSearchChange = (value: string) => {
  searchTerm.value = value
  pageIndex.value = 0 // Reset to first page on search
}

const onPageChange = (page: number) => {
  pageIndex.value = page
}

const onSelectionChange = (selection: Record<string, boolean>) => {
  selectedRows.value = selection
}

// Fetch data on mount
onMounted(async () => {
  await timetableStore.fetchTimetables()
})

// Dialog handlers
function openTimetableDialog(timetable?: Timetable) {
  selectedTimetable.value = timetable ? { ...timetable } : null
  dialogVisible.value = true
}

function confirmDeleteTimetable(timetable: Timetable) {
  itemToDelete.value = timetable.id || null
  deleteDialogTitle.value = 'Delete Timetable'
  deleteDialogDescription.value = `Are you sure you want to delete "${timetable.name}"?`
  deleteDialogVisible.value = true
}

// Save timetable
async function saveTimetable(timetableData: any) {
  dialogLoading.value = true
  try {
    if (selectedTimetable.value?.id) {
      // Update
      const result = await timetableStore.updateTimetable(selectedTimetable.value.id, timetableData)
      if (result) {
        toast({
          title: "Timetable updated",
          description: `Timetable "${timetableData.name}" has been updated successfully.`
        })
        dialogVisible.value = false
      }
    } else {
      // Create
      const result = await timetableStore.createTimetable(timetableData)
      if (result) {
        toast({
          title: "Timetable created",
          description: `Timetable "${timetableData.name}" has been created successfully.`
        })
        dialogVisible.value = false
      }
    }
  } catch (error) {
    toast({
      title: "Error",
      description: `Failed to ${selectedTimetable.value?.id ? 'update' : 'create'} timetable.`,
      variant: "destructive"
    })
  } finally {
    dialogLoading.value = false
  }
  await fetchData()
}

// Handle delete
async function handleDelete() {
  if (!itemToDelete.value) return

  dialogLoading.value = true
  try {
    const success = await timetableStore.deleteTimetable(itemToDelete.value)

    if (success) {
      toast({ title: "Timetable deleted successfully" })
      deleteDialogVisible.value = false
    } else {
      toast({
        title: "Delete failed",
        description: "There was an error deleting the timetable.",
        variant: "destructive"
      })
    }
  } finally {
    dialogLoading.value = false
  }
  await fetchData()
}

// Fetch data
const fetchData = async () => {
  await timetableStore.fetchTimetables()
}
</script>