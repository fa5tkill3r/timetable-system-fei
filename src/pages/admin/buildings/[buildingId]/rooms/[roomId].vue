<template>
  <div class="container py-6 space-y-6">
    <!-- Loading state -->
    <div v-if="(!room || !building) && buildingStore.isLoading" class="flex justify-center py-8">
      <div class="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
    </div>
    
    <template v-else-if="building && room">
      <!-- Breadcrumb navigation -->
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/buildings">Buildings</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink :href="`/admin/buildings/${buildingId}/rooms`">{{ building.name }}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{{ room.name }}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      <div class="flex justify-between items-center">
        <h1 class="text-2xl font-semibold">Equipment in {{ room.name }}</h1>
        <Button @click="openEquipmentDialog()">Add New Equipment</Button>
      </div>
      
      <!-- Room details -->
      <div class="p-4 border rounded-md bg-muted/40 space-y-2">
        <div class="grid gap-2">
          <div class="flex items-center gap-2">
            <BuildingIcon class="h-5 w-5" />
            <h2 class="text-lg font-medium">{{ building.name }}</h2>
            <Badge variant="outline" class="ml-2">{{ building.abbrev }}</Badge>
          </div>
          <div class="flex items-center gap-2">
            <DoorOpen class="h-5 w-5" />
            <h3 class="text-md font-medium">{{ room.name }}</h3>
          </div>
          <div class="text-muted-foreground">
            <!-- Remove floor info, only show capacity -->
            <div>Capacity: {{ room.capacity }}</div>
          </div>
        </div>
      </div>
      
      <!-- Equipment table with DataTable component -->
      <DataTable
        ref="dataTable"
        :data="equipment"
        :columns="columns"
        :is-loading="buildingStore.isLoading || equipmentStore.isLoading"
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
          No equipment found. Add your first equipment to this room.
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
    </template>

    <div v-else class="rounded-md border bg-muted p-4 text-center">
      Room not found
    </div>

    <!-- Dialogs -->
    <RoomEquipmentDialog
      :open="equipmentDialogVisible"
      :room-equipment="selectedEquipment"
      :room-id="roomId"
      :room-name="room?.name || ''"
      :is-loading="dialogLoading"
      @update:open="equipmentDialogVisible = $event"
      @save="saveEquipment"
    />

    <!-- Confirmation dialog -->
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
import { ref, computed, h, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBuildingStore } from '@/store/buildings'
import { useEquipmentStore } from '@/store/equipment'
import { useToast } from '@/components/ui/toast/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { 
  PencilIcon, TrashIcon, BuildingIcon, DoorOpen,
  ArrowUpDown 
} from 'lucide-vue-next'
import RoomEquipmentDialog from '@/components/buildings/RoomEquipmentDialog.vue'
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
import TablePagination from '@/components/common/table-pagination.vue'
import { Checkbox } from '@/components/ui/checkbox'

type Equipment = components['schemas']['Equipment']

// Initialize store, route and toast
const buildingStore = useBuildingStore()
const route = useRoute()
const router = useRouter()
const { toast } = useToast()
const dataTable = ref<any>(null)

// States for table
const searchTerm = ref('')
const pageIndex = ref(0)
const pageSize = ref(10)
const selectedRows = ref({})

interface RouteParams {
  buildingId: string;
  roomId: string;
}

const params = route.params as RouteParams;
const buildingId = computed(() => parseInt(params.buildingId));
const roomId = computed(() => parseInt(params.roomId));

// Get data from store
const building = computed(() => buildingStore.selectedBuilding)
const room = computed(() => buildingStore.selectedRoom)
const roomEquipment = computed(() => buildingStore.equipment)

// Initialize the equipment store to access available equipment items
const equipmentStore = useEquipmentStore()
const availableEquipment = computed(() => equipmentStore.equipment)

// Process equipment to include name from equipment store
const equipment = computed(() => {
  return roomEquipment.value.map(item => {
    const equipDetails = availableEquipment.value.find(e => e.id === item.equipment);
    return {
      id: item.id,
      equipment_id: item.equipment,
      room_id: item.room,
      count: item.count,
      name: equipDetails?.name || `Equipment ID: ${item.equipment}`
    };
  });
});

// Define table columns - without type column
const columns: ColumnDef<any>[] = [
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
    accessorKey: 'count',
    header: ({ column }) => {
      return h(Button, {
        variant: 'ghost',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      }, () => ['Count', h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })])
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

// Simplified data fetching
const fetchData = async () => {
  if (roomId.value) {
    await buildingStore.fetchEquipment(roomId.value)
    // Also fetch available equipment if not already loaded
    if (equipmentStore.equipment.length === 0) {
      await equipmentStore.fetchEquipment()
    }
  }
}

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

// Load building, room and equipment
async function loadData(buildingId: number, roomId: number) {
  // Load building if not already loaded or if different
  if (!building.value || building.value.id !== buildingId) {
    const buildingData = await buildingStore.getBuilding(buildingId)
    if (!buildingData) {
      toast({
        title: "Building not found",
        description: "The building you're looking for doesn't exist.",
        variant: "destructive"
      })
      router.push('/admin/buildings')
      return
    }
  }
  
  // Load room
  const roomData = await buildingStore.getRoom(roomId)
  if (!roomData) {
    toast({
      title: "Room not found",
      description: "The room you're looking for doesn't exist.",
      variant: "destructive"
    })
    router.push(`/admin/buildings/${buildingId}/rooms`)
    return
  }
  
  // Verify room belongs to this building
  if (parseInt(roomData.building as string) !== buildingId) {
    toast({
      title: "Room not in this building",
      description: "The room you're trying to access doesn't belong to this building.",
      variant: "destructive"
    })
    router.push(`/admin/buildings/${buildingId}/rooms`)
    return
  }
  
  // Load equipment with pagination
  await fetchData()
}

// Watch for route changes
watch(
  () => [params.buildingId, params.roomId],
  async ([newBuildingId, newRoomId]) => {
    if (newBuildingId && newRoomId) {
      await loadData(
        parseInt(newBuildingId as string),
        parseInt(newRoomId as string)
      )
    }
  },
  { immediate: true }
)

// Dialog handlers
function openEquipmentDialog(item?: any) {
  selectedEquipment.value = item ? { ...item } : null
  equipmentDialogVisible.value = true
}

// Confirm delete handlers
function confirmDeleteEquipment(item: any) {
  itemToDelete.value = item.id
  deleteDialogTitle.value = 'Delete Equipment'
  deleteDialogDescription.value = `Are you sure you want to delete "${item.name}"?`
  deleteDialogVisible.value = true
}

// Save equipment
async function saveEquipment(equipmentData: any) {
  dialogLoading.value = true
  try {
    if (selectedEquipment.value?.id) {
      // Update
      const result = await buildingStore.updateEquipment(selectedEquipment.value.id, {
        equipment_id: equipmentData.equipment_id,
        room_id: roomId.value,
        count: equipmentData.count
      })
      if (result) {
        toast({
          title: "Equipment updated",
          description: `Equipment has been updated successfully.`
        })
        equipmentDialogVisible.value = false
        await fetchData() // Refresh after update
      }
    } else {
      // Create
      const result = await buildingStore.createEquipment(roomId.value, {
        equipment_id: equipmentData.equipment_id,
        room_id: roomId.value,
        count: equipmentData.count
      })
      if (result) {
        toast({
          title: "Equipment added",
          description: `Equipment has been added successfully.`
        })
        equipmentDialogVisible.value = false
        await fetchData() // Refresh after create
      }
    }
  } catch (error) {
    toast({
      title: "Error",
      description: `Failed to ${selectedEquipment.value?.id ? 'update' : 'add'} equipment.`,
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
    const success = await buildingStore.deleteEquipment(itemToDelete.value, roomId.value)
    
    if (success) {
      toast({ title: "Equipment deleted successfully" })
      deleteDialogVisible.value = false
      await fetchData() // Refresh after delete
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

// Load available equipment on mount
onMounted(async () => {
  await equipmentStore.fetchEquipment()
})
</script>
