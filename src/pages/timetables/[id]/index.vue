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
import { useToast } from '@/components/ui/toast'
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
import EventSelectionPanel from '@/components/timetables/EventSelectionPanel.vue'
import { Room } from '@/types'
import { useSubjectGroupStore } from '@/store/subjectGroups'
import { components } from 'schema'

interface TimeSlot {
  from: string
  to: string
  index: number
}

export interface CalendarEvent {
  id: number
  day: string | null
  start_time: string | null
  end_time: string | null
  start_index?: number
  title: string
  shortcut: string
  color: string
  room_id?: number | null
  room_name?: string | null
  subject_id?: number | null
  event_type?: number | null
  duration?: number
  original_eventId?: number | null
}

// STATIC CONFIGURATION
const TIME_CONFIG = {
  SLOT_COUNT: 12,
  SLOT_DURATION: 50,
  BREAK_DURATION: 10,
  START_HOUR: 8,
  START_MINUTE: 0
}

const TIMETABLE_CONFIG = {
  CELL_WIDTH: 120,
  CELL_HEIGHT: 60,
  HEADER_HEIGHT: 40,
  DAY_COLUMN_WIDTH: 100
}

const semesterOptions = [
  { id: 'LS', name: 'Summer Semester (LS)' },
  { id: 'ZS', name: 'Winter Semester (ZS)' }
]
const yearOptions = [
  { id: '1bc', name: '1. Bachelor' },
  { id: '2bc', name: '2. Bachelor' },
  { id: '3bc', name: '3. Bachelor' },
  { id: '1i', name: '1. Master' },
  { id: '2i', name: '2. Master' }
]

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']



const timetableStore = useTimetableStore()
const timetableEventStore = useTimetableEventStore()
const subjectStore = useSubjectStore()
const buildingStore = useBuildingStore()
const ttEventTypeStore = useTTEventTypeStore()
const subjectGroupStore = useSubjectGroupStore()

const { toast } = useToast()
const route = useRoute('/timetables/[id]/')
const router = useRouter()

const selectedSemester = ref<string>('LS')
const selectedYear = ref<string>('1bc')
const selectedSubjectGroup = ref<string | null>(null)
const viewType = ref<string>('parallels')
const subjectId = ref<number | null>(null)
const roomId = ref<number | null>(null)
const selectedTimetableName = ref<string>('')
const isOverMenu = ref(false)
const events = ref<CalendarEvent[]>([])
const eventTemplates = ref<CalendarEvent[]>([])
const isResizing = ref(false)
const preferredRoom = ref<number | undefined>(undefined)
const overrideRooms = ref<boolean>(false)
const draggedEvent = ref<CalendarEvent | null>(null)
const draggedTemplate = ref<CalendarEvent | null>(null)
const draggedOverDay = ref<string | null>(null)
const draggedOverTime = ref<TimeSlot | null>(null)


const timetableId = computed(() => {
  return route.params.id ? parseInt(route.params.id as string) : null
})


const timeSlots: TimeSlot[] = (() => {
  const slots: TimeSlot[] = []
  let currentHour = TIME_CONFIG.START_HOUR
  let currentMinute = TIME_CONFIG.START_MINUTE

  for (let i = 0; i < TIME_CONFIG.SLOT_COUNT; i++) {
    const fromHour = currentHour.toString().padStart(2, '0')
    const fromMinute = currentMinute.toString().padStart(2, '0')
    const from = `${fromHour}:${fromMinute}`

    let endHour = currentHour
    let endMinute = currentMinute + TIME_CONFIG.SLOT_DURATION

    if (endMinute >= 60) {
      endHour += Math.floor(endMinute / 60)
      endMinute = endMinute % 60
    }

    const toHour = endHour.toString().padStart(2, '0')
    const toMinute = endMinute.toString().padStart(2, '0')
    const to = `${toHour}:${toMinute}`

    slots.push({ from, to, index: i })

    currentMinute += TIME_CONFIG.SLOT_DURATION + TIME_CONFIG.BREAK_DURATION
    if (currentMinute >= 60) {
      currentHour += Math.floor(currentMinute / 60)
      currentMinute = currentMinute % 60
    }
  }

  return slots
})()



function getSubjectCode(subjectId?: number | null): string | null {
  if (!subjectId) return null

  const subject = subjectStore.subjects.find(s => s.id === subjectId)
  return subject ? subject.code : null
}

const nominalSemester = computed(() => {
  const isSummer = selectedSemester.value === 'LS'

  if (selectedYear.value === '1bc') return isSummer ? 2 : 1
  if (selectedYear.value === '2bc') return isSummer ? 4 : 3
  if (selectedYear.value === '3bc') return isSummer ? 6 : 5
  if (selectedYear.value === '1i') return isSummer ? 2 : 1
  if (selectedYear.value === '2i') return isSummer ? 4 : 3

  return null
})

const isBachelorSubject = (code: string | null) => {
  if (!code) return true
  return code.startsWith('B-') || !code.startsWith('I-')
}

const isMasterSubject = (code: string | null) => {
  if (!code) return true
  return code.startsWith('I-') || !code.startsWith('B-')
}

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
      const timeIndex = Math.min(event.start_time!, timeSlots.length - 1)
      const startTime = timeSlots[timeIndex]!.from
      const endTime = calculateEndTime(startTime, event.duration!)

      const room = event.room as any as Room

      const brightnessAdjustment = eventType === 1 ? 0.9 : 1.1

      events.value.push({
        id: event.id!,
        day: days[event.day_of_week! - 1]!,
        start_time: startTime,
        end_time: endTime,
        start_index: timeToIndex(startTime),
        title: subjectName!,
        shortcut: subjectCode!,
        color: getColorFromString(subjectName!, 'pastel', brightnessAdjustment),
        room_id: room.id,
        room_name: room.name,
        subject_id: subjectId,
        event_type: eventType
      })
    } else {
      const brightnessAdjustment = eventType === 1 ? 0.9 : 1.1

        eventTemplates.value.push({
          id: event.id!,
          day: null,
          start_time: null,
          end_time: null,
          title: subjectName!,
          shortcut: subjectCode || '',
          color: getColorFromString(subjectName!, 'pastel', brightnessAdjustment),
          duration: event.duration || 1,
          subject_id: subjectId,
          original_eventId: event.id,
          event_type: eventType
        })
    }
  })
}

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
  if (endIndex >= timeSlots.length) return timeSlots[timeSlots.length - 1]!.to

  return timeSlots[endIndex]!.to
}

function getSubjectName(subjectId?: number | null): string | null {
  if (!subjectId) return null

  const subject = subjectStore.subjects.find(s => s.id === subjectId)
  return subject ? subject.name : null
}

const isSubjectInGroup = (subjectId: number | null, groupName: string | null): boolean => {
  if (!subjectId || !groupName) return true

  const matchingGroups = subjectGroupStore.subjectGroups.filter(group => group.subject === subjectId)

  return matchingGroups.some(group => group.name === groupName)
}

const applyParallelsFilter = (item: CalendarEvent) => {
  if (!item.subject_id) return false

  const subject = subjectStore.subjects.find(s => s.id === item.subject_id)
  if (!subject) return false

  const subjectCode = subject.code || null

  const isBachelor = selectedYear.value.includes('bc')
  const isCorrectLevel = isBachelor
    ? isBachelorSubject(subjectCode)
    : isMasterSubject(subjectCode)

  const isCorrectSemester = subject.nominal_semester === nominalSemester.value

  const isInSelectedGroup = !selectedSubjectGroup.value ||
    isSubjectInGroup(item.subject_id, selectedSubjectGroup.value)

  return isCorrectLevel && isCorrectSemester && isInSelectedGroup
}

const filteredEvents = computed(() => {
  if (viewType.value === 'parallels') {
    return events.value.filter(applyParallelsFilter)
  } else if (viewType.value === 'rooms') {
    if (!preferredRoom.value) {
      return []
    }
    return events.value.filter(event => event.room_id === preferredRoom.value)
  }

  return events.value
})

// Update filteredEventTemplates to use the same filter approach
const filteredEventTemplates = computed(() => {
  // Show only events with quantity > 0
  const templates = eventTemplates.value
  // Only apply additional filtering in parallels view
  if (viewType.value === 'parallels') {
    return templates.filter(applyParallelsFilter)
  }

  // For rooms view and other views, show all unplaced events
  return templates
})



let nextEventId = 1

const getEventDuration = (event: CalendarEvent): number => {
  // For template events with no start/end time
  if (!event.start_time || !event.end_time) {
    return event.duration || 1
  }

  const startIndex = timeSlots.findIndex(
    (slot) => slot.from === event.start_time,
  )
  const endIndex = timeSlots.findIndex((slot) => slot.to === event.end_time)
  return endIndex - startIndex + 1
}

const getRowEventPositions = () => {
  const eventsByDay = _.groupBy(filteredEvents.value, 'day')
  const eventPositions = new Map()

  Object.entries(eventsByDay).forEach(([, dayEvents]) => {
    const sortedEvents = [...dayEvents].sort((a, b) => 
      timeToIndex(a.start_time!) - timeToIndex(b.start_time!)
    )

    const rows: { end_time: string; event: CalendarEvent }[][] = []

    sortedEvents.forEach(event => {
      const startIndex = timeSlots.findIndex(slot => slot.from === event.start_time)

      let rowIndex = 0
      let foundRow = false

      while (!foundRow) {
        if (!rows[rowIndex]) {
          rows[rowIndex] = []
          foundRow = true
        } else {
          const overlaps = rows[rowIndex]?.some(occupiedSlot => {
            const occupiedEndIndex = timeSlots.findIndex(slot => slot.to === occupiedSlot.event.end_time)
            return startIndex <= occupiedEndIndex
          })

          if (!overlaps) {
            foundRow = true
          } else {
            rowIndex++
          }
        }
      }

      rows[rowIndex]?.push({ end_time: event.end_time!, event })
      eventPositions.set(event.id, { row: rowIndex, maxRows: 0 })
    })

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
  if (!event.day || !event.start_time || !event.end_time) {
    return {}
  }

  const dayIndex = days.indexOf(event.day)
  const startIndex = timeToIndex(event.start_time)
  const duration = getEventDuration(event)
  
  const dayPositions = getDayRowPositions()
  const position = getRowEventPositions().get(event.id) || { row: 0, maxRows: 1 }
  
  const eventHeight = TIMETABLE_CONFIG.CELL_HEIGHT - 4
  const rowSpacing = position.maxRows > 1 
    ? (TIMETABLE_CONFIG.CELL_HEIGHT * position.maxRows - eventHeight * position.maxRows) / (position.maxRows + 1) 
    : 0
  const topOffset = position.row * (eventHeight + rowSpacing)

  return {
    position: 'absolute',
    left: `${TIMETABLE_CONFIG.DAY_COLUMN_WIDTH + TIMETABLE_CONFIG.CELL_WIDTH * startIndex}px`,
    top: `${dayPositions[dayIndex]! + topOffset}px`,
    width: `${TIMETABLE_CONFIG.CELL_WIDTH * duration - 4}px`,
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
  const eventPositions = getRowEventPositions()
  // Use filteredEvents instead of events.value
  const dayEvents = filteredEvents.value.filter(e => e.day === days[dayIndex])
  const dayPositions = getDayRowPositions()

  const hasOverlappingEvents = dayEvents.some(e => {
    const position = eventPositions.get(e.id)
    return position && position.maxRows > 1
  })

  // Get max rows for this day if any
  let maxRows = 1
  if (dayEvents.length > 0) {
    const positions = dayEvents
      .map(e => eventPositions.get(e.id))
      .filter(Boolean) as { row: number, maxRows: number }[]

    if (positions.length > 0) {
      // Use both highest row + 1 and max rows to ensure consistency with day positions
      const highestRow = Math.max(...positions.map(p => p.row)) + 1
      const maxRowsValue = Math.max(...positions.map(p => p.maxRows || 1))
      maxRows = Math.max(highestRow, maxRowsValue)
    }
  }

  // Adjust cell height based on number of events
  const cellHeight = maxRows > 1 ? TIMETABLE_CONFIG.CELL_HEIGHT * maxRows : TIMETABLE_CONFIG.CELL_HEIGHT

  return {
    position: 'absolute',
    left: `${TIMETABLE_CONFIG.DAY_COLUMN_WIDTH + TIMETABLE_CONFIG.CELL_WIDTH * timeIndex}px`,
    top: `${dayPositions[dayIndex]}px`, // Use calculated position
    width: `${TIMETABLE_CONFIG.CELL_WIDTH}px`,
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
          (slot) => slot.to === draggedEvent.value?.end_time,
        ) -
        timeSlots.findIndex(
          (slot) => slot.from === draggedEvent.value?.start_time,
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
    left: `${TIMETABLE_CONFIG.DAY_COLUMN_WIDTH + TIMETABLE_CONFIG.CELL_WIDTH * index}px`,
    top: '0',
    width: `${TIMETABLE_CONFIG.CELL_WIDTH}px`,
    height: `${TIMETABLE_CONFIG.HEADER_HEIGHT}px`,
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
  const eventPositions = getRowEventPositions()

  let currentTop = TIMETABLE_CONFIG.HEADER_HEIGHT

  // Calculate position for each day based on expanded heights of previous days
  days.forEach((day, index) => {
    positions[index] = currentTop

    // Calculate height for this day based on max rows
    // Use filteredEvents instead of events.value
    const dayEvents = filteredEvents.value.filter(e => e.day === day)
    let maxRows = 1

    if (dayEvents.length > 0) {
      // Get actual event positions for this day
      const dayPositions = dayEvents
        .map(e => eventPositions.get(e.id))
        .filter(Boolean) as { row: number, maxRows: number }[]

      if (dayPositions.length > 0) {
        // Use both max rows and highest row + 1 to ensure we have enough space
        const highestRow = Math.max(...dayPositions.map(p => p.row)) + 1
        const maxRowsValue = Math.max(...dayPositions.map(p => p.maxRows || 1))
        maxRows = Math.max(highestRow, maxRowsValue)
      }
    }

    // Add this day's height to the running total
    currentTop += maxRows > 0 ? TIMETABLE_CONFIG.CELL_HEIGHT * maxRows : TIMETABLE_CONFIG.CELL_HEIGHT
  })

  return positions
}

const getDayStyle = (index: number): CSSProperties => {
  const eventPositions = getRowEventPositions()
  // Use filteredEvents instead of events.value
  const dayEvents = filteredEvents.value.filter(e => e.day === days[index])
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
  const rowHeight = maxRows > 1 ? TIMETABLE_CONFIG.CELL_HEIGHT * maxRows : TIMETABLE_CONFIG.CELL_HEIGHT

  return {
    position: 'absolute',
    left: '0',
    top: `${dayPositions[index]}px`, // Use calculated position
    width: `${TIMETABLE_CONFIG.DAY_COLUMN_WIDTH}px`,
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
  width: `${TIMETABLE_CONFIG.DAY_COLUMN_WIDTH}px`,
  height: `${TIMETABLE_CONFIG.HEADER_HEIGHT}px`,
  borderRight: '1px solid #e0e0e0',
  borderBottom: '1px solid #e0e0e0',
  backgroundColor: '#f5f5f5',
  boxSizing: 'border-box',
}

const containerStyle = computed<CSSProperties>(() => {
  const dayPositions = getDayRowPositions()
  const eventPositions = getRowEventPositions()

  // Calculate total container height by finding the bottom position of the last day
  const lastDayIndex = days.length - 1
  let lastDayHeight = TIMETABLE_CONFIG.CELL_HEIGHT

  // Get max rows for last day
  // Use filteredEvents instead of events.value
  const lastDayEvents = (viewType.value === 'parallels' ? filteredEvents.value : events.value)
    .filter(e => e.day === days[lastDayIndex])

  if (lastDayEvents.length > 0) {
    const positions = lastDayEvents.map(e => eventPositions.get(e.id))
      .filter(Boolean) as { row: number, maxRows: number }[]

    if (positions.length > 0) {
      const maxRows = Math.max(...positions.map(p => p.maxRows || 1))
      lastDayHeight = maxRows > 1 ? TIMETABLE_CONFIG.CELL_HEIGHT * maxRows : TIMETABLE_CONFIG.CELL_HEIGHT
    }
  }

  // Total height is position of last day plus its height
  const totalHeight = dayPositions[lastDayIndex]! + lastDayHeight

  return {
    position: 'relative',
    width: `${TIMETABLE_CONFIG.DAY_COLUMN_WIDTH + TIMETABLE_CONFIG.CELL_WIDTH * timeSlots.length}px`,
    height: `${totalHeight}px`,
    border: '1px solid #e0e0e0',
    borderBottom: 'none',
    borderRight: 'none',
    fontFamily: 'Arial, sans-serif',
  }
})

const handleDragStart = (
  event: DragEvent,
  eventData: CalendarEvent,
) => {
  if (!eventData.day && !eventData.start_time) {
    draggedTemplate.value = eventData
  } else {
    draggedEvent.value = eventData
  }
  event.dataTransfer!.effectAllowed = 'move'
}

// Handle event from EventSelectionPanel for template drag start
function handleTemplateStart(event: DragEvent, template: CalendarEvent) {
  draggedTemplate.value = template
  event.dataTransfer!.effectAllowed = 'move'
}

const getMousePosition = (event: DragEvent): { day: string; time: TimeSlot } | null => {
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

    if (y >= currentDayTop! && y < nextDayTop!) {
      dayIndex = i;
      break;
    }
  }

  const timeIndex = Math.floor((x - TIMETABLE_CONFIG.DAY_COLUMN_WIDTH) / TIMETABLE_CONFIG.CELL_WIDTH)

  if (
    dayIndex >= 0 &&
    dayIndex < days.length &&
    timeIndex >= 0 &&
    timeIndex < timeSlots.length
  ) {
    return {
      day: days[dayIndex]!,
      time: timeSlots[timeIndex]!,
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

    // TODO: This may not be necessary cant test due to API issues
    const eventToPlace: CalendarEvent = {
      id: draggedTemplate.value.original_eventId || -nextEventId++,
      day: position.day,
      start_time: timeSlots[newStartIndex]!.from,
      end_time: timeSlots[newEndIndex]!.to,
      title: draggedTemplate.value.title,
      shortcut: draggedTemplate.value.shortcut || getSubjectCode(draggedTemplate.value.subject_id) || '',
      color: draggedTemplate.value.color,
      subject_id: draggedTemplate.value.subject_id,
      event_type: draggedTemplate.value.event_type,
      room_id: preferredRoom.value
    }

    events.value.push(eventToPlace)

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
        start_time: timeSlots[newStartIndex]?.from,
        end_time: timeSlots[newEndIndex]?.to,
      } as CalendarEvent
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
    const dayOfWeek = days.indexOf(event.day!) + 1
    const startTimeIndex = timeToIndex(event.start_time!)

    const roomToUse = overrideRooms.value || !event.room_id
      ? preferredRoom.value
      : event.room_id

    console.log("Room to use:", roomToUse);


    const eventData = {
      day_of_week: dayOfWeek,
      start_time: startTimeIndex,
      room: roomToUse,
      weeks_bitmask: 4095,
    }

    await timetableEventStore.updateEvent(event.id, eventData)

    toast({
        title: "Success",
        description: "Event has been placed in the timetable."
      })

      await fetchTimetableEvents(timetableId.value)
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

onMounted(async () => {
  await subjectStore.fetchSubjects()
  await buildingStore.fetchRooms()
  await ttEventTypeStore.fetchEventTypes()
  await subjectGroupStore.fetchSubjectGroups()
  await subjectGroupStore.fetchSubjectGroupGroups()

  if (subjectGroupStore.subjectGroupGroups.length > 0) {
    selectedSubjectGroup.value = subjectGroupStore.subjectGroupGroups[0]?.name ?? null
  }

  if (route.query.subject) {
    subjectId.value = parseInt(route.query.subject as string)
  }
  if (route.query.room) {
    roomId.value = parseInt(route.query.room as string)
  }

  loadTimetableData()
})
</script>

<template>
  <ResizablePanelGroup direction="horizontal" class="rounded-lg border h-[calc(100vh-180px)]">
    <ResizablePanel :default-size="75">
      <ResizablePanelGroup direction="vertical">
        <ResizablePanel :default-size="80">
          <div class="flex flex-col h-full">
            <div class="flex items-center">
              <div class="flex flex-col w-full">
                <div class="flex justify-center">
                  <!-- Replace separate buttons with proper tabs implementation -->
                  <Tabs v-model="viewType" default-value="parallels"
                    class="w-full h-[100px] flex flex-row justify-between items-center">
                    <TabsList class="h-fit">
                      <TabsTrigger value="parallels">Parallels</TabsTrigger>
                      <TabsTrigger value="rooms">Rooms</TabsTrigger>
                      <TabsTrigger value="teacher">Teacher</TabsTrigger>
                      <TabsTrigger value="student">Student</TabsTrigger>
                    </TabsList>

                    <!-- Content specific to each tab view -->
                    <div class="mr-2">
                      <TabsContent value="parallels">
                        <!-- Add filtering controls for parallels view -->
                        <div class="flex flex-wrap gap-3 justify-center items-center">
                          <ComboBox :options="semesterOptions" title="Semester" search-placeholder="Select semester..."
                            v-model:selection="selectedSemester" />

                          <ComboBox :options="yearOptions" title="Year" search-placeholder="Select year..."
                            v-model:selection="selectedYear" />

                          <ComboBox :options="subjectGroupStore.subjectGroupGroups.map(g => ({
                            id: g.name,
                            name: g.name
                          }))" title="Subject Group" search-placeholder="Select subject group..."
                            v-model:selection="selectedSubjectGroup" />

                          <Badge class="h-fit" variant="outline">
                            Nominal Semester: {{ nominalSemester }}
                          </Badge>
                        </div>
                      </TabsContent>

                      <TabsContent value="rooms">
                        <div class="flex flex-col items-center gap-4 p-4">
                          <div v-if="!preferredRoom" class="text-center text-muted-foreground">
                            Please select a room from bottom panel to view its timetable.
                          </div>
                          <div v-else>
                            Now showing timetable for room:
                            <Badge variant="default">
                              {{buildingStore.rooms.find(r => r.id === preferredRoom)?.name}}
                            </Badge>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="teacher">
                        <div class="p-4 text-center text-muted-foreground">
                          Teacher view shows schedules organized by teaching staff
                        </div>
                      </TabsContent>

                      <TabsContent value="student">
                        <div class="p-4 text-center text-muted-foreground">
                          Student view shows schedules organized by student groups
                        </div>
                      </TabsContent>
                    </div>
                  </Tabs>
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

                  </div>
                  <!-- <div class="min-w-[150px]">
                    <ComboBox :options="roomOptions" title="Preferred Room"
                      search-placeholder="Select preferred room..." @update:selection="preferredRoom = $event" />
                  </div> -->
                </div>
              </div>
            </div>

            <ScrollArea class="overflow-auto p-1">
              <!-- Show the timetable grid for both parallels and rooms views -->
              <div :style="containerStyle" @dragover="handleDragOver" @drop="handleDrop"
                class="bg-white rounded-lg shadow-md overflow-hidden mb-2">
                <div :style="cornerCellStyle"></div>

                <!-- Show placeholder message when no room is selected in rooms view -->
                <div v-if="viewType === 'rooms' && !preferredRoom"
                  class="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-80 z-10">
                  <div class="text-lg text-gray-500 font-medium">
                    Please select a room to view its schedule
                  </div>
                </div>

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
                      width: `${TIMETABLE_CONFIG.DAY_COLUMN_WIDTH + TIMETABLE_CONFIG.CELL_WIDTH * timeSlots.length}px`,
                      height: containerStyle.height
                    }" />
                  </div>
                </template>
                <div v-else v-for="(day, dayIndex) in days" :key="day">
                  <div v-for="(time, timeIndex) in timeSlots" :key="`${day}-${time}`"
                    :style="getCellStyle(dayIndex, timeIndex)" />
                </div>

                <div v-if="!isResizing" v-for="event in filteredEvents" :key="event.id" class="relative group">
                  <!-- Use filteredEvents instead of events -->
                  <ContextMenu>
                    <ContextMenuTrigger>
                      <div :style="getEventStyle(event)"
                        class="event rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1"
                        draggable="true" @dragstart="handleDragStart($event, event)" @dragend="handleDragEnd">
                        <div class="flex justify-between items-center">
                          <div class="event-title font-semibold text-gray-800 truncate">
                            {{ event.shortcut }}
                            <span class="sr-only">{{ event.title }}</span>
                          </div>
                          <MoreVertical
                            class="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                        <div class="flex justify-between text-sm text-gray-600">
                          <div>{{ event.start_time }} - {{ event.end_time }}</div>
                          <div v-if="event.room_name"
                            class="text-xs font-semibold bg-blue-100 rounded-sm px-1 border-primary inline-flex items-center">
                            <Building class="w-4 h-4" /> {{ event.room_name }}
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
              <ScrollBar orientation="vertical" />
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle @dragging="isResizing = $event" with-handle />

        <ResizablePanel :default-size="20">

          <!-- Room selection panel -->
          <RoomSelectionPanel v-model:selected-room-id="preferredRoom" v-model:override-rooms="overrideRooms" />
        </ResizablePanel>
      </ResizablePanelGroup>
    </ResizablePanel>

    <ResizableHandle @dragging="isResizing = $event" with-handle />

    <ResizablePanel :default-size="25">
      <EventSelectionPanel :event-templates="filteredEventTemplates" :is-loading="timetableEventStore.isLoading"
        @drag-start="handleTemplateStart" @drag-end="handleDragEnd" @menu-drag-over="handleMenuDragOver"
        @menu-drag-leave="isOverMenu = false" @menu-drop="handleMenuDrop" />
    </ResizablePanel>
  </ResizablePanelGroup>
</template>