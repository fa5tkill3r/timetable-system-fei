<template>
  <div class="container py-6 space-y-6">
    <!-- Breadcrumb navigation -->
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Buildings</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
    
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-semibold">Building Management</h1>
      <Button @click="openBuildingDialog()">Add New Building</Button>
    </div>
    
    <!-- Building Table with DataTable component -->
    <DataTable
      :data="buildings"
      :columns="columns"
      :is-loading="buildingStore.isLoading"
      :search-term="searchTerm"
      :page-index="pageIndex"
      :page-size="pageSize"
      enable-search
      enable-selection
      enable-column-visibility
      search-placeholder="Search buildings..."
      @update:search-term="onSearchChange"
      @selection-change="onSelectionChange"
    >
      <!-- Empty state slot -->
      <template #empty>
        No buildings found.
      </template>
      
      <!-- Selection actions slot -->
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
      
      <!-- Pagination slot -->
      <template #pagination="{ filteredCount, selectedCount }">
        <TablePagination
          :current-page="pageIndex"
          :page-size="pageSize"
          :total-count="filteredCount"
          :selected-count="selectedCount"
          @page-change="onPageChange"
        />
      </template>
    </DataTable>

    <!-- Dialogs -->
    <BuildingDialog
      :open="buildingDialogVisible"
      :building="selectedBuilding"
      :is-loading="dialogLoading"
      @update:open="buildingDialogVisible = $event"
      @save="saveBuilding"
    />

    <ConfirmDeleteDialog
      :open="deleteDialogVisible"
      :title="deleteDialogTitle"
      :description="deleteDialogDescription"
      :is-loading="dialogLoading"
      @update:open="deleteDialogVisible = $event"
      @confirm="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import { useBuildingStore } from '@/store/buildings'
import { useToast } from '@/components/ui/toast/use-toast'
import { Button } from '@/components/ui/button'
import { PencilIcon, TrashIcon, ArrowUpDown } from 'lucide-vue-next'
import { DataTable } from '@/components/ui/data-table'
import BuildingDialog from '@/components/buildings/BuildingDialog.vue'
import ConfirmDeleteDialog from '@/components/dialogs/ConfirmDeleteDialog.vue'
import { RouterLink } from 'vue-router'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { type ColumnDef } from '@tanstack/vue-table'
import { components } from 'schema'
import TablePagination from '@/components/common/table-pagination.vue'

type Building = components['schemas']['Building']

// States
const buildingStore = useBuildingStore()
const { toast } = useToast()
const buildings = computed(() => buildingStore.buildings)
const searchTerm = ref('')
const pageIndex = ref(0)
const pageSize = ref(10)
const selectedRows = ref({})

// Dialog states
const buildingDialogVisible = ref(false)
const deleteDialogVisible = ref(false)
const dialogLoading = ref(false)
const selectedBuilding = ref<Building | null>(null)
const deleteDialogTitle = ref('')
const deleteDialogDescription = ref('')
const itemToDelete = ref<number | null>(null)

// Define table columns
const columns: ColumnDef<Building>[] = [
  {
    id: 'select',
    header: ({ table }) => h(Checkbox, {
      'modelValue': table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
      'onUpdate:modelValue': value => table.toggleAllPageRowsSelected(!!value),
      'ariaLabel': 'Select all',
    }),
    cell: ({ row }) => h(Checkbox, {
      'modelValue': row.getIsSelected(),
      'onUpdate:modelValue': value => row.toggleSelected(!!value),
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
        to: `/admin/buildings/${id}/rooms`,
        class: 'font-medium hover:underline text-primary'
      }, () => name)
    },
  },
  {
    accessorKey: 'abbrev',
    header: ({ column }) => {
      return h(Button, {
        variant: 'ghost',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      }, () => ['Abbreviation', h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })])
    },
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const building = row.original
      
      return h('div', { class: 'flex justify-end space-x-2' }, [
        h(Button, {
          variant: 'outline',
          size: 'sm',
          onClick: () => openBuildingDialog(building),
        }, () => h(PencilIcon, { class: 'h-4 w-4' })),
        h(Button, {
          variant: 'outline',
          size: 'sm',
          onClick: () => confirmDeleteBuilding(building),
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

// Debug logs to check data flow
onMounted(async () => {
  await buildingStore.fetchBuildings()
})

// Dialog handlers
function openBuildingDialog(building?: Building) {
  selectedBuilding.value = building ? { ...building } : null
  buildingDialogVisible.value = true
}

function confirmDeleteBuilding(building: Building) {
  itemToDelete.value = building.id
  deleteDialogTitle.value = 'Delete Building'
  deleteDialogDescription.value = `Are you sure you want to delete "${building.name}"? This will also delete all rooms and equipment inside this building.`
  deleteDialogVisible.value = true
}

// Save building
async function saveBuilding(buildingData: any) {
  dialogLoading.value = true
  try {
    if (selectedBuilding.value?.id) {
      // Update
      const result = await buildingStore.updateBuilding(selectedBuilding.value.id, buildingData)
      if (result) {
        toast({
          title: "Building updated",
          description: `Building "${buildingData.name}" has been updated successfully.`
        })
        buildingDialogVisible.value = false
      }
    } else {
      // Create
      const result = await buildingStore.createBuilding(buildingData)
      if (result) {
        toast({
          title: "Building created",
          description: `Building "${buildingData.name}" has been created successfully.`
        })
        buildingDialogVisible.value = false
      }
    }
  } catch (error) {
    toast({
      title: "Error",
      description: `Failed to ${selectedBuilding.value?.id ? 'update' : 'create'} building.`,
      variant: "destructive"
    })
  } finally {
    dialogLoading.value = false
  }
  // After successful save, refetch data
  await fetchData()
}

// Handle delete
async function handleDelete() {
  if (!itemToDelete.value) return
  
  dialogLoading.value = true
  try {
    const success = await buildingStore.deleteBuilding(itemToDelete.value)
    
    if (success) {
      toast({ title: "Building deleted successfully" })
      deleteDialogVisible.value = false
    } else {
      toast({
        title: "Delete failed",
        description: "There was an error deleting the building.",
        variant: "destructive"
      })
    }
  } finally {
    dialogLoading.value = false
  }
  // After successful delete, refetch data if needed
  await fetchData()
}
</script>
