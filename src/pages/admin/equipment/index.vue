<template>
  <div class="container space-y-6 py-6">
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

    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">Equipment Management</h1>
      <Button @click="openEquipmentDialog()">Add New Equipment</Button>
    </div>

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
      @search-change="onSearchChange"
    >
      <template #empty> No equipment found. </template>

      <template #pagination="{ filteredCount }">
        <TablePagination
          :current-page="pageIndex"
          :page-size="pageSize"
          :total-count="filteredCount"
          @page-change="onPageChange"
        />
      </template>
    </DataTable>

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
  import { components } from '@/types/schema'
  import TablePagination from '@/components/common/TablePagination.vue'

  type Equipment = components['schemas']['Equipment']

  const equipmentStore = useEquipmentStore()
  const { toast } = useToast()
  const equipment = computed(() => equipmentStore.equipment)
  const searchTerm = ref('')
  const pageIndex = ref(0)
  const pageSize = ref(10)
  const selectedRows = ref({})

  const dialogVisible = ref(false)
  const deleteDialogVisible = ref(false)
  const dialogLoading = ref(false)
  const selectedEquipment = ref<Equipment | null>(null)
  const deleteDialogTitle = ref('')
  const deleteDialogDescription = ref('')
  const itemToDelete = ref<number | null>(null)

  const columns: ColumnDef<Equipment>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => {
        return h(
          Button,
          {
            variant: 'ghost',
            onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
          },
          () => ['Name', h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })],
        )
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const equipment = row.original

        return h('div', { class: 'flex justify-end space-x-2' }, [
          h(
            Button,
            {
              variant: 'outline',
              size: 'sm',
              onClick: () => openEquipmentDialog(equipment),
            },
            () => h(PencilIcon, { class: 'h-4 w-4' }),
          ),
          h(
            Button,
            {
              variant: 'outline',
              size: 'sm',
              onClick: () => confirmDeleteEquipment(equipment),
            },
            () => h(TrashIcon, { class: 'h-4 w-4' }),
          ),
        ])
      },
    },
  ]

  const onSearchChange = (value: string) => {
    searchTerm.value = value
    pageIndex.value = 0
  }

  const onPageChange = (page: number) => {
    pageIndex.value = page
  }

  onMounted(async () => {
    await equipmentStore.fetchEquipment()
  })

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

  async function saveEquipment(equipmentData: any) {
    dialogLoading.value = true
    try {
      if (selectedEquipment.value?.id) {
        const result = await equipmentStore.updateEquipment(
          selectedEquipment.value.id,
          equipmentData,
        )
        if (result) {
          toast({
            title: 'Equipment updated',
            description: `Equipment "${equipmentData.name}" has been updated successfully.`,
          })
          dialogVisible.value = false
        }
      } else {
        const result = await equipmentStore.createEquipment(equipmentData)
        if (result) {
          toast({
            title: 'Equipment created',
            description: `Equipment "${equipmentData.name}" has been created successfully.`,
          })
          dialogVisible.value = false
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${selectedEquipment.value?.id ? 'update' : 'create'} equipment.`,
        variant: 'destructive',
      })
    } finally {
      dialogLoading.value = false
    }
  }

  async function handleDelete() {
    if (!itemToDelete.value) return

    dialogLoading.value = true
    try {
      const success = await equipmentStore.deleteEquipment(itemToDelete.value)

      if (success) {
        toast({ title: 'Equipment deleted successfully' })
        deleteDialogVisible.value = false
      } else {
        toast({
          title: 'Delete failed',
          description: 'There was an error deleting the equipment.',
          variant: 'destructive',
        })
      }
    } finally {
      dialogLoading.value = false
    }
  }
</script>
