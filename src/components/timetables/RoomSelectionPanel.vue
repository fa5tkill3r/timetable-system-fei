<script setup lang="ts">
  import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
  import { useBuildingStore } from '@/store/buildings'
  import { useEquipmentStore } from '@/store/equipment'
  import { useRoomGroupStore } from '@/store/roomGroups'
  import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
  import { Badge } from '@/components/ui/badge'
  import { Button } from '@/components/ui/button'
  import { Input } from '@/components/ui/input'
  import {
    Building,
    X as XIcon,
    BookOpen,
    Wrench,
    Users,
    MonitorDot,
  } from 'lucide-vue-next'
  import RoomFilter, {
    RoomFilterOption,
  } from '@/components/common/ComboBoxFilter.vue'
  import CapacitySliderFilter from '@/components/common/CapacitySliderFilter.vue'
  import { Switch } from '@/components/ui/switch'
  import { Label } from '@/components/ui/label'
  import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
  } from '@/components/ui/hover-card'

  const overrideRooms = defineModel('overrideRooms', {
    required: true,
    default: false,
  })

  const selectedRoomId = defineModel<number | undefined>('selectedRoomId', {
    required: true,
    default: null,
  })

  interface RoomEquipments {
    id: number
    equipment_id: number
    room_id: number
    count: number
    name?: string
  }

  const buildingStore = useBuildingStore()
  const equipmentStore = useEquipmentStore()
  const roomGroupStore = useRoomGroupStore()
  const selectedBuildingIds = ref<(string | number)[]>([])
  const selectedRoomGroups = ref<(string | number)[]>([])
  const selectedEquipmentIds = ref<(string | number)[]>([])
  const searchQuery = ref('')
  const capacityRange = ref<[number, number]>([0, 300])
  const roomEquipments = ref<RoomEquipments[] | null>(null)

  const buildingOptions = computed(() => {
    return buildingStore.buildings.map(
      (building) =>
        ({
          label: `${building.name} (${building.abbrev})`,
          value: building.id,
        }) as RoomFilterOption,
    )
  })

  const equipmentOptions = computed(() => {
    return equipmentStore.equipment.map(
      (item) =>
        ({
          label: item.name,
          value: item.id,
        }) as RoomFilterOption,
    )
  })

  const roomGroupOptions = computed(() => roomGroupStore.groupOptions)

  const isFiltered = computed(
    () =>
      selectedBuildingIds.value.length > 0 ||
      selectedRoomGroups.value.length > 0 ||
      selectedEquipmentIds.value.length > 0 ||
      searchQuery.value.trim() !== '' ||
      capacityRange.value[0] > 0 ||
      capacityRange.value[1] < 300,
  )

  const roomsWithEquipment = ref(new Map<number, Set<number>>())

  const previousEquipmentIds = ref<(string | number)[]>([])

  watch(
    selectedEquipmentIds,
    async (newValues, oldValues) => {
      const added = newValues.filter(
        (id) => !previousEquipmentIds.value.includes(id),
      )

      for (const equipmentId of added) {
        const numericId = Number(equipmentId)

        if (!roomsWithEquipment.value.has(numericId)) {
          const equipmentResults =
            await buildingStore.fetchRoomEquipmentByEquipment(numericId)

          const roomSet = new Set<number>()
          for (const item of equipmentResults) {
            roomSet.add(item.room)
          }

          roomsWithEquipment.value.set(numericId, roomSet)
        }
      }

      previousEquipmentIds.value = [...newValues]
    },
    { immediate: true },
  )

  const filteredRooms = computed(() => {
    let rooms = buildingStore.rooms

    if (searchQuery.value.trim() !== '') {
      const query = searchQuery.value.toLowerCase()
      rooms = rooms.filter(
        (room) =>
          room.name.toLowerCase().includes(query) ||
          (room.capacity && String(room.capacity).includes(query)),
      )
    }

    if (selectedBuildingIds.value.length > 0) {
      rooms = rooms.filter((room) =>
        selectedBuildingIds.value.includes(room.building!),
      )
    }

    if (selectedRoomGroups.value.length > 0) {
      rooms = rooms.filter((room) => {
        if (!room.id) return false

        return selectedRoomGroups.value.some((groupName) =>
          roomGroupStore.isRoomInGroup(room.id!, String(groupName)),
        )
      })
    }

    if (capacityRange.value[0] > 0 || capacityRange.value[1] < 300) {
      rooms = rooms.filter((room) => {
        if (room.capacity < capacityRange.value[0]) return false

        if (capacityRange.value[1] < 300) {
          return room.capacity <= capacityRange.value[1]
        }

        return true
      })
    }

    if (selectedEquipmentIds.value.length > 0) {
      rooms = rooms.filter((room) => {
        if (!room.id) return false

        for (const equipmentId of selectedEquipmentIds.value) {
          const roomsWithThisEquipment = roomsWithEquipment.value.get(
            Number(equipmentId),
          )
          if (!roomsWithThisEquipment || !roomsWithThisEquipment.has(room.id)) {
            return false
          }
        }
        return true
      })
    }

    return rooms
  })

  function resetAll() {
    selectedBuildingIds.value = []
    selectedRoomGroups.value = []
    selectedEquipmentIds.value = []
    previousEquipmentIds.value = []
    searchQuery.value = ''
    capacityRange.value = [0, 300]
  }

  const getRoomType = (roomId?: number) => {
    if (!roomId) return 'Room'
    return roomGroupStore.getRoomGroups(roomId)[0]?.name ?? 'Room'
  }

  const getBuildingName = (buildingId: number | null) => {
    const building = buildingStore.buildings.find((b) => b.id === buildingId)
    return building
      ? `${building.name} (${building.abbrev})`
      : 'Unknown Building'
  }

  function getRoomEquipment(roomId: number) {
    if (!roomId) {
      roomEquipments.value = null
      return
    }

    buildingStore.fetchRoomEquipment(roomId).then((equipment) => {
      if (!equipment) return []

      roomEquipments.value = equipment.map((item) => {
        const equipDetails = equipmentStore.equipment.find(
          (e) => e.id === item.equipment,
        )

        return {
          id: item.id!,
          equipment_id: item.equipment,
          room_id: item.room,
          count: item.count,
          name: equipDetails?.name,
        }
      })
    })
  }

  const isCompactMode = ref(false)
  const isVeryCompactMode = ref(false)
  const containerRef = ref<HTMLElement | null>(null)
  let resizeObserver: ResizeObserver | null = null

  onMounted(() => {
    if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const height = entry.contentRect.height
          isCompactMode.value = height < 150
          isVeryCompactMode.value = height < 100
        }
      })

      resizeObserver.observe(containerRef.value)
    }
  })

  onUnmounted(() => {
    if (resizeObserver) {
      resizeObserver.disconnect()
    }
  })
</script>

<template>
  <div class="flex h-full">
    <div
      ref="containerRef"
      class="flex h-full flex-1 flex-col"
    >
      <div
        v-if="!isCompactMode"
        class="border-b p-3"
      >
        <div class="mb-3 flex w-full flex-col">
          <div class="mb-2 flex items-center justify-between">
            <div class="flex items-center">
              <h3 class="mr-4 text-lg font-semibold">
                {{ $t('timetable.editor.roomSelection.title') }}
              </h3>
              <div v-if="selectedRoomId">
                <Badge
                  variant="outline"
                  class="flex h-7 items-center gap-2"
                >
                  <Building class="h-4 w-4" />
                  <span>{{
                    filteredRooms.find((room) => room.id === selectedRoomId)
                      ?.name ||
                    `Room
                    ${selectedRoomId}`
                  }}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-4 w-4"
                    @click="selectedRoomId = undefined"
                  >
                    &times;
                  </Button>
                </Badge>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <Label
                for="override-rooms"
                class="text-sm text-muted-foreground"
                >{{ $t('timetable.editor.roomSelection.overrideRooms') }}</Label
              >
              <Switch
                id="override-rooms"
                v-model:checked="overrideRooms"
              />
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <Input
              :placeholder="$t('timetable.editor.roomSelection.searchRooms')"
              v-model="searchQuery"
              class="h-8 w-[150px] lg:w-[200px]"
            />
            <RoomFilter
              :title="$t('timetable.editor.roomSelection.buildings')"
              :options="buildingOptions"
              v-model="selectedBuildingIds"
            />
            <RoomFilter
              :title="$t('timetable.editor.roomSelection.roomTypes')"
              :options="roomGroupOptions"
              v-model="selectedRoomGroups"
            />
            <RoomFilter
              :title="$t('timetable.editor.roomSelection.equipment')"
              :options="equipmentOptions"
              v-model="selectedEquipmentIds"
            />
            <CapacitySliderFilter
              :title="$t('timetable.editor.roomSelection.capacity')"
              v-model="capacityRange"
            />

            <Button
              v-if="isFiltered"
              variant="ghost"
              class="h-8 px-2 lg:px-3"
              @click="resetAll"
            >
              {{ $t('reset') }}
              <XIcon class="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div
        v-if="isCompactMode && selectedRoomId"
        class="px-2 pt-2"
      >
        <Badge
          variant="outline"
          class="flex h-7 items-center gap-2"
        >
          <Building class="h-4 w-4" />
          <span>{{
            filteredRooms.find((room) => room.id === selectedRoomId)?.name ||
            `Room ${selectedRoomId}`
          }}</span>
          <Button
            variant="ghost"
            size="icon"
            class="h-4 w-4"
            @click="selectedRoomId = undefined"
          >
            &times;
          </Button>
        </Badge>
      </div>

      <ScrollArea class="flex-1 p-2">
        <div class="flex flex-wrap gap-2">
          <HoverCard
            v-for="room in filteredRooms"
            :key="room.id"
            @update:open="(open) => (open ? getRoomEquipment(room.id!) : null)"
          >
            <HoverCardTrigger as-child>
              <Button
                variant="outline"
                :class="{
                  'bg-primary text-primary-foreground':
                    selectedRoomId === room.id,
                }"
                size="sm"
                class="h-8 px-3"
                @click="selectedRoomId = room.id"
              >
                {{ room.name }}
              </Button>
            </HoverCardTrigger>
            <HoverCardContent class="w-80">
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <h4 class="text-sm font-semibold">{{ room.name }}</h4>
                  <Badge
                    variant="outline"
                    class="ml-2"
                  >
                    <Building class="mr-1 h-4 w-4" />
                    {{ getRoomType(room.id) }}
                  </Badge>
                </div>

                <div class="grid grid-cols-2 gap-2 text-sm">
                  <div class="flex items-center">
                    <Users class="mr-2 h-4 w-4 opacity-70" />
                    <span
                      >{{ $t('timetable.editor.roomSelection.capacity') }}:
                      {{ room.capacity || 'Unknown' }}</span
                    >
                  </div>
                  <div class="flex items-center">
                    <Building class="mr-2 h-4 w-4 opacity-70" />
                    <span>{{ getBuildingName(room.building) }}</span>
                  </div>
                </div>

                <div
                  v-if="
                    room.id && roomGroupStore.getRoomGroups(room.id).length > 0
                  "
                  class="text-sm"
                >
                  <div class="mb-1 font-medium">
                    {{ $t('timetable.editor.roomSelection.roomGroup') }}:
                  </div>
                  <div class="flex flex-wrap gap-1">
                    <Badge
                      v-for="group in roomGroupStore.getRoomGroups(room.id)"
                      :key="group.id"
                      variant="outline"
                      class="text-xs"
                    >
                      {{ group.name }}
                    </Badge>
                  </div>
                </div>

                <div
                  v-if="room.id"
                  class="text-sm"
                >
                  <div class="mb-1 font-medium">
                    {{ $t('timetable.editor.roomSelection.equipment') }}:
                  </div>
                  <div class="flex flex-wrap gap-1">
                    <div
                      v-if="roomEquipments"
                      class="flex flex-wrap gap-1"
                    >
                      <template v-if="roomEquipments.length > 0">
                        <Badge
                          v-for="item in roomEquipments"
                          :key="item.id"
                          variant="secondary"
                          class="text-xs"
                        >
                          <MonitorDot class="mr-1 h-3 w-3" />
                          {{ item.name }}
                          {{ item.count > 1 ? `(${item.count})` : '' }}
                        </Badge>
                      </template>
                      <div
                        v-else
                        class="text-xs text-muted-foreground"
                      >
                        {{ $t('timetable.editor.roomSelection.noEquipment') }}
                      </div>
                    </div>
                    <div
                      v-else
                      class="text-xs text-muted-foreground"
                    >
                      <div class="flex items-center gap-1">
                        <div
                          class="h-3 w-3 animate-spin rounded-full border-2 border-primary border-r-transparent"
                        ></div>
                        {{
                          $t('timetable.editor.roomSelection.loadingEquipment')
                        }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>

          <div
            v-if="filteredRooms.length === 0"
            class="py-8 text-center text-muted-foreground"
          >
            {{ $t('timetable.editor.roomSelection.noRoomsFound') }}
          </div>
        </div>
        <ScrollBar />
      </ScrollArea>
    </div>

    <div
      v-if="isCompactMode"
      class="flex h-full w-48 items-center border-l bg-white py-4"
      :class="{
        'flex-col justify-between': !isVeryCompactMode,
        'justify-center': isVeryCompactMode,
      }"
    >
      <div
        class="flex items-center gap-2"
        :class="{ 'flex-col': !isVeryCompactMode }"
      >
        <Input
          id="compact-search"
          v-model="searchQuery"
          class="h-8 w-40 px-2 text-sm"
          :class="{
            'w-24': isVeryCompactMode,
          }"
          :placeholder="
            isVeryCompactMode
              ? $t('timetable.editor.roomSelection.search')
              : $t('timetable.editor.roomSelection.searchRooms')
          "
        />

        <div
          class="flex flex-col items-center"
          :class="{
            'gap-2': !isVeryCompactMode,
          }"
        >
          <Label
            for="compact-override-rooms"
            class="text-xs text-muted-foreground"
          >
            {{
              isVeryCompactMode
                ? $t('timetable.editor.roomSelection.override')
                : $t('timetable.editor.roomSelection.overrideRooms')
            }}
          </Label>
          <Switch
            id="compact-override-rooms"
            v-model:checked="overrideRooms"
            :class="{ 'scale-75': isVeryCompactMode }"
          />
        </div>
      </div>
    </div>
  </div>
</template>
