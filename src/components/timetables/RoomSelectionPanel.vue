<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useBuildingStore } from '@/store/buildings'
import { useEquipmentStore } from '@/store/equipment'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Building, X as XIcon } from 'lucide-vue-next'
import RoomFilter from '@/components/common/ComboBoxFilter.vue'
import CapacitySliderFilter from '@/components/common/CapacitySliderFilter.vue'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

const overrideRooms = defineModel('overrideRooms', {
  required: true,
  default: false,
})

const selectedRoomId = defineModel<number | undefined>('selectedRoomId', {
  required: true,
  default: null,
})

const buildingStore = useBuildingStore()
const equipmentStore = useEquipmentStore()
const selectedBuildingIds = ref<(string | number)[]>([])
const selectedRoomGroups = ref<(string | number)[]>([])
const selectedEquipmentIds = ref<(string | number)[]>([])
const searchQuery = ref('')
const capacityRange = ref<[number, number]>([0, 300])



const buildingOptions = computed(() => {
  return buildingStore.buildings.map(building => ({
    label: `${building.name} (${building.abbrev})`,
    value: building.id,
  }))
})

const equipmentOptions = computed(() => {
  return equipmentStore.equipment.map(item => ({
    label: item.name,
    value: item.id,
  }))
})

const roomGroupOptions = [
  { label: 'Lecture Rooms', value: 'lecture', count: 10 },
  { label: 'Lab Rooms', value: 'lab', count: 8 },
  { label: 'Seminar Rooms', value: 'seminar', count: 15 }
]

const isFiltered = computed(() =>
  selectedBuildingIds.value.length > 0 ||
  selectedRoomGroups.value.length > 0 ||
  selectedEquipmentIds.value.length > 0 ||
  searchQuery.value.trim() !== '' ||
  capacityRange.value[0] > 0 ||
  capacityRange.value[1] < 300
)


const roomsWithEquipment = ref(new Map<number, Set<number>>())

const previousEquipmentIds = ref<(string | number)[]>([])


watch(selectedEquipmentIds, async (newValues, oldValues) => {
  const added = newValues.filter(id => !previousEquipmentIds.value.includes(id))

  for (const equipmentId of added) {
    const numericId = Number(equipmentId)

    if (!roomsWithEquipment.value.has(numericId)) {

      const equipmentResults = await buildingStore.fetchRoomEquipmentByEquipment(numericId)


      const roomSet = new Set<number>()
      for (const item of equipmentResults) {
        roomSet.add(item.room)
      }

      roomsWithEquipment.value.set(numericId, roomSet)
    }
  }

  previousEquipmentIds.value = [...newValues]
}, { immediate: true })

const filteredRooms = computed(() => {
  let rooms = buildingStore.rooms

  if (searchQuery.value.trim() !== '') {
    const query = searchQuery.value.toLowerCase()
    rooms = rooms.filter(room =>
      room.name.toLowerCase().includes(query) ||
      (room.capacity && String(room.capacity).includes(query))
    )
  }

  if (selectedBuildingIds.value.length > 0) {
    rooms = rooms.filter(room => selectedBuildingIds.value.includes(room.building))
  }

  if (selectedRoomGroups.value.length > 0) {
    rooms = rooms.filter(room => {

      if (selectedRoomGroups.value.includes('lecture')) {
        if (room.name.toLowerCase().includes('lect')) return true
      }
      if (selectedRoomGroups.value.includes('lab')) {
        if (room.name.toLowerCase().includes('lab')) return true
      }
      if (selectedRoomGroups.value.includes('seminar')) {
        if (room.name.toLowerCase().includes('sem')) return true
      }
      return false
    })
  }

  if (capacityRange.value[0] > 0 || capacityRange.value[1] < 300) {
    rooms = rooms.filter(room => {
      if (room.capacity < capacityRange.value[0])
        return false

      if (capacityRange.value[1] < 300) {
        return room.capacity <= capacityRange.value[1]
      }

      return true
    })
  }

  if (selectedEquipmentIds.value.length > 0) {
    rooms = rooms.filter(room => {
      if (!room.id) return false


      for (const equipmentId of selectedEquipmentIds.value) {
        const roomsWithThisEquipment = roomsWithEquipment.value.get(Number(equipmentId))
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
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="p-3 border-b">
      <div class="w-full flex flex-col mb-3">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center">
            <h3 class="text-lg font-semibold mr-4">Room Selection</h3>
            <div v-if="selectedRoomId">
              <Badge variant="outline" class="flex items-center gap-2 h-7">
                <Building class="w-4 h-4" />
                <span>{{filteredRooms.find(room => room.id === selectedRoomId)?.name || `Room
                  ${selectedRoomId}`}}</span>
                <Button variant="ghost" size="icon" class="h-4 w-4" @click="selectedRoomId = undefined">
                  <span class="sr-only">Remove</span>
                  &times;
                </Button>
              </Badge>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <Label for="override-rooms" class="text-sm text-muted-foreground">Override rooms</Label>
            <Switch id="override-rooms" v-model:checked="overrideRooms" />
          </div>
        </div>

        <div class="flex flex-wrap gap-2">

          <Input placeholder="Search rooms..." v-model="searchQuery" class="h-8 w-[150px] lg:w-[200px]" />
          <RoomFilter title="Buildings" :options="buildingOptions" v-model="selectedBuildingIds" />
          <RoomFilter title="Room Types" :options="roomGroupOptions" v-model="selectedRoomGroups" />
          <RoomFilter title="Equipment" :options="equipmentOptions" v-model="selectedEquipmentIds" />
          <CapacitySliderFilter v-model="capacityRange" />

          <Button v-if="isFiltered" variant="ghost" class="h-8 px-2 lg:px-3" @click="resetAll">
            Reset
            <XIcon class="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>

    <ScrollArea class="flex-1 p-2">
      <div class="flex flex-wrap gap-2">
        <Button v-for="room in filteredRooms" :key="room.id" variant="outline"
          :class="{ 'bg-primary text-primary-foreground': selectedRoomId === room.id }" size="sm" class="h-8 px-3"
          @click="selectedRoomId = room.id">
          {{ room.name }}
        </Button>
      </div>
      <div v-if="filteredRooms.length === 0" class="text-center py-8 text-muted-foreground">
        No rooms found.
      </div>
      <ScrollBar />
    </ScrollArea>
  </div>
</template>