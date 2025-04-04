<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBuildingStore } from '@/store/buildings'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Building, X as XIcon } from 'lucide-vue-next'
import RoomFilter from '@/components/common/ComboBoxFilter.vue'

const props = defineProps<{
  selectedRoomId: number | null
}>()

const emit = defineEmits<{
  'update:selectedRoomId': [value: number | null]
}>()

const buildingStore = useBuildingStore()
const selectedBuildingIds = ref<(string | number)[]>([])
const selectedRoomGroups = ref<(string | number)[]>([])
const searchQuery = ref('')

// Prepare filter options
const buildingOptions = computed(() => {
  return buildingStore.buildings.map(building => ({
    label: `${building.name} (${building.abbrev})`,
    value: building.id,
    count: buildingStore.rooms.filter(room => room.building_id === building.id).length
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
  searchQuery.value.trim() !== ''
)

const filteredRooms = computed(() => {
  let rooms = buildingStore.rooms
  
  if (searchQuery.value.trim() !== '') {
    const query = searchQuery.value.toLowerCase()
    rooms = rooms.filter(room => 
      room.name.toLowerCase().includes(query) || 
      (room.description && room.description.toLowerCase().includes(query))
    )
  }
  
  if (selectedBuildingIds.value.length > 0) {
    rooms = rooms.filter(room => selectedBuildingIds.value.includes(room.building_id))
  }
  
  if (selectedRoomGroups.value.length > 0) {
    rooms = rooms.filter(room => {
      // This is a placeholder implementation - replace with actual room group logic
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
  
  return rooms
})

function selectRoom(roomId: number) {
  emit('update:selectedRoomId', roomId === props.selectedRoomId ? null : roomId)
}

function clearRoom() {
  emit('update:selectedRoomId', null)
}

function resetAll() {
  selectedBuildingIds.value = []
  selectedRoomGroups.value = []
  searchQuery.value = ''
  clearRoom()
}
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="p-3 border-b">
      <div class="flex items-center mb-3">
<h3 class="text-lg font-semibold mr-4">Room Selection</h3>
        <div class="flex flex-1 items-center space-x-2">
          <Input
            placeholder="Search rooms..."
            v-model="searchQuery"
            class="h-8 w-[150px] lg:w-[200px]"
          />
          <RoomFilter 
            title="Buildings" 
            :options="buildingOptions"
            v-model="selectedBuildingIds"
          />
          <RoomFilter 
            title="Room Types" 
            :options="roomGroupOptions"
            v-model="selectedRoomGroups"
          />
          
          <Button
            v-if="isFiltered"
            variant="ghost"
            class="h-8 px-2 lg:px-3"
            @click="resetAll"
          >
            Reset
            <XIcon class="ml-2 h-4 w-4" />
          </Button>
        </div>
              </div>
      
      <!-- Selected room display -->
      <div v-if="selectedRoomId" class="mt-1">
        <Badge variant="outline" class="flex items-center gap-2 px-3 py-1">
          <Building class="w-4 h-4" />
          <span>{{ filteredRooms.find(room => room.id === selectedRoomId)?.name || `Room ${selectedRoomId}` }}</span>
          <Button variant="ghost" size="icon" class="h-4 w-4 ml-1" @click="clearRoom">
            <span class="sr-only">Remove</span>
            &times;
          </Button>
        </Badge>
      </div>
    </div>
    
    <!-- Room grid -->
    <ScrollArea class="flex-1 p-2">
      <div class="flex flex-wrap gap-2">
        <Button 
          v-for="room in filteredRooms" 
          :key="room.id"
          variant="outline"
          :class="{ 'bg-primary text-primary-foreground': selectedRoomId === room.id }"
          size="sm"
          class="h-8 px-3"
          @click="selectRoom(room.id)"
        >
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