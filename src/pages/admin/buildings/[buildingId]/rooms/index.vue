<template>
  <div class="container space-y-6 py-6">
    <div
      v-if="!building && buildingStore.isLoading"
      class="flex justify-center py-8"
    >
      <div
        class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
      ></div>
    </div>

    <template v-else-if="building">
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
            <BreadcrumbPage>{{ building.name }}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold">Rooms in {{ building.name }}</h1>
        <Button @click="openRoomDialog()">Add New Room</Button>
      </div>

      <div class="space-y-2 rounded-md border bg-muted/40 p-4">
        <div class="flex items-center gap-2">
          <BuildingIcon class="h-5 w-5" />
          <h2 class="text-lg font-medium">{{ building.name }}</h2>
          <Badge
            variant="outline"
            class="ml-2"
            >{{ building.abbrev }}</Badge
          >
        </div>
      </div>

      <DataTable
        ref="dataTable"
        :data="rooms"
        :columns="columns"
        :is-loading="buildingStore.isLoading"
        :search-term="searchTerm"
        :page-index="pageIndex"
        :page-size="pageSize"
        enable-search
        enable-selection
        enable-column-visibility
        search-placeholder="Search rooms..."
        @search-change="onSearchChange"
      >
        <template #empty>
          No rooms found. Add your first room to this building.
        </template>

        <template #pagination="{ filteredCount, selectedCount }">
          <TablePagination
            :current-page="pageIndex"
            :page-size="pageSize"
            :total-count="filteredCount"
            @page-change="onPageChange"
          />
        </template>
      </DataTable>
    </template>

    <div
      v-else
      class="rounded-md border bg-muted p-4 text-center"
    >
      Building not found
    </div>

    <RoomDialog
      :open="roomDialogVisible"
      :room="selectedRoom"
      :building-id="buildingId"
      :is-loading="dialogLoading"
      @update:open="roomDialogVisible = $event"
      @save="saveRoom"
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
  import { ref, computed, h, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useBuildingStore } from '@/store/buildings'
  import { useToast } from '@/components/ui/toast/use-toast'
  import { Button } from '@/components/ui/button'
  import { Badge } from '@/components/ui/badge'
  import DataTable from '@/components/common/DataTable.vue'
  import {
    PencilIcon,
    TrashIcon,
    BuildingIcon,
    ArrowUpDown,
  } from 'lucide-vue-next'
  import RoomDialog from '@/components/buildings/RoomDialog.vue'
  import ConfirmDeleteDialog from '@/components/dialogs/ConfirmDeleteDialog.vue'
  import { RouterLink } from 'vue-router'
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

  type Room = components['schemas']['Room']

  interface RouteParams {
    buildingId: string
  }

  const buildingStore = useBuildingStore()
  const route = useRoute()
  const params = route.params as RouteParams
  const router = useRouter()
  const { toast } = useToast()
  const dataTable = ref<any>(null)

  const searchTerm = ref('')
  const pageIndex = ref(0)
  const pageSize = ref(10)

  const buildingId = computed(() => parseInt(params.buildingId))
  const building = computed(() => buildingStore.selectedBuilding)
  const rooms = computed(() => buildingStore.rooms)

  const roomDialogVisible = ref(false)
  const deleteDialogVisible = ref(false)
  const dialogLoading = ref(false)
  const selectedRoom = ref<Room | null>(null)
  const deleteDialogTitle = ref('')
  const deleteDialogDescription = ref('')
  const itemToDelete = ref<number | null>(null)

  const columns: ColumnDef<Room>[] = [
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
      cell: ({ row }) => {
        const id = row.original.id
        const name = row.getValue('name')
        return h(
          RouterLink,
          {
            to: `/admin/buildings/${buildingId.value}/rooms/${id}`,
            class: 'font-medium hover:underline text-primary',
          },
          () => name,
        )
      },
    },
    {
      accessorKey: 'capacity',
      header: ({ column }) => {
        return h(
          Button,
          {
            variant: 'ghost',
            onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
          },
          () => ['Capacity', h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })],
        )
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const room = row.original

        return h('div', { class: 'flex justify-end space-x-2' }, [
          h(
            Button,
            {
              variant: 'outline',
              size: 'sm',
              onClick: () => openRoomDialog(room),
            },
            () => h(PencilIcon, { class: 'h-4 w-4' }),
          ),
          h(
            Button,
            {
              variant: 'outline',
              size: 'sm',
              onClick: () => confirmDeleteRoom(room),
            },
            () => h(TrashIcon, { class: 'h-4 w-4' }),
          ),
        ])
      },
    },
  ]

  const fetchData = async () => {
    if (buildingId.value !== null) {
      await buildingStore.fetchRooms(buildingId.value)
    }
  }

  const onSearchChange = (value: string) => {
    searchTerm.value = value
    pageIndex.value = 0
  }

  const onPageChange = (page: number) => {
    pageIndex.value = page
  }

  async function loadBuilding(id: number) {
    const buildingData = await buildingStore.getBuilding(id)
    if (!buildingData) {
      toast({
        title: 'Building not found',
        description: "The building you're looking for doesn't exist.",
        variant: 'destructive',
      })
      router.push('/admin/buildings')
      return
    }
    await fetchData()
  }

  watch(
    () => params.buildingId,
    async (newId) => {
      if (newId !== null) {
        await loadBuilding(parseInt(newId as string))
      }
    },
    { immediate: true },
  )

  function openRoomDialog(room?: Room) {
    selectedRoom.value = room ? { ...room } : null
    roomDialogVisible.value = true
  }

  function confirmDeleteRoom(room: Room) {
    itemToDelete.value = room.id || null
    deleteDialogTitle.value = 'Delete Room'
    deleteDialogDescription.value = `Are you sure you want to delete room "${room.name}"? This will also delete all equipment in this room.`
    deleteDialogVisible.value = true
  }

  async function saveRoom(roomData: any) {
    dialogLoading.value = true
    try {
      if (selectedRoom.value?.id) {
        const result = await buildingStore.updateRoom(
          selectedRoom.value.id,
          roomData,
        )
        if (result) {
          toast({
            title: 'Room updated',
            description: `Room "${roomData.name}" has been updated successfully.`,
          })
          roomDialogVisible.value = false
          await fetchData()
        }
      } else {
        const result = await buildingStore.createRoom(roomData)
        if (result) {
          toast({
            title: 'Room created',
            description: `Room "${roomData.name}" has been created successfully.`,
          })
          roomDialogVisible.value = false
          await fetchData()
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${selectedRoom.value?.id ? 'update' : 'create'} room.`,
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
      const success = await buildingStore.deleteRoom(
        itemToDelete.value,
        buildingId.value,
      )

      if (success) {
        toast({ title: 'Room deleted successfully' })
        deleteDialogVisible.value = false
        await fetchData()
      } else {
        toast({
          title: 'Delete failed',
          description: 'There was an error deleting the room.',
          variant: 'destructive',
        })
      }
    } finally {
      dialogLoading.value = false
    }
  }
</script>
