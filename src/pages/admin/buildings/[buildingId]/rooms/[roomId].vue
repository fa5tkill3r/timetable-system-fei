<template>
  <div class="container space-y-6 py-6">
    <div
      v-if="(!room || !building) && buildingStore.isLoading"
      class="flex justify-center py-8"
    >
      <div
        class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
      ></div>
    </div>

    <template v-else-if="building && room">
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
            <BreadcrumbLink :href="`/admin/buildings/${buildingId}/rooms`">{{
              building.name
            }}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{{ room.name }}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold">Equipment in {{ room.name }}</h1>
        <Button @click="openEquipmentDialog()">Add New Equipment</Button>
      </div>

      <div class="space-y-2 rounded-md border bg-muted/40 p-4">
        <div class="grid gap-2">
          <div class="flex items-center gap-2">
            <BuildingIcon class="h-5 w-5" />
            <h2 class="text-lg font-medium">{{ building.name }}</h2>
            <Badge
              variant="outline"
              class="ml-2"
              >{{ building.abbrev }}</Badge
            >
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
        @search-change="onSearchChange"
        @selection-change="onSelectionChange"
      >
        <template #empty>
          No equipment found. Add your first equipment to this room.
        </template>

        <template #selection-actions>
          <div class="space-x-2">
            <Button
              variant="outline"
              size="sm"
            >
              Export Selected
            </Button>
            <Button
              variant="destructive"
              size="sm"
            >
              Delete Selected
            </Button>
          </div>
        </template>

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

    <div
      v-else
      class="rounded-md border bg-muted p-4 text-center"
    >
      Room not found
    </div>

    <RoomEquipmentDialog
      :open="equipmentDialogVisible"
      :room-equipment="selectedEquipment"
      :room-id="roomId"
      :room-name="room?.name || ''"
      :is-loading="dialogLoading"
      @update:open="equipmentDialogVisible = $event"
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
  import { ref, computed, h, watch, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useBuildingStore } from '@/store/buildings'
  import { useEquipmentStore } from '@/store/equipment'
  import { useToast } from '@/components/ui/toast/use-toast'
  import { Button } from '@/components/ui/button'
  import { Badge } from '@/components/ui/badge'
  import DataTable from '@/components/common/DataTable.vue'
  import {
    PencilIcon,
    TrashIcon,
    BuildingIcon,
    DoorOpen,
    ArrowUpDown,
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
  import { components } from '@/types/schema'
  import TablePagination from '@/components/common/TablePagination.vue'
  import { Checkbox } from '@/components/ui/checkbox'
  import { Room } from '@/types'

  const buildingStore = useBuildingStore()
  const route = useRoute()
  const router = useRouter()
  const { toast } = useToast()
  const dataTable = ref<any>(null)

  const searchTerm = ref('')
  const pageIndex = ref(0)
  const pageSize = ref(10)
  const selectedRows = ref({})

  interface RouteParams {
    buildingId: string
    roomId: string
  }

  type RoomEquipment = components['schemas']['RoomEquipment']

  const params = route.params as RouteParams
  const buildingId = computed(() => parseInt(params.buildingId))
  const roomId = computed(() => parseInt(params.roomId))

  const building = computed(() => buildingStore.selectedBuilding)
  const room = computed(() => buildingStore.selectedRoom)
  const roomEquipment = ref<RoomEquipment[]>([])

  const equipmentStore = useEquipmentStore()
  const availableEquipment = computed(() => equipmentStore.equipment)

  const equipment = computed(() => {
    if (!room.value || !roomEquipment.value) return []

    return roomEquipment.value.map((item) => {
      const equipDetails = availableEquipment.value.find(
        (e) => e.id === item.equipment,
      )
      return {
        id: item.id,
        equipment_id: item.equipment,
        room_id: item.room,
        count: item.count,
        name: equipDetails?.name || `Equipment ID: ${item.equipment}`,
      }
    })
  })

  const columns: ColumnDef<any>[] = [
    {
      id: 'select',
      header: ({ table }) =>
        h(Checkbox, {
          modelValue:
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate'),
          'onUpdate:modelValue': (value: boolean) =>
            table.toggleAllPageRowsSelected(!!value),
          ariaLabel: 'Select all',
        }),
      cell: ({ row }) =>
        h(Checkbox, {
          modelValue: row.getIsSelected(),
          'onUpdate:modelValue': (value: boolean) =>
            row.toggleSelected(!!value),
          ariaLabel: 'Select row',
        }),
      enableSorting: false,
      enableHiding: false,
    },
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
      accessorKey: 'count',
      header: ({ column }) => {
        return h(
          Button,
          {
            variant: 'ghost',
            onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
          },
          () => ['Count', h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })],
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

  const fetchData = async () => {
    if (roomId.value) {
      buildingStore
        .fetchRoomEquipment(roomId.value)
        .then((response: RoomEquipment[]) => {
          console.log('Fetched Room Equipment:', response)

          roomEquipment.value = response
          console.log('Room Equipment:', roomEquipment.value)
        })
    }
  }

  const onSearchChange = (value: string) => {
    searchTerm.value = value
    pageIndex.value = 0
  }

  const onPageChange = (page: number) => {
    pageIndex.value = page
  }

  const onSelectionChange = (selection: Record<string, boolean>) => {
    selectedRows.value = selection
  }

  async function loadData(buildingId: number, roomId: number) {
    if (!building.value || building.value.id !== buildingId) {
      const buildingData = await buildingStore.getBuilding(buildingId)
      if (!buildingData) {
        toast({
          title: 'Building not found',
          description: "The building you're looking for doesn't exist.",
          variant: 'destructive',
        })
        router.push('/admin/buildings')
        return
      }
    }

    const roomData = await buildingStore.getRoom(roomId)
    if (!roomData) {
      toast({
        title: 'Room not found',
        description: "The room you're looking for doesn't exist.",
        variant: 'destructive',
      })
      router.push(`/admin/buildings/${buildingId}/rooms`)
      return
    }

    if (parseInt(String(roomData.building)) !== buildingId) {
      toast({
        title: 'Room not in this building',
        description:
          "The room you're trying to access doesn't belong to this building.",
        variant: 'destructive',
      })
      router.push(`/admin/buildings/${buildingId}/rooms`)
      return
    }

    await fetchData()
  }

  watch(
    () => [params.buildingId, params.roomId],
    async ([newBuildingId, newRoomId]) => {
      if (newBuildingId && newRoomId) {
        await loadData(
          parseInt(newBuildingId as string),
          parseInt(newRoomId as string),
        )
      }
    },
    { immediate: true },
  )

  function openEquipmentDialog(item?: any) {
    selectedEquipment.value = item ? { ...item } : null
    equipmentDialogVisible.value = true
  }

  function confirmDeleteEquipment(item: any) {
    console.log('Deleting', item)
    itemToDelete.value = item.id
    deleteDialogTitle.value = 'Delete Equipment'
    deleteDialogDescription.value = `Are you sure you want to delete "${item.name}"?`
    deleteDialogVisible.value = true
  }

  async function saveEquipment(equipmentData: any) {
    dialogLoading.value = true
    try {
      if (selectedEquipment.value?.id) {
        const result = await buildingStore.updateRoomEquipment(
          selectedEquipment.value.id,
          {
            equipment: equipmentData.equipment_id || equipmentData.equipment,
            room: roomId.value,
            count: equipmentData.count,
          },
        )
        if (result) {
          toast({
            title: 'Equipment updated',
            description: `Equipment has been updated successfully.`,
          })
          equipmentDialogVisible.value = false
          await fetchData()
        }
      } else {
        const result = await buildingStore.createRoomEquipment(roomId.value, {
          equipment: equipmentData.equipment_id || equipmentData.equipment,
          room: roomId.value,
          count: equipmentData.count,
        })
        if (result) {
          toast({
            title: 'Equipment added',
            description: `Equipment has been added successfully.`,
          })
          equipmentDialogVisible.value = false
          await fetchData()
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${selectedEquipment.value?.id ? 'update' : 'add'} equipment.`,
        variant: 'destructive',
      })
    } finally {
      dialogLoading.value = false
    }
  }

  async function handleDelete() {
    console.log('Deleting', itemToDelete.value)
    if (!itemToDelete.value) return

    dialogLoading.value = true
    try {
      const success = await buildingStore.deleteRoomEquipment(
        itemToDelete.value,
        roomId.value,
      )

      if (success) {
        toast({ title: 'Equipment deleted successfully' })
        deleteDialogVisible.value = false
        await fetchData()
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

  const equipmentDialogVisible = ref(false)
  const deleteDialogVisible = ref(false)
  const dialogLoading = ref(false)
  const selectedEquipment = ref<any | null>(null)
  const deleteDialogTitle = ref('')
  const deleteDialogDescription = ref('')
  const itemToDelete = ref<number | null>(null)
</script>
