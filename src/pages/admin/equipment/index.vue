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
          <BreadcrumbPage>Equipment</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
    
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-semibold">Equipment Management</h1>
      <Button @click="openEquipmentDialog()">Add New Equipment</Button>
    </div>
    
    <!-- Equipment Table with DataTable component -->
    <DataTable
      :data="equipment"
      :columns="columns"
      :is-loading="equipmentStore.isLoading"
      :search-term="searchTerm"
      :page-index="pageIndex"
      :page-size="pageSize"
      enable-search
      enable-selection
      enable-column-visibility
      search-placeholder="Search equipment..."
      @update:search-term="onSearchChange"
      @selection-change="onSelectionChange"
    >
      <!-- Empty state slot -->
      <template #empty>
        No equipment found.
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
    <EquipmentDialog
      :open="dialogVisible"
      :equipment="selectedEquipment"
      :is-loading="dialogLoading"
      @update:open="dialogVisible = $event"
      @save="saveEquipment"
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
import { useEquipmentStore } from '@/store/equipment'
import { useToast } from '@/components/ui/toast/use-toast'
import { Button } from '@/components/ui/button'
import { PencilIcon, TrashIcon, ArrowUpDown } from 'lucide-vue-next'
import DataTable from '@/components/common/DataTable.vue'
import EquipmentDialog from '@/components/dialogs/EquipmentDialog.vue'
import ConfirmDeleteDialog from '@/components/dialogs/ConfirmDeleteDialog.vue'
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
import TablePagination from '@/components/common/TablePagination.vue'
import { Checkbox } from '@/components/ui/checkbox'

type Equipment = components['schemas']['Equipment']

// States
const equipmentStore = useEquipmentStore()
const { toast } = useToast()
const equipment = computed(() => equipmentStore.equipment)
const searchTerm = ref('')
const pageIndex = ref(0)
const pageSize = ref(10)
const selectedRows = ref({})

// Dialog states
const dialogVisible = ref(false)
const deleteDialogVisible = ref(false)
const dialogLoading = ref(false)
const selectedEquipment = ref<Equipment | null>(null)
const deleteDialogTitle = ref('')
const deleteDialogDescription = ref('')
const itemToDelete = ref<number | null>(null)

// Define table columns
const columns: ColumnDef<Equipment>[] = [
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
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const equipment = row.original
      
      return h('div', { class: 'flex justify-end space-x-2' }, [
        h(Button, {
          variant: 'outline',
          size: 'sm',
          onClick: () => openEquipmentDialog(equipment),
        }, () => h(PencilIcon, { class: 'h-4 w-4' })),
        h(Button, {
          variant: 'outline',
          size: 'sm',
          onClick: () => confirmDeleteEquipment(equipment),
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
  await equipmentStore.fetchEquipment()
})

// Dialog handlers
function openEquipmentDialog(equipment?: Equipment) {
  selectedEquipment.value = equipment ? { ...equipment } : null
  dialogVisible.value = true
}

function confirmDeleteEquipment(equipment: Equipment) {
  itemToDelete.value = equipment.id || null
  deleteDialogTitle.value = 'Delete Equipment'
  deleteDialogDescription.value = `Are you sure you want to delete "${equipment.name}"?`
  deleteDialogVisible.value = true
}

// Save equipment
async function saveEquipment(equipmentData: any) {
  dialogLoading.value = true
  try {
    if (selectedEquipment.value?.id) {
      // Update
      const result = await equipmentStore.updateEquipment(selectedEquipment.value.id, equipmentData)
      if (result) {
        toast({
          title: "Equipment updated",
          description: `Equipment "${equipmentData.name}" has been updated successfully.`
        })
        dialogVisible.value = false
      }
    } else {
      // Create
      const result = await equipmentStore.createEquipment(equipmentData)
      if (result) {
        toast({
          title: "Equipment created",
          description: `Equipment "${equipmentData.name}" has been created successfully.`
        })
        dialogVisible.value = false
      }
    }
  } catch (error) {
    toast({
      title: "Error",
      description: `Failed to ${selectedEquipment.value?.id ? 'update' : 'create'} equipment.`,
      variant: "destructive"
    })
  } finally {
    dialogLoading.value = false
  }
}

// Handle delete
async function handleDelete() {
  if (!itemToDelete.value) return
  
  dialogLoading.value = true
  try {
    const success = await equipmentStore.deleteEquipment(itemToDelete.value)
    
    if (success) {
      toast({ title: "Equipment deleted successfully" })
      deleteDialogVisible.value = false
    } else {
      toast({
        title: "Delete failed",
        description: "There was an error deleting the equipment.",
        variant: "destructive"
      })
    }
  } finally {
    dialogLoading.value = false
  }
}
</script>
