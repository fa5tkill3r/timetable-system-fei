<script setup lang="ts">
  import { ref, computed, CSSProperties } from 'vue'
  import _ from 'lodash'
  import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
  } from '@/components/ui/tabs'
  import {
    ChevronLeft,
    ChevronRight,
    Trash2,
    MoreVertical,
  } from 'lucide-vue-next'
  import {
    ContextMenu,
    ContextMenuCheckboxItem,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuRadioGroup,
    ContextMenuRadioItem,
    ContextMenuSeparator,
    ContextMenuShortcut,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
  } from '@/components/ui/context-menu'
  import { Input } from '@/components/ui/input'

  // Types
  interface TimeSlot {
    from: string
    to: string
  }

  interface EventTemplate {
    id: string
    title: string
    duration: number
    color: string
    quantity: number
  }

  interface CalendarEvent {
    id: number
    day: string
    startTime: string
    endTime: string
    title: string
    color: string
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const timeSlots: TimeSlot[] = [
    { from: '9:00', to: '9:50' },
    { from: '10:00', to: '10:50' },
    { from: '11:00', to: '11:50' },
    { from: '12:00', to: '12:50' },
    { from: '13:00', to: '13:50' },
    { from: '14:00', to: '14:50' },
    { from: '15:00', to: '15:50' },
    { from: '16:00', to: '16:50' },
    { from: '17:00', to: '17:50' },
  ]

  // Refs and Computed
  const isMenuOpen = ref(true)
  const isOverMenu = ref(false)

  const events = ref<CalendarEvent[]>([])
  const searchQuery = ref('')
  const eventTemplates = ref<EventTemplate[]>([
    {
      id: 'template-1',
      title: 'I-PROG',
      duration: 1,
      color: '#e3f2fd',
      quantity: 1,
    },
    {
      id: 'template-2',
      title: 'I-DP1-AI',
      duration: 2,
      color: '#f3e5f5',
      quantity: 1,
    },
    {
      id: 'template-3',
      title: 'I-ASOS',
      duration: 3,
      color: '#e8f5e9',
      quantity: 1,
    },
  ])

  const filteredEventTemplates = computed(() =>
    eventTemplates.value.filter((template) =>
      template.title.toLowerCase().includes(searchQuery.value.toLowerCase()),
    ),
  )

  let nextEventId = 1

  // Layout Constants
  const CELL_HEIGHT = 60
  const CELL_WIDTH = 120
  const HEADER_HEIGHT = 40
  const DAY_COLUMN_WIDTH = 100

  // Drag and drop state
  const draggedEvent = ref<CalendarEvent | null>(null)
  const draggedTemplate = ref<EventTemplate | null>(null)
  const draggedOverDay = ref<string | null>(null)
  const draggedOverTime = ref<TimeSlot | null>(null)

  // Helper Functions
  const getTimeFromPosition = (x: number): TimeSlot | null => {
    const timeIndex = Math.floor((x - DAY_COLUMN_WIDTH) / CELL_WIDTH)
    return timeIndex >= 0 && timeIndex < timeSlots.length
      ? timeSlots[timeIndex]
      : null
  }

  const getDayFromPosition = (y: number): string | null => {
    const dayIndex = Math.floor((y - HEADER_HEIGHT) / CELL_HEIGHT)
    return dayIndex >= 0 && dayIndex < days.length ? days[dayIndex] : null
  }

  const getEventDuration = (event: CalendarEvent): number => {
    const startIndex = timeSlots.findIndex(
      (slot) => slot.from === event.startTime,
    )
    const endIndex = timeSlots.findIndex((slot) => slot.to === event.endTime)
    return endIndex - startIndex + 1
  }

  // Style computation functions
  const getEventStyle = (event: CalendarEvent): CSSProperties => {
    const dayIndex = days.indexOf(event.day)
    const startIndex = timeSlots.findIndex(
      (slot) => slot.from === event.startTime,
    )
    const duration = getEventDuration(event)

    return {
      position: 'absolute',
      left: `${DAY_COLUMN_WIDTH + CELL_WIDTH * startIndex}px`,
      top: `${HEADER_HEIGHT + CELL_HEIGHT * dayIndex}px`,
      width: `${CELL_WIDTH * duration - 4}px`,
      height: `${CELL_HEIGHT - 4}px`,
      backgroundColor: event.color,
      borderRadius: '4px',
      padding: '8px',
      boxSizing: 'border-box',
      overflow: 'hidden',
      zIndex: 2,
      cursor: 'move',
    }
  }

  const getCellStyle = (dayIndex: number, timeIndex: number): CSSProperties => {
    return {
      position: 'absolute',
      left: `${DAY_COLUMN_WIDTH + CELL_WIDTH * timeIndex}px`,
      top: `${HEADER_HEIGHT + CELL_HEIGHT * dayIndex}px`,
      width: `${CELL_WIDTH}px`,
      height: `${CELL_HEIGHT}px`,
      borderRight: '1px solid #e0e0e0',
      borderBottom: '1px solid #e0e0e0',
      boxSizing: 'border-box',
      zIndex: 1,
      backgroundColor: (() => {
        if (!draggedEvent.value && !draggedTemplate.value) return 'transparent'

        const duration = draggedEvent.value
          ? timeSlots.findIndex(
            (slot) => slot.to === draggedEvent.value?.endTime,
          ) -
          timeSlots.findIndex(
            (slot) => slot.from === draggedEvent.value?.startTime,
          ) +
          1
          : draggedTemplate.value?.duration || 0

        if (
          draggedOverDay.value === days[dayIndex] &&
          _.isEqual(draggedOverTime.value, timeSlots[timeIndex]) &&
          timeIndex + duration <= timeSlots.length
        ) {
          return '#e3f2fd'
        }

        if (
          draggedOverDay.value === days[dayIndex] &&
          _.isEqual(draggedOverTime.value, timeSlots[timeIndex])
        ) {
          return '#fb0101'
        }

        return 'transparent'
      })(),
    }
  }

  const getHeaderStyle = (index: number): CSSProperties => {
    return {
      position: 'absolute',
      left: `${DAY_COLUMN_WIDTH + CELL_WIDTH * index}px`,
      top: '0',
      width: `${CELL_WIDTH}px`,
      height: `${HEADER_HEIGHT}px`,
      borderRight: '1px solid #e0e0e0',
      borderBottom: '1px solid #e0e0e0',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      boxSizing: 'border-box',
    }
  }

  const getDayStyle = (index: number): CSSProperties => {
    return {
      position: 'absolute',
      left: '0',
      top: `${HEADER_HEIGHT + CELL_HEIGHT * index}px`,
      width: `${DAY_COLUMN_WIDTH}px`,
      height: `${CELL_HEIGHT}px`,
      borderRight: '1px solid #e0e0e0',
      borderBottom: '1px solid #e0e0e0',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      alignItems: 'center',
      padding: '0 10px',
      boxSizing: 'border-box',
      fontWeight: 'bold',
    }
  }

  const cornerCellStyle: CSSProperties = {
    position: 'absolute',
    left: '0',
    top: '0',
    width: `${DAY_COLUMN_WIDTH}px`,
    height: `${HEADER_HEIGHT}px`,
    borderRight: '1px solid #e0e0e0',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#f5f5f5',
    boxSizing: 'border-box',
  }

  const containerStyle = computed<CSSProperties>(() => ({
    position: 'relative',
    width: `${DAY_COLUMN_WIDTH + CELL_WIDTH * timeSlots.length}px`,
    height: `${HEADER_HEIGHT + CELL_HEIGHT * days.length}px`,
    border: '1px solid #e0e0e0',
    borderBottom: 'none',
    borderRight: 'none',
    fontFamily: 'Arial, sans-serif',
  }))

  // Enhanced drag and drop handlers
  const handleDragStart = (
    event: DragEvent,
    eventData: CalendarEvent | EventTemplate,
    isTemplate = false,
  ) => {
    if (isTemplate) {
      draggedTemplate.value = eventData as EventTemplate
    } else {
      draggedEvent.value = eventData as CalendarEvent
    }
    event.dataTransfer!.effectAllowed = 'move'
  }

  const getMousePosition = (
    event: DragEvent,
  ): { day: string; time: TimeSlot } | null => {
    const rect = (event.currentTarget as HTMLElement)?.getBoundingClientRect()
    if (!rect) return null

    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    const dayIndex = Math.floor((y - HEADER_HEIGHT) / CELL_HEIGHT)
    const timeIndex = Math.floor((x - DAY_COLUMN_WIDTH) / CELL_WIDTH)

    if (
      dayIndex >= 0 &&
      dayIndex < days.length &&
      timeIndex >= 0 &&
      timeIndex < timeSlots.length
    ) {
      return {
        day: days[dayIndex],
        time: timeSlots[timeIndex],
      }
    }
    return null
  }

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault()
    const position = getMousePosition(event)
    if (position) {
      draggedOverDay.value = position.day
      draggedOverTime.value = position.time
    }
  }

  const handleMenuDragOver = (event: DragEvent) => {
    event.preventDefault()
    isOverMenu.value = true
  }

  const handleMenuDragLeave = () => {
    isOverMenu.value = false
  }

  const handleMenuDrop = (event: DragEvent) => {
    event.preventDefault()

    if (draggedEvent.value) {
      const eventIndex = events.value.findIndex(
        (e) => e.id === draggedEvent.value?.id,
      )
      if (eventIndex !== -1) {
        const template = eventTemplates.value.find(
          (t) =>
            t.title === draggedEvent.value?.title &&
            t.color === draggedEvent.value?.color &&
            t.duration === getEventDuration(draggedEvent.value!),
        )

        if (template) {
          template.quantity++
        }

        events.value.splice(eventIndex, 1)
      }
    }

    draggedEvent.value = null
    isOverMenu.value = false
  }

  const handleDrop = (event: DragEvent) => {
    event.preventDefault()

    const position = getMousePosition(event)
    if (!position || (!draggedEvent.value && !draggedTemplate.value)) return

    if (draggedTemplate.value) {
      const newStartIndex = timeSlots.findIndex(
        (slot) => slot.from === position.time.from,
      )
      const newEndIndex = newStartIndex + draggedTemplate.value.duration - 1

      if (newEndIndex <= timeSlots.length) {
        const newEvent: CalendarEvent = {
          id: nextEventId++,
          day: position.day,
          startTime: timeSlots[newStartIndex].from,
          endTime: timeSlots[newEndIndex].to,
          title: draggedTemplate.value.title,
          color: draggedTemplate.value.color,
        }
        events.value.push(newEvent)

        const template = eventTemplates.value.find(
          (t) => t.id === draggedTemplate.value?.id,
        )
        if (template && template.quantity > 0) {
          template.quantity--
        }
      }
    } else {
      const duration = getEventDuration(draggedEvent.value!)
      const newStartIndex = timeSlots.findIndex(
        (slot) => slot.from === position.time.from,
      )
      const newEndIndex = newStartIndex + duration - 1

      if (newEndIndex <= timeSlots.length) {
        const eventIndex = events.value.findIndex(
          (e) => e.id === draggedEvent.value!.id,
        )
        if (eventIndex !== -1) {
          const updatedEvent = {
            ...events.value[eventIndex],
            day: position.day,
            startTime: timeSlots[newStartIndex].from,
            endTime: timeSlots[newEndIndex].to,
          }
          events.value[eventIndex] = updatedEvent
        }
      }
    }

    draggedEvent.value = null
    draggedTemplate.value = null
    draggedOverDay.value = null
    draggedOverTime.value = null
  }

  const toggleMenu = () => {
    isMenuOpen.value = !isMenuOpen.value
  }

  const handleDragEnd = () => {
    draggedEvent.value = null
    draggedTemplate.value = null
    isOverMenu.value = false
  }
</script>

<template>
  <div class="min-h-screen flex justify-center items-start pt-10">
    <div class="flex">
      <!-- Scrollable Container -->
      <div
        class="overflow-auto max-w-[calc(100vw-theme(space.10))] p-1"
        :class="{ 'max-w-[calc(100vw-theme(space.8)-theme(space.10))]': isMenuOpen }"
      >
        <!-- Calendar Container -->
        <div
          :style="containerStyle"
          @dragover="handleDragOver"
          @drop="handleDrop"
          class="flex-shrink-0 bg-white rounded-lg shadow-md overflow-hidden mb-2"
          :class="{ 'mr-80': isMenuOpen }"
        >
          <div :style="cornerCellStyle"></div>

          <!-- Time slots header -->
          <div
            v-for="(time, index) in timeSlots"
            :key="index"
            :style="getHeaderStyle(index)"
            class="bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            {{ time.from }} - {{ time.to }}
          </div>

          <!-- Days column -->
          <div v-for="(day, index) in days" :key="day" :style="getDayStyle(index)">
            {{ day }}
          </div>

          <!-- Grid cells -->
          <div v-for="(day, dayIndex) in days" :key="day">
            <div
              v-for="(time, timeIndex) in timeSlots"
              :key="`${day}-${time}`"
              :style="getCellStyle(dayIndex, timeIndex)"
            />
          </div>

          <!-- Events -->
          <div v-for="event in events" :key="event.id" class="relative group">
            <ContextMenu>
              <ContextMenuTrigger>
                <div
                  :style="getEventStyle(event)"
                  class="event rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1"
                  draggable="true"
                  @dragstart="handleDragStart($event, event)"
                  @dragend="handleDragEnd"
                >
                  <div class="flex justify-between items-center">
                    <div class="event-title font-semibold text-gray-800">
                      {{ event.title }}
                    </div>
                    <MoreVertical
                      class="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                  <div class="event-time text-sm text-gray-600">
                    {{ event.startTime }} - {{ event.endTime }}
                  </div>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent class="w-64">
                <ContextMenuLabel>{{ event.title }} options</ContextMenuLabel>
                <ContextMenuItem @click="editEvent(event)">Edit</ContextMenuItem>
                <ContextMenuItem @click="deleteEvent(event)"
                >Delete
                </ContextMenuItem
                >
                <ContextMenuSeparator />
                <ContextMenuItem @click="duplicateEvent(event)"
                >Duplicate
                </ContextMenuItem
                >
              </ContextMenuContent>
            </ContextMenu>
          </div>
        </div>

        <!-- Event Templates Menu -->
        <!--    <div class="fixed top-10 right-20 h-full flex items-center">-->
        <!--      <button-->
        <!--        @click="toggleMenu"-->
        <!--        class="absolute -left-6 top-2 bg-white border border-gray-200 rounded-l p-1 hover:bg-gray-50"-->
        <!--      >-->
        <!--        <ChevronLeft v-if="isMenuOpen" class="w-4 h-4" />-->
        <!--        <ChevronRight v-else class="w-4 h-4" />-->
        <!--      </button>-->
        <!--    </div>-->

        <div
          v-if="isMenuOpen"
          class="bg-white border-l border-t border-b border-gray-200 p-4 fixed top-0 right-0 max-w-full w-80 h-full z-10"
          :class="{ 'bg-gray-50': isOverMenu }"
          @dragover="handleMenuDragOver"
          @dragleave="handleMenuDragLeave"
          @drop="handleMenuDrop"
        >
          <Tabs default-value="events">
            <TabsList class="w-full">
              <TabsTrigger value="events" class="w-full"> Events</TabsTrigger>
              <TabsTrigger value="requirements" class="w-full">
                Requirements
              </TabsTrigger>
            </TabsList>
            <TabsContent value="events">
              <h3 class="text-lg font-semibold mb-4">Events</h3>

              <!-- Search input -->
              <Input
                v-model="searchQuery"
                type="text"
                class="p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Search events..."
              />

              <!-- Event templates list -->
              <div class="space-y-3">
                <div
                  v-for="template in filteredEventTemplates"
                  :key="template.id"
                  v-show="template.quantity > 0"
                  class="p-3 rounded-lg cursor-move relative group"
                  :style="{ backgroundColor: template.color }"
                  draggable="true"
                  @dragstart="handleDragStart($event, template, true)"
                  @dragend="handleDragEnd"
                >
                  <div class="font-medium">{{ template.title }}</div>
                  <div class="text-sm text-gray-600">
                    Duration: {{ template.duration }} hour(s)
                    <span class="ml-2">Remaining: {{ template.quantity }}</span>
                  </div>
                </div>
              </div>

              <!-- Modified overlay to prevent pointer events interference -->
              <div
                v-if="isOverMenu"
                class="absolute inset-0 border-2 border-dashed border-blue-500 bg-blue-50 bg-opacity-50 rounded pointer-events-none flex items-center justify-center"
              >
                <div class="flex items-center text-blue-600">
                  <Trash2 class="w-5 h-5 mr-2" />
                  <span>Drop to remove event</span>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="requirements"> TODO: Add requirements</TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  </div>
</template>
