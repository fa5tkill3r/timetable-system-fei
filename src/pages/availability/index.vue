<script setup lang="ts">
import { ref, computed, CSSProperties, onMounted, onUnmounted } from 'vue'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import TimetableGrid from '@/components/timetables/TimetableGrid.vue'
import { 
  DAYS, 
  DEFAULT_TIMETABLE_CONFIG, 
  DEFAULT_TIME_CONFIG, 
  generateTimeSlots, 
  getBaseTimetableStyles 
} from '@/utils/timetable'

// Availability level options
const availabilityLevels = [
  { id: 'clear', name: 'Clear', color: '#FFFFFF', value: 0 },
  { id: 'weak', name: 'Weak', color: '#FFCCCC', value: 1 },  // Light red
  { id: 'normal', name: 'Normal', color: '#FF8080', value: 2 },  // Normal red
  { id: 'strong', name: 'Strong', color: '#FF0000', value: 3 }   // Heavy red
]

// Interface for availability cell state
interface AvailabilityCell {
  day: string
  timeSlot: number
  level: number // 0: clear, 1: weak, 2: normal, 3: strong
}

const { toast } = useToast()
const isMouseDown = ref(false)
const isRightMouseDown = ref(false)  // Add tracking for right mouse button
const selectedLevel = ref(availabilityLevels[1]) // Default to weak
const availabilityCells = ref<AvailabilityCell[]>([])
const isResizing = ref(false)

// Generate time slots based on configuration
const timeSlots = generateTimeSlots(DEFAULT_TIME_CONFIG)
const timetableConfig = DEFAULT_TIMETABLE_CONFIG
const days = DAYS

// Get base styles for timetable
const { getHeaderStyle, getDayStyle, cornerCellStyle, containerStyle } = getBaseTimetableStyles(
  days,
  timeSlots,
  timetableConfig
)

// Calculate cell styles based on position and availability
const getCellStyle = (dayIndex: number, timeIndex: number): CSSProperties => {
  const cell = availabilityCells.value.find(
    cell => cell.day === days[dayIndex] && cell.timeSlot === timeIndex
  )
  
  const backgroundColor = cell 
    ? availabilityLevels.find(level => level.value === cell.level)?.color || '#FFFFFF' 
    : '#FFFFFF'

  return {
    position: 'absolute',
    left: `${timetableConfig.DAY_COLUMN_WIDTH + timetableConfig.CELL_WIDTH * timeIndex}px`,
    top: `${timetableConfig.HEADER_HEIGHT + timetableConfig.CELL_HEIGHT * dayIndex}px`,
    width: `${timetableConfig.CELL_WIDTH}px`,
    height: `${timetableConfig.CELL_HEIGHT}px`,
    borderRight: '1px solid #e0e0e0',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor,
    boxSizing: 'border-box',
    zIndex: 1,
    cursor: 'pointer',
    userSelect: 'none',
  }
}

// Handle cell interaction
function handleCellInteraction(dayIndex: number, timeIndex: number) {
  const day = days[dayIndex]
  const existingCellIndex = availabilityCells.value.findIndex(
    cell => cell.day === day && cell.timeSlot === timeIndex
  )
  
  if (existingCellIndex !== -1) {
    // Always update level, never toggle off
    availabilityCells.value[existingCellIndex]!.level = selectedLevel.value!.value
  } else if (selectedLevel.value?.value !== 0) {
    // Add new cell if not clearing
    availabilityCells.value.push({
      day: day!,
      timeSlot: timeIndex,
      level: selectedLevel.value!.value
    })
  }
}

function handleMouseDown(dayIndex: number, timeIndex: number, event: MouseEvent) {
  if (event && event.button === 2) {
    handleCellRightClick(dayIndex, timeIndex)
  } else {
    isMouseDown.value = true
    handleCellInteraction(dayIndex, timeIndex)
  }
}

function handleMouseOver(dayIndex: number, timeIndex: number, event: MouseEvent) {
  if (event && event.buttons === 2) {
    handleCellRightClick(dayIndex, timeIndex)
  } else if (isMouseDown.value) {
    handleCellInteraction(dayIndex, timeIndex)
  }
}

function handleMouseUp() {
  isMouseDown.value = false
}

function handleCellRightClick(dayIndex: number, timeIndex: number) {
  const day = days[dayIndex]
  const existingCellIndex = availabilityCells.value.findIndex(
    cell => cell.day === day && cell.timeSlot === timeIndex
  )
  
  if (existingCellIndex !== -1) {
    availabilityCells.value.splice(existingCellIndex, 1)
  }
}

function clearAllAvailability() {
  if (confirm("Are you sure you want to clear all availability markings?")) {
    availabilityCells.value = []
    toast({
      title: "Cleared",
      description: "All availability markings have been cleared."
    })
  }
}

function saveAvailability() {
  // Here you would send the availability data to your backend
  console.log("Saving availability data:", availabilityCells.value)
  toast({
    title: "Saved",
    description: "Your availability preferences have been saved."
  })
}
</script>

<template>
  <!-- Add the event listener directly in the template -->
  <div class="flex flex-col mx-auto p-6" @mouseup="handleMouseUp" @mouseleave="handleMouseUp">
    <h1 class="text-2xl font-bold mb-6">Professor Availability Marking</h1>
    
    <!-- Availability Level Selection Controls -->
    <div class="mb-6">
      <h2 class="text-lg font-semibold mb-2">Select Unavailability Level:</h2>
      <div class="flex gap-4 mb-4">
        <Button 
          v-for="level in availabilityLevels" 
          :key="level.id"
          :variant="selectedLevel?.id === level.id ? 'default' : 'outline'"
          class="flex items-center gap-2"
          :style="{ 
            backgroundColor: level.id !== 'clear' && selectedLevel?.id === level.id ? level.color : undefined,
            color: level.id !== 'clear' && selectedLevel?.id === level.id ? '#000' : undefined
          }"
          @click="selectedLevel = level"
        >
          <div 
            class="w-4 h-4 rounded border border-gray-300" 
            :style="{ 
              backgroundColor: level.color,
              borderColor: level.id === 'clear' ? '#e0e0e0' : 'rgba(0,0,0,0.2)'
            }"
          ></div>
          {{ level.name }}
        </Button>
      </div>

      <div class="flex justify-between mb-4">
        <div>
          <p class="text-sm text-gray-500">
            Click and drag to mark your unavailability. Use different colors to indicate the level of unavailability.
          </p>
        </div>
        <div class="space-x-2">
          <Button variant="outline" @click="clearAllAvailability">Clear All</Button>
          <Button @click="saveAvailability">Save Availability</Button>
        </div>
      </div>
    </div>
    
    <!-- Timetable Grid Component -->
    <div class="h-[calc(100vh-300px)] select-none">
      <TimetableGrid
        :days="days"
        :time-slots="timeSlots"
        :get-cell-style="getCellStyle"
        :get-header-style="getHeaderStyle"
        :get-day-style="getDayStyle"
        :corner-cell-style="cornerCellStyle"
        :container-style="containerStyle"
        :is-resizing="isResizing"
        @cell-mouse-down="handleMouseDown"
        @cell-mouse-over="handleMouseOver"
        @mouse-leave="isMouseDown = false"
      />
    </div>
  </div>
</template>
