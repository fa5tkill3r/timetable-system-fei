<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useBuildingStore } from '@/store/buildings'
import { useEquipmentStore } from '@/store/equipment'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Building, X as XIcon, BookOpen, Wrench, Users, MonitorDot } from 'lucide-vue-next'
import RoomFilter from '@/components/common/ComboBoxFilter.vue'
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

// Helper function to determine room type and icon based on name
const getRoomType = (name: string) => {
  const nameLower = name.toLowerCase()
  if (nameLower.includes('lect')) return { type: 'Lecture Room', icon: BookOpen }
  if (nameLower.includes('lab')) return { type: 'Laboratory', icon: Wrench }
  if (nameLower.includes('sem')) return { type: 'Seminar Room', icon: Users }
  return { type: 'Room', icon: Building }
}

// Get building name by ID
const getBuildingName = (buildingId: number) => {
  const building = buildingStore.buildings.find(b => b.id === buildingId)
  return building ? `${building.name} (${building.abbrev})` : 'Unknown Building'
}

// Cache for room equipment
const roomEquipmentCache = ref(new Map<number, any[]>())

// Function to get equipment for a room
const getRoomEquipment = async (roomId: number) => {
  if (!roomEquipmentCache.value.has(roomId)) {
    try {
      // Using the same fetch method as in [roomId].vue
      await buildingStore.fetchRoomEquipment(roomId)
      // Map equipment to include details
      const rawEquipment = buildingStore.roomEquipment
      const mappedEquipment = rawEquipment.map(item => {
        const equipDetails = equipmentStore.equipment.find(e => e.id === item.equipment);
        return {
          id: item.id,
          equipment_id: item.equipment,
          room_id: item.room,
          count: item.count,
          name: equipDetails?.name || `Equipment ID: ${item.equipment}`
        };
      });
      roomEquipmentCache.value.set(roomId, mappedEquipment)
    } catch (error) {
      console.error('Failed to fetch equipment for room', error)
      roomEquipmentCache.value.set(roomId, [])
    }
  }
  return roomEquipmentCache.value.get(roomId) || []
}

// Track which cards are currently open
const openHoverCards = ref(new Set<number>())

const handleHoverCardOpenChange = async (isOpen: boolean, roomId: number) => {
  if (isOpen) {
    openHoverCards.value.add(roomId)
    // Load equipment when hover card opens
    await getRoomEquipment(roomId)
  } else {
    openHoverCards.value.delete(roomId)
  }
}

// Fetch all equipment when component mounts
onMounted(async () => {
  if (equipmentStore.equipment.length === 0) {
    await equipmentStore.fetchEquipment()
  }
})
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
        <HoverCard 
          v-for="room in filteredRooms" 
          :key="room.id"
          @update:open="(isOpen) => handleHoverCardOpenChange(isOpen, room.id)">
          <HoverCardTrigger as-child>
            <Button variant="outline"
              :class="{ 'bg-primary text-primary-foreground': selectedRoomId === room.id }" size="sm" class="h-8 px-3"
              @click="selectedRoomId = room.id">
              {{ room.name }}
            </Button>
          </HoverCardTrigger>
          <HoverCardContent class="w-80">
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <h4 class="text-sm font-semibold">{{ room.name }}</h4>
                <Badge variant="outline" class="ml-2">
                  <component :is="getRoomType(room.name).icon" class="h-3 w-3 mr-1" />
                  {{ getRoomType(room.name).type }}
                </Badge>
              </div>
              
              <div class="grid grid-cols-2 gap-2 text-sm">
                <div class="flex items-center">
                  <Users class="h-4 w-4 mr-2 opacity-70" />
                  <span>Capacity: {{ room.capacity || 'Unknown' }}</span>
                </div>
                <div class="flex items-center">
                  <Building class="h-4 w-4 mr-2 opacity-70" />
                  <span>{{ getBuildingName(room.building) }}</span>
                </div>
              </div>
              
              <div v-if="room.id" class="text-sm">
                <div class="font-medium mb-1">Equipment:</div>
                <div class="flex flex-wrap gap-1">
                  <div v-if="!openHoverCards.has(room.id) || !roomEquipmentCache.has(room.id)" class="text-xs text-muted-foreground">
                    <div class="flex items-center gap-1">
                      <div class="h-3 w-3 rounded-full border-2 border-r-transparent border-primary animate-spin"></div>
                      Loading equipment...
                    </div>
                  </div>
                  <template v-else-if="roomEquipmentCache.get(room.id)?.length">
                    <Badge 
                      v-for="item in roomEquipmentCache.get(room.id)" 
                      :key="item.id" 
                      variant="secondary" 
                      class="text-xs">
                      <MonitorDot class="h-3 w-3 mr-1" />
                      {{ item.name }} {{ item.count > 1 ? `(${item.count})` : '' }}
                    </Badge>
                  </template>
                  <div v-else class="text-xs text-muted-foreground">
                    No equipment available
                  </div>
                </div>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
        
        <div v-if="filteredRooms.length === 0" class="text-center py-8 text-muted-foreground">
          No rooms found.
        </div>
      </div>
      <ScrollBar />
    </ScrollArea>
  </div>
</template>