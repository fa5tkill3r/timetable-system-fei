<script setup lang="ts">

import { ref, computed, CSSProperties, watch, onMounted } from 'vue'
import _ from 'lodash'
import { useRoute, useRouter } from 'vue-router'
import { useTimetableStore } from '@/store/timetables'
import { useTimetableEventStore } from '@/store/timetableEvents'
import { useSubjectStore } from '@/store/subjects'
import { useBuildingStore } from '@/store/buildings'
import { useTTEventTypeStore } from '@/store/ttEventTypes'
import { getColorFromString } from '@/lib/utils'
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
  Building,
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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast/use-toast'
import TimetableSwitcher from '@/components/timetables/TimetableSwitcher.vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from '@/components/ui/skeleton'

import ComboBox from '@/components/common/ComboBox.vue'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import RoomSelectionPanel from '@/components/timetables/RoomSelectionPanel.vue'
import { Room } from '@/types'


// Time system configuration
const TIME_CONFIG = {
  WINDOWS_COUNT: 9,           // Number of time slots in a day
  WINDOW_DURATION: 50,        // Duration of each slot in minutes
  BREAK_DURATION: 10,         // Duration of breaks between slots in minutes
  START_HOUR: 9,              // Starting hour (24-hour format)
  START_MINUTE: 0             // Starting minute
}

interface TimeSlot {
  from: string               // Display time (e.g., "9:00")
  to: string                 // Display time (e.g., "9:50")
  index: number              // 0-based index for the time slot
}

interface EventTemplate {
  id: string
  title: string
  duration: number
  color: string
  quantity: number
  subjectId?: number | null
  originalEventId?: number | null
  eventType?: number | null
}

interface CalendarEvent {
  id: number
  day: string
  startTime: string
  endTime: string
  startIndex?: number  // Add index reference
  title: string
  shortcut: string
  color: string
  roomId?: number | null
  roomName?: string | null
  subjectId?: number | null
  eventType?: number | null
}


const timetableStore = useTimetableStore()
const timetableEventStore = useTimetableEventStore()
const subjectStore = useSubjectStore()
const buildingStore = useBuildingStore()
const ttEventTypeStore = useTTEventTypeStore()
const { toast } = useToast()
const route = useRoute('/timetables/[id]/')
const router = useRouter()


const viewType = ref<string>('Parallels')
const subjectId = ref<number | null>(null)
const roomId = ref<number | null>(null)


const timetableId = computed(() => {
  return route.params.id ? parseInt(route.params.id as string) : null
})

const selectedTimetableName = ref<string>('')

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

// Generate time slots dynamically based on configuration
const timeSlots: TimeSlot[] = (() => {
  const slots: TimeSlot[] = []
  let currentHour = TIME_CONFIG.START_HOUR
  let currentMinute = TIME_CONFIG.START_MINUTE
  
  for (let i = 0; i < TIME_CONFIG.WINDOWS_COUNT; i++) {
    // Format start time
    const fromHour = currentHour.toString().padStart(2, '0')
    const fromMinute = currentMinute.toString().padStart(2, '0')
    const from = `${fromHour}:${fromMinute}`
    
    // Calculate end time
    let endHour = currentHour
    let endMinute = currentMinute + TIME_CONFIG.WINDOW_DURATION
    
    if (endMinute >= 60) {
      endHour += Math.floor(endMinute / 60)
      endMinute = endMinute % 60
    }
    
    const toHour = endHour.toString().padStart(2, '0')
    const toMinute = endMinute.toString().padStart(2, '0')
    const to = `${toHour}:${toMinute}`
    
    // Add to slots
    slots.push({ from, to, index: i })
    
    // Calculate next start time (after break)
    currentMinute += TIME_CONFIG.WINDOW_DURATION + TIME_CONFIG.BREAK_DURATION
    if (currentMinute >= 60) {
      currentHour += Math.floor(currentMinute / 60)
      currentMinute = currentMinute % 60
    }
  }
  
  return slots
})()


const isOverMenu = ref(false)
const searchQuery = ref('')


const events = ref<CalendarEvent[]>([])
const eventTemplates = ref<EventTemplate[]>([])

const isResizing = ref(false)

// Resize handler function
function resize(dragging: boolean) {
  isResizing.value = dragging
}

const roomOptions = computed(() => {
  return buildingStore.rooms.map(room => ({
    id: room.id,
    name: room.name
  }))
})
const preferredRoom = ref<number | null>(null)


function getSubjectCode(subjectId?: number | null): string | null {
  if (!subjectId) return null

  const subject = subjectStore.subjects.find(s => s.id === subjectId)
  return subject ? subject.code : null
}


function getEventTypeLabel(eventType: number | null): string {
  if (!eventType) return 'Other';
  
  const eventTypeObj = eventType ? ttEventTypeStore.getEventTypeById(eventType) : null;
  return eventTypeObj?.name || `Type ${eventType}`;
}

onMounted(async () => {
  await subjectStore.fetchSubjects()
  await buildingStore.fetchRooms()
  await ttEventTypeStore.fetchEventTypes()

  if (route.query.subject) {
    subjectId.value = parseInt(route.query.subject as string)
  }
  if (route.query.room) {
    roomId.value = parseInt(route.query.room as string)
  }

  loadTimetableData()
})


async function loadTimetableData() {
  try {
    await timetableStore.fetchTimetables()

    if (timetableId.value) {
      const timetable = await timetableStore.getTimetable(timetableId.value)
      if (timetable) {
        selectedTimetableName.value = timetable.name
        await fetchTimetableEvents(timetableId.value)
      } else {
        toast({
          title: "Timetable not found",
          description: "The requested timetable does not exist.",
          variant: "destructive"
        })
      }
    }
  } catch (error) {
    toast({
      title: "Error loading data",
      description: "Failed to load timetable. Please try again.",
      variant: "destructive"
    })
  }
}


async function fetchTimetableEvents(timetableId: number) {
  try {

    let queryParams: any = { timetable: timetableId }
    if (subjectId.value) {
      queryParams.subject = subjectId.value
    }
    if (roomId.value) {
      queryParams.room = roomId.value
    }

    await timetableEventStore.fetchEvents(timetableId)
    processTimetableEvents()
  } catch (error) {
    toast({
      title: "Error loading events",
      description: "Failed to load timetable events. Please try again.",
      variant: "destructive"
    })
  }
}

function processTimetableEvents() {
  events.value = []
  eventTemplates.value = []

  timetableEventStore.events.forEach(event => {
    const ttaData = event.tta as any
    const subjectId = ttaData?.subject
    const eventType = ttaData?.event_type

    const subjectName = getSubjectName(subjectId)
    const subjectCode = getSubjectCode(subjectId)

    if (event.start_time !== null &&
      event.day_of_week !== null &&
      event.room !== null &&
      event.weeks_bitmask !== null &&
      event.weeks_bitmask !== 0) {

      // Convert numeric time index to display time
      const timeIndex = Math.min(Math.max(event.start_time as number, 0), timeSlots.length - 1)
      const startTime = timeSlots[timeIndex].from
      const endTime = calculateEndTime(startTime, event.duration)

      const room = event.room as any as Room

      events.value.push({
        id: event.id,
        day: getDayName(event.day_of_week),
        startTime: startTime,
        endTime: endTime,
        startIndex: timeToIndex(startTime),
        title: subjectName!,
        shortcut: subjectCode!,
        color: getColorFromString(subjectName!),
        roomId: room.id,
        roomName: room.name,
        subjectId: subjectId,
        eventType: eventType
      })
    } else {

      const title = subjectName || event.subject_name || `Event ${event.id}`

      const existingTemplate = eventTemplates.value.find(t =>
        t.title === title &&
        t.duration === event.duration &&
        t.eventType === eventType
      )

      if (existingTemplate) {
        existingTemplate.quantity += 1
      } else {
        eventTemplates.value.push({
          id: `template-${event.id}`,
          title: title,
          duration: event.duration || 1,
          color: getColorFromString(title),
          quantity: 1,
          subjectId: subjectId,
          originalEventId: event.id,
          eventType: eventType
        })
      }
    }
  })
}


function getDayName(dayOfWeek: number): string {
  return days[dayOfWeek - 1] || 'Monday'
}

// Convert display time to index
function timeToIndex(time: string): number {
  const index = timeSlots.findIndex(slot => slot.from === time)
  return index >= 0 ? index : 0
}


function calculateEndTime(startTime: string, duration: number): string {

  const startIndex = timeToIndex(startTime)


  if (startIndex === -1) {
    console.warn(`Could not find time slot for: "${startTime}". Available slots:`,
      timeSlots.map(slot => slot.from))
    return startTime
  }


  const endIndex = startIndex + duration - 1
  if (endIndex >= timeSlots.length) return timeSlots[timeSlots.length - 1].to

  return timeSlots[endIndex].to
}


function getSubjectName(subjectId?: number | null): string | null {
  if (!subjectId) return null

  const subject = subjectStore.subjects.find(s => s.id === subjectId)
  return subject ? subject.name : null
}


const subjectOptions = computed(() => {
  return subjectStore.subjects.map(subject => ({
    id: subject.id,
    name: subject.name
  }))
})


watch([subjectId, roomId, viewType], async () => {
  if (timetableId.value) {
    const query = { ...route.query }

    if (subjectId.value) {
      query.subject = subjectId.value.toString()
    } else {
      delete query.subject
    }

    if (roomId.value) {
      query.room = roomId.value.toString()
    } else {
      delete query.room
    }

    router.replace({
      path: route.path,
      query
    })

    await fetchTimetableEvents(timetableId.value)
  }
})



const filteredEventTemplates = computed(() =>
  eventTemplates.value.filter((template) =>
    template.title.toLowerCase().includes(searchQuery.value.toLowerCase()) &&
    template.quantity > 0
  )
)

let nextEventId = 1


const CELL_HEIGHT = 60
const CELL_WIDTH = 120
const HEADER_HEIGHT = 40
const DAY_COLUMN_WIDTH = 100


const draggedEvent = ref<CalendarEvent | null>(null)
const draggedTemplate = ref<EventTemplate | null>(null)
const draggedOverDay = ref<string | null>(null)
const draggedOverTime = ref<TimeSlot | null>(null)


const getEventDuration = (event: CalendarEvent): number => {
  const startIndex = timeSlots.findIndex(
    (slot) => slot.from === event.startTime,
  )
  const endIndex = timeSlots.findIndex((slot) => slot.to === event.endTime)
  return endIndex - startIndex + 1
}

const getEventPositions = () => {
  // Group events by day
  const eventsByDay = _.groupBy(events.value, 'day')
  const eventPositions = new Map()

  Object.entries(eventsByDay).forEach(([day, dayEvents]) => {
    // Sort events by start time
    const sortedEvents = [...dayEvents].sort((a, b) => {
      const timeA = timeSlots.findIndex(slot => slot.from === a.startTime)
      const timeB = timeSlots.findIndex(slot => slot.from === b.startTime)
      return timeA - timeB
    })

    // Track occupied time slots for each row
    const rows: { endTime: string; event: CalendarEvent }[][] = []

    sortedEvents.forEach(event => {
      const startIndex = timeSlots.findIndex(slot => slot.from === event.startTime)

      // Find a row where this event can fit
      let rowIndex = 0
      let foundRow = false

      while (!foundRow) {
        if (!rows[rowIndex]) {
          rows[rowIndex] = []
          foundRow = true
        } else {
          // Check if any event in this row overlaps
          const overlaps = rows[rowIndex].some(occupiedSlot => {
            const occupiedEndIndex = timeSlots.findIndex(slot => slot.to === occupiedSlot.event.endTime)
            return startIndex <= occupiedEndIndex
          })

          if (!overlaps) {
            foundRow = true
          } else {
            rowIndex++
          }
        }
      }

      // Add event to the row
      rows[rowIndex].push({ endTime: event.endTime, event })
      eventPositions.set(event.id, { row: rowIndex, maxRows: 0 })
    })

    // Set maxRows for all events in this day
    const maxRows = rows.length
    sortedEvents.forEach(event => {
      const position = eventPositions.get(event.id)
      if (position) {
        position.maxRows = maxRows
      }
    })
  })

  return eventPositions
}


const getEventStyle = (event: CalendarEvent): CSSProperties => {
  const dayIndex = days.indexOf(event.day)
  const dayPositions = getDayRowPositions()

  const startIndex = timeSlots.findIndex(
    (slot) => slot.from === event.startTime,
  )
  const duration = getEventDuration(event)

  // Get position data for stacking
  const eventPositions = getEventPositions()
  const position = eventPositions.get(event.id)

  // Calculate row position if this event needs to be stacked
  const rowPosition = position ? position.row : 0
  const totalRows = position ? position.maxRows : 1

  // Keep consistent event height regardless of stacking
  const eventHeight = CELL_HEIGHT - 4

  // Calculate vertical position within the expanded cell
  // This spaces events evenly within the expanded cell
  const rowSpacing = totalRows > 1 ? (CELL_HEIGHT * totalRows - eventHeight * totalRows) / (totalRows + 1) : 0
  const topOffset = rowPosition * (eventHeight + rowSpacing)

  return {
    position: 'absolute',
    left: `${DAY_COLUMN_WIDTH + CELL_WIDTH * startIndex}px`,
    top: `${dayPositions[dayIndex] + topOffset}px`,
    width: `${CELL_WIDTH * duration - 4}px`,
    height: `${eventHeight}px`,
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
  const eventPositions = getEventPositions()
  const dayEvents = events.value.filter(e => e.day === days[dayIndex])
  const dayPositions = getDayRowPositions()

  const hasOverlappingEvents = dayEvents.some(e => {
    const position = eventPositions.get(e.id)
    return position && position.maxRows > 1
  })

  // Get max rows for this day if any
  let maxRows = 1
  if (hasOverlappingEvents) {
    const positions = Array.from(eventPositions.values())
      .filter((_, i) => dayEvents.some((e, j) => eventPositions.get(e.id)?.maxRows > 1))

    if (positions.length > 0) {
      maxRows = Math.max(...positions.map(p => p.maxRows))
    }
  }

  // Adjust cell height based on number of events
  const cellHeight = hasOverlappingEvents ? CELL_HEIGHT * maxRows : CELL_HEIGHT

  return {
    position: 'absolute',
    left: `${DAY_COLUMN_WIDTH + CELL_WIDTH * timeIndex}px`,
    top: `${dayPositions[dayIndex]}px`, // Use calculated position
    width: `${CELL_WIDTH}px`,
    height: `${cellHeight}px`,
    borderRight: '1px solid #e0e0e0',
    borderBottom: '1px solid #e0e0e0',
    boxSizing: 'border-box',
    zIndex: 1,
    backgroundColor: (() => {
      // Same highlighting logic as before
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

const getDayRowPositions = () => {
  const positions: number[] = Array(days.length).fill(0)
  const eventPositions = getEventPositions()

  let currentTop = HEADER_HEIGHT

  // Calculate position for each day based on expanded heights of previous days
  days.forEach((day, index) => {
    positions[index] = currentTop

    // Calculate height for this day based on max rows
    const dayEvents = events.value.filter(e => e.day === day)
    let maxRows = 1

    if (dayEvents.length > 0) {
      const dayPositions = dayEvents
        .map(e => eventPositions.get(e.id))
        .filter(Boolean) as { row: number, maxRows: number }[]

      if (dayPositions.length > 0) {
        maxRows = Math.max(...dayPositions.map(p => p.maxRows || 1))
      }
    }

    // Add this day's height to the running total
    currentTop += maxRows > 1 ? CELL_HEIGHT * maxRows : CELL_HEIGHT
  })

  return positions
}

const getDayStyle = (index: number): CSSProperties => {
  const eventPositions = getEventPositions()
  const dayEvents = events.value.filter(e => e.day === days[index])
  const dayPositions = getDayRowPositions()

  // Get max rows for this day if any
  let maxRows = 1
  if (dayEvents.length > 0) {
    const positions = dayEvents.map(e => eventPositions.get(e.id))
      .filter(Boolean) as { row: number, maxRows: number }[]

    if (positions.length > 0) {
      maxRows = Math.max(...positions.map(p => p.maxRows || 1))
    }
  }

  // Adjust day row height based on number of events
  const rowHeight = maxRows > 1 ? CELL_HEIGHT * maxRows : CELL_HEIGHT

  return {
    position: 'absolute',
    left: '0',
    top: `${dayPositions[index]}px`, // Use calculated position
    width: `${DAY_COLUMN_WIDTH}px`,
    height: `${rowHeight}px`,
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

const containerStyle = computed<CSSProperties>(() => {
  const dayPositions = getDayRowPositions()
  const eventPositions = getEventPositions()

  // Calculate total container height by finding the bottom position of the last day
  const lastDayIndex = days.length - 1
  let lastDayHeight = CELL_HEIGHT

  // Get max rows for last day
  const lastDayEvents = events.value.filter(e => e.day === days[lastDayIndex])
  if (lastDayEvents.length > 0) {
    const positions = lastDayEvents.map(e => eventPositions.get(e.id))
      .filter(Boolean) as { row: number, maxRows: number }[]

    if (positions.length > 0) {
      const maxRows = Math.max(...positions.map(p => p.maxRows || 1))
      lastDayHeight = maxRows > 1 ? CELL_HEIGHT * maxRows : CELL_HEIGHT
    }
  }

  // Total height is position of last day plus its height
  const totalHeight = dayPositions[lastDayIndex] + lastDayHeight

  return {
    position: 'relative',
    width: `${DAY_COLUMN_WIDTH + CELL_WIDTH * timeSlots.length}px`,
    height: `${totalHeight}px`,
    border: '1px solid #e0e0e0',
    borderBottom: 'none',
    borderRight: 'none',
    fontFamily: 'Arial, sans-serif',
  }
})


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

  // Use the day row positions to determine which day we're hovering over
  const dayPositions = getDayRowPositions()
  let dayIndex = -1;

  // Find which day row contains our current mouse position
  for (let i = 0; i < days.length; i++) {
    const nextDayIndex = i + 1;
    const currentDayTop = dayPositions[i];
    const nextDayTop = nextDayIndex < days.length ? dayPositions[nextDayIndex] : Infinity;

    if (y >= currentDayTop && y < nextDayTop) {
      dayIndex = i;
      break;
    }
  }

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

const handleMenuDrop = async (event: DragEvent) => {
  event.preventDefault()

  if (draggedEvent.value) {

    await toggleEventPlacement(draggedEvent.value)
  }

  draggedEvent.value = null
  isOverMenu.value = false
}

const isValidEventPlacement = (position: { day: string, time: TimeSlot }, duration: number): boolean => {
  if (!position) return false

  const timeIndex = timeSlots.findIndex(slot => slot.from === position.time.from)
  const newEndIndex = timeIndex + duration - 1

  return timeIndex >= 0 && newEndIndex < timeSlots.length
}

const handleDrop = async (event: DragEvent) => {
  event.preventDefault()

  const position = getMousePosition(event)
  if (!position || (!draggedEvent.value && !draggedTemplate.value)) return

  console.log("Preferred room selected:", preferredRoom.value)

  if (draggedTemplate.value && !preferredRoom.value) {
    toast({
      title: "Room Required",
      description: "Please select a preferred room before placing events.",
      variant: "destructive"
    })
    return
  }

  if (draggedTemplate.value) {
    const duration = draggedTemplate.value.duration || 1

    if (!isValidEventPlacement(position, duration)) {
      toast({
        title: "Invalid Placement",
        description: "Event cannot be placed in this position as it would exceed available time slots.",
        variant: "destructive"
      })
      draggedTemplate.value = null
      draggedOverDay.value = null
      draggedOverTime.value = null
      return
    }

    const newStartIndex = timeSlots.findIndex((slot) => slot.from === position.time.from)
    const newEndIndex = newStartIndex + duration - 1

    const eventToPlace = {
      id: draggedTemplate.value.originalEventId || -nextEventId++,
      day: position.day,
      startTime: timeSlots[newStartIndex].from,
      endTime: timeSlots[newEndIndex].to,
      title: draggedTemplate.value.title,
      color: draggedTemplate.value.color,
      subjectId: draggedTemplate.value.subjectId,
      eventType: draggedTemplate.value.eventType,
      shortcut: draggedTemplate.value.title.substring(0, 3).toUpperCase()
    }

    events.value.push(eventToPlace)

    const template = eventTemplates.value.find(
      (t) => t.id === draggedTemplate.value?.id,
    )
    if (template && template.quantity > 0) {
      template.quantity--
    }

    await saveEventPlacement(eventToPlace)

  } else if (draggedEvent.value) {
    const duration = getEventDuration(draggedEvent.value!)

    if (!isValidEventPlacement(position, duration)) {
      toast({
        title: "Invalid Placement",
        description: "Event cannot be placed in this position as it would exceed available time slots.",
        variant: "destructive"
      })
      draggedEvent.value = null
      draggedOverDay.value = null
      draggedOverTime.value = null
      return
    }

    const newStartIndex = timeSlots.findIndex(
      (slot) => slot.from === position.time.from,
    )
    const newEndIndex = newStartIndex + duration - 1

    const eventIndex = events.value.findIndex(
      (e) => e.id === draggedEvent.value!.id,
    )
    if (eventIndex !== -1) {
      const updatedEvent = {
        ...events.value[eventIndex],
        day: position.day,
        startTime: timeSlots[newStartIndex]?.from,
        endTime: timeSlots[newEndIndex]?.to,
      }
      events.value[eventIndex] = updatedEvent

      await saveEventPlacement(updatedEvent)
    }
  }

  draggedEvent.value = null
  draggedTemplate.value = null
  draggedOverDay.value = null
  draggedOverTime.value = null
}


async function saveEventPlacement(event: CalendarEvent) {
  if (!timetableId.value) {
    toast({
      title: "Error",
      description: "No timetable ID found. Please check the URL.",
      variant: "destructive"
    })
    return
  }

  if (draggedTemplate.value && !preferredRoom.value) {
    toast({
      title: "Room Required",
      description: "Please select a preferred room before placing events.",
      variant: "destructive"
    })
    return
  }

  try {
    const dayOfWeek = days.indexOf(event.day) + 1
    // Use the index of the time slot instead of the actual time
    const startTimeIndex = timeToIndex(event.startTime)

    const eventData = {
      day_of_week: dayOfWeek,
      start_time: startTimeIndex, // Send index instead of time string
      room: preferredRoom.value || event.roomId || null,
      weeks_bitmask: 4095,
    }

    console.log("Placing event with room:", preferredRoom.value)

    let result
    if (event.id && event.id > 0) {
      result = await timetableEventStore.updateEvent(event.id, eventData)
    } else {
      const fullEventData = {
        ...eventData,
        timetable: timetableId.value,
        tta: {
          subject: event.subjectId,
          event_type: event.eventType || 1
        },
        duration: getEventDuration(event),
      }
      result = await timetableEventStore.createEvent(fullEventData)
    }

    if (result) {
      toast({
        title: "Success",
        description: "Event has been placed in the timetable."
      })

      await fetchTimetableEvents(timetableId.value)
    }
  } catch (error) {
    console.error("Error saving event placement:", error)
    toast({
      title: "Error",
      description: "Failed to save event placement.",
      variant: "destructive"
    })
  }
}


async function toggleEventPlacement(event: CalendarEvent) {
  if (!timetableId.value || !event.id) return

  try {
    const currentEvent = timetableEventStore.events.find(e => e.id === event.id)
    if (!currentEvent) return

    const eventData = {
      timetable: timetableId.value,
      tta: {
        subject: event.subjectId || null,
        event_type: event.eventType || null
      },
      day_of_week: null,
      start_time: null,
      duration: getEventDuration(event),
      room: null,
      weeks_bitmask: 0,
    }

    const result = await timetableEventStore.updateEvent(event.id, eventData)
    if (result) {
      toast({
        title: "Success",
        description: "Event has been moved to unplaced events."
      })
      await fetchTimetableEvents(timetableId.value)
    }
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to update event placement.",
      variant: "destructive"
    })
  }
}


function handleDragEnd() {
  draggedEvent.value = null
  draggedTemplate.value = null
  draggedOverDay.value = null
  draggedOverTime.value = null
}
</script>

<template>
  <ResizablePanelGroup direction="horizontal" class="rounded-lg border h-[calc(100vh-180px)]">
    <ResizablePanel :default-size="75">
      <ResizablePanelGroup direction="vertical">
        <ResizablePanel :default-size="80">
          <div class="flex flex-col">
            <div class="flex items-center">
              <div class="flex flex-col gap-4 w-full">
                <div class="flex justify-center">
                  <div class="inline-flex gap-4 " role="group">
                    <Button variant="outline" size="sm"
                      :class="{ 'bg-primary text-primary-foreground': viewType === 'Parallels' }"
                      @click="viewType = 'Parallels'">
                      Parallels
                    </Button>
                    <Button variant="outline" size="sm"
                      :class="{ 'bg-primary text-primary-foreground': viewType === 'Rooms' }"
                      @click="viewType = 'Rooms'">
                      Rooms
                    </Button>
                    <Button variant="outline" size="sm"
                      :class="{ 'bg-primary text-primary-foreground': viewType === 'Teacher' }"
                      @click="viewType = 'Teacher'">
                      Teacher
                    </Button>
                    <Button variant="outline" size="sm"
                      :class="{ 'bg-primary text-primary-foreground': viewType === 'Student' }"
                      @click="viewType = 'Student'">
                      Student
                    </Button>
                  </div>
                </div>

                <div class="flex flex-wrap justify-center gap-3 items-center">


                  <div v-if="subjectId || roomId" class="flex gap-2 items-center">
                    <Badge variant="outline" v-if="subjectId">
                      Subject: {{ getSubjectName(subjectId) || subjectId }}
                      <Button variant="ghost" size="icon" class="h-4 w-4 ml-1" @click="subjectId = null">
                        <span class="sr-only">Remove</span>
                        &times;
                      </Button>
                    </Badge>
                    <Badge variant="outline" v-if="roomId">
                      Room ID: {{ roomId }}
                      <Button variant="ghost" size="icon" class="h-4 w-4 ml-1" @click="roomId = null">
                        <span class="sr-only">Remove</span>
                        &times;
                      </Button>
                    </Badge>
                  </div>
                </div>

                <div v-if="timetableId && timetableStore.selectedTimetable?.status"
                  class="flex justify-between pb-2 pr-3">
                  <div class="flex gap-2 items-end pl-10">
                    <Badge :variant="timetableStore.selectedTimetable?.status === 'PUBLISHED' ? 'default' :
                      timetableStore.selectedTimetable?.status === 'WIP' ? 'secondary' : 'destructive'
                      ">
                      {{ timetableStore.selectedTimetable?.status }}
                    </Badge>

                    <Badge variant="outline" v-if="timetableStore.selectedTimetable?.owner">
                      Owner: {{ timetableStore.selectedTimetable?.owner }}
                    </Badge>

                    <Badge variant="outline" v-if="timetableStore.selectedTimetable?.program">
                      Program: {{ timetableStore.selectedTimetable?.program }}
                    </Badge>
                  </div>
                  <!-- <div class="min-w-[150px]">
                    <ComboBox :options="roomOptions" title="Preferred Room"
                      search-placeholder="Select preferred room..." @update:selection="preferredRoom = $event" />
                  </div> -->
                </div>
              </div>
            </div>
          </div>

          <ScrollArea class="overflow-auto p-1">
            <div :style="containerStyle" @dragover="handleDragOver" @drop="handleDrop"
              class="bg-white rounded-lg shadow-md overflow-hidden mb-2 mx-auto">
              <div :style="cornerCellStyle"></div>

              <div v-for="(time, index) in timeSlots" :key="index" :style="getHeaderStyle(index)"
                class="bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                {{ time.from }} - {{ time.to }}
              </div>

              <div v-for="(day, index) in days" :key="day" :style="getDayStyle(index)">
                {{ day }}
              </div>

              <template v-if="isResizing">
                <!-- Replace the four separate skeletons with a single one covering the entire timetable -->
                <div class="absolute inset-0 z-10 overflow-hidden">
                  <Skeleton class="absolute w-full h-full" :style="{
                    width: `${DAY_COLUMN_WIDTH + CELL_WIDTH * timeSlots.length}px`,
                    height: containerStyle.height
                  }" />
                </div>
              </template>
              <div v-else v-for="(day, dayIndex) in days" :key="day">
                <div v-for="(time, timeIndex) in timeSlots" :key="`${day}-${time}`"
                  :style="getCellStyle(dayIndex, timeIndex)" />
              </div>

              <div v-if="!isResizing" v-for="event in events" :key="event.id" class="relative group">
                <ContextMenu>
                  <ContextMenuTrigger>
                    <div :style="getEventStyle(event)"
                      class="event rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1" draggable="true"
                      @dragstart="handleDragStart($event, event)" @dragend="handleDragEnd">
                      <div class="flex justify-between items-center">
                        <div class="event-title font-semibold text-gray-800 truncate">
                          {{ event.shortcut }}
                          <span class="sr-only">{{ event.title }}</span>
                        </div>
                        <MoreVertical
                          class="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                      <div class="flex justify-between text-sm text-gray-600">
                        <div>{{ event.startTime }} - {{ event.endTime }}</div>
                        <div v-if="event.roomName"
                          class="text-xs font-semibold bg-blue-100 rounded-sm px-1 border-primary inline-flex items-center">
                          <Building class="w-4 h-4" /> {{ event.roomName }}
                        </div>
                      </div>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent class="w-64">
                    <ContextMenuLabel>{{ event.title }}</ContextMenuLabel>
                    <ContextMenuItem @click="editEvent(event)">Edit</ContextMenuItem>
                    <ContextMenuItem @click="deleteCalendarEvent(event)">Delete</ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem @click="duplicateEvent(event)">Duplicate</ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              </div>
            </div>

            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </ResizablePanel>

        <ResizableHandle @dragging="resize($event)" with-handle />

        <ResizablePanel :default-size="20">

          <!-- Room selection panel -->
          <RoomSelectionPanel v-model:selectedRoomId="preferredRoom" />
        </ResizablePanel>
      </ResizablePanelGroup>
    </ResizablePanel>

    <ResizableHandle @dragging="resize($event)" with-handle />

    <ResizablePanel :default-size="25">
      <!-- Event selection panel -->
      <div class="h-full bg-white p-4" :class="{ 'bg-gray-50': isOverMenu }" @dragover="handleMenuDragOver"
        @dragleave="handleMenuDragLeave" @drop="handleMenuDrop">

        <Tabs default-value="events" class="h-full">
          <TabsList class="w-full">
            <TabsTrigger value="events" class="w-full">Unplaced Events</TabsTrigger>
            <TabsTrigger value="requirements" class="w-full">Requirements</TabsTrigger>
          </TabsList>

          <TabsContent value="events" class="h-[calc(100%-40px)] overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold">Unplaced Events</h3>
              <Badge>{{ filteredEventTemplates.length }}</Badge>
            </div>

            <Input v-model="searchQuery" type="text" class="mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Search events..." />

            <div class="space-y-3">
              <div v-for="template in filteredEventTemplates" :key="template.id" v-show="template.quantity > 0"
                class="p-3 rounded-lg cursor-move relative group" :style="{ backgroundColor: template.color }"
                draggable="true" @dragstart="handleDragStart($event, template, true)" @dragend="handleDragEnd">
                <div class="font-medium">{{ template.title }}</div>
                <div class="flex justify-between items-center text-sm text-gray-600">
                  <span>{{ getEventTypeLabel(template.eventType) }}</span>
                  <span>Duration: {{ template.duration }}h</span>
                </div>
                <div class="text-sm text-gray-600 mt-1">
                  <span class="ml-auto">Remaining: {{ template.quantity }}</span>
                </div>
                <div v-if="template.originalEventId" class="text-xs text-gray-500 mt-1">
                  ID: {{ template.originalEventId }}
                </div>
              </div>
            </div>

            <div v-if="filteredEventTemplates.length === 0" class="text-center py-8 text-muted-foreground">
              No unplaced events found.
            </div>

            <div v-if="eventTemplates.length === 0 && !timetableEventStore.isLoading"
              class="mb-4 text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
              No unplaced events found. Check if events exist in the timetable.
            </div>

            <div v-if="timetableEventStore.isLoading" class="flex justify-center py-4">
              <div class="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>

            <div v-if="isOverMenu"
              class="absolute inset-0 border-2 border-dashed border-blue-500 bg-blue-50 bg-opacity-50 rounded pointer-events-none flex items-center justify-center">
              <div class="flex items-center text-blue-600">
                <Trash2 class="w-5 h-5 mr-2" />
                <span>Drop to remove event</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="requirements">
            <div class="space-y-4 pt-2">
              <h3 class="text-lg font-semibold">Timetable Requirements</h3>
              <div class="text-sm text-muted-foreground">
                Configure additional constraints and requirements for this timetable.
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ResizablePanel>
  </ResizablePanelGroup>
</template>