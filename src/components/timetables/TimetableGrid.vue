<script setup lang="ts">
import { ref, computed, CSSProperties, PropType } from 'vue'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

interface TimeSlot {
  from: string
  to: string
  index: number
}

const props = defineProps({
  days: {
    type: Array as PropType<string[]>,
    required: true
  },
  timeSlots: {
    type: Array as PropType<TimeSlot[]>,
    required: true
  },
  getCellStyle: {
    type: Function as PropType<(dayIndex: number, timeIndex: number) => CSSProperties>,
    required: true
  },
  getHeaderStyle: {
    type: Function as PropType<(index: number) => CSSProperties>,
    required: true
  },
  getDayStyle: {
    type: Function as PropType<(index: number) => CSSProperties>,
    required: true
  },
  cornerCellStyle: {
    type: Object as PropType<CSSProperties>,
    required: true
  },
  containerStyle: {
    type: Object as PropType<CSSProperties>,
    required: true
  },
  isResizing: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'cellClick',
  'cellMouseOver',
  'cellMouseDown',
  'mouseLeave',
  'dragOver',
  'dragEnter',
  'dragLeave',
  'drop',
  'dragEnd',
  'cellContextMenu'  // Add new event for right-click
])

function handleCellClick(dayIndex: number, timeIndex: number) {
  emit('cellClick', dayIndex, timeIndex)
}

function handleMouseDown(event: MouseEvent, dayIndex: number, timeIndex: number) {
  emit('cellMouseDown', dayIndex, timeIndex, event)
}

function handleMouseOver(event: MouseEvent, dayIndex: number, timeIndex: number) {
  emit('cellMouseOver', dayIndex, timeIndex, event)
}

function handleMouseLeave() {
  emit('mouseLeave')
}

function handleDragOver(event: DragEvent) {
  emit('dragOver', event)
}

function handleDragEnter(event: DragEvent) {
  emit('dragEnter', event)
}

function handleDragLeave(event: DragEvent) {
  emit('dragLeave', event)
}

function handleDrop(event: DragEvent) {
  emit('drop', event)
}

function handleDragEnd(event: DragEvent) {
  emit('dragEnd', event)
}

function handleContextMenu(event: MouseEvent, dayIndex: number, timeIndex: number) {
  event.preventDefault();
  emit('cellContextMenu', dayIndex, timeIndex);
}
</script>

<template>
  <ScrollArea class="h-full">
    <div 
      :style="containerStyle" 
      class="bg-white rounded-lg shadow-md overflow-hidden mb-2"
      @mouseleave="handleMouseLeave"
      @dragover="handleDragOver"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @dragend="handleDragEnd"
    >
      <div :style="cornerCellStyle"></div>
      
      <!-- Time Headers -->
      <div 
        v-for="(time, index) in timeSlots" 
        :key="index" 
        :style="getHeaderStyle(index)"
        class="bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
      >
        {{ time.from }} - {{ time.to }}
      </div>

      <!-- Day Headers -->
      <div 
        v-for="(day, index) in days" 
        :key="day" 
        :style="getDayStyle(index)"
      >
        {{ day }}
      </div>

      <!-- Timetable Cells -->
      <div 
        v-for="(day, dayIndex) in days" 
        :key="`day-${day}`"
      >
        <div 
          v-for="(time, timeIndex) in timeSlots" 
          :key="`${day}-${time.index}`"
          :style="getCellStyle(dayIndex, timeIndex)"
          @click="handleCellClick(dayIndex, timeIndex)"
          @mousedown="(event) => handleMouseDown(event, dayIndex, timeIndex)"
          @mouseover="(event) => handleMouseOver(event, dayIndex, timeIndex)"
          @contextmenu="handleContextMenu($event, dayIndex, timeIndex)"
          class="cursor-pointer hover:opacity-80 transition-opacity"
        />
      </div>
      
      <!-- Slot for events and other content -->
      <slot></slot>
    </div>
    
    <ScrollBar orientation="horizontal" />
    <ScrollBar orientation="vertical" />
  </ScrollArea>
</template>
