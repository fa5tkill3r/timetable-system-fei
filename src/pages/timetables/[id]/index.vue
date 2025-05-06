<script setup lang="ts">
import {
  ref,
  computed,
  CSSProperties,
  watch,
  onMounted,
  onUnmounted,
  useTemplateRef,
  nextTick,
} from 'vue'
import _, { has } from 'lodash'
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
import { MoreVertical, Building } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import ComboBox from '@/components/common/ComboBox.vue'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import RoomSelectionPanel from '@/components/timetables/RoomSelectionPanel.vue'
import EventSelectionPanel from '@/components/timetables/EventSelectionPanel.vue'
import { useSubjectGroupStore } from '@/store/subjectGroups'
import { components } from '@/types/schema'
import TimetableGrid from '@/components/timetables/TimetableGrid.vue'
import {
  DEFAULT_TIMETABLE_CONFIG as TIMETABLE_CONFIG,
  DEFAULT_TIME_CONFIG as TIME_CONFIG,
} from '@/utils/timetable'
import ConflictIcons from '@/components/timetables/ConflictIcons.vue'
import EventContextMenu from '@/components/timetables/EventContextMenu.vue'
import { templateRef } from '@vueuse/core'
import { CalendarEvent, TimeSlot } from '@/types/types'

type Room = components['schemas']['Room']

const semesterOptions = [
  { id: 'LS', name: 'Summer Semester (LS)' },
  { id: 'ZS', name: 'Winter Semester (ZS)' },
]
const yearOptions = [
  { id: '1bc', name: '1. Bachelor' },
  { id: '2bc', name: '2. Bachelor' },
  { id: '3bc', name: '3. Bachelor' },
  { id: '1i', name: '1. Master' },
  { id: '2i', name: '2. Master' },
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
const isResizing = ref(false)
const events = ref<CalendarEvent[]>([])
const preferredRoom = ref<number | undefined>(undefined)
const overrideRooms = ref<boolean>(false)
const draggedEvent = ref<CalendarEvent | null>(null)
const draggedOverDay = ref<string | null>(null)
const draggedOverTime = ref<TimeSlot | null>(null)
const mousePosition = ref({ x: 0, y: 0 })
const TimeTableGrid = useTemplateRef('TimeTableGrid')

const contextMenuVisible = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const selectedEvent = ref<CalendarEvent | null>(null)

const timetableId = computed(() => {
  return route.params.id ? parseInt(route.params.id as string) : null
})

const unplacedEvents = computed<CalendarEvent[]>(() => {
  return events.value.filter(
    (event) =>
      event.start_time === null ||
      event.end_time === null ||
      event.day === null,
  )
})

const placedEvents = computed<CalendarEvent[]>(() => {
  return events.value.filter(
    (event) =>
      event.start_time !== null &&
      event.end_time !== null &&
      event.day !== null,
  )
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

  const subject = subjectStore.subjects.find((s) => s.id === subjectId)
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
          title: 'Timetable not found',
          description: 'The requested timetable does not exist.',
          variant: 'destructive',
        })
      }
    }
  } catch (error) {
    toast({
      title: 'Error loading data',
      description: 'Failed to load timetable. Please try again.',
      variant: 'destructive',
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
    console.error('Error fetching timetable events:', error)
    toast({
      title: 'Error loading events',
      description: 'Failed to load timetable events. Please try again.',
      variant: 'destructive',
    })
  }
}

function processTimetableEvents() {
  events.value = []

  timetableEventStore.events.forEach((event) => {
    const ttaData = event.tta as any
    const subjectId = ttaData?.subject
    const eventType = ttaData?.event_type

    const subjectName = getSubjectName(subjectId)
    const subjectCode = getSubjectCode(subjectId)

    const timeIndex = Math.min(event.start_time!, timeSlots.length - 1)
    const startTime = timeSlots[timeIndex]!.from
    const endTime = calculateEndTime(startTime, event.duration!)

    const room = event.room as any as Room

    const brightnessAdjustment = eventType === 1 ? 0.9 : 1.1

    events.value.push({
      id: event.id!,
      day: days[event.day_of_week! - 1] ?? null,
      start_time: startTime,
      end_time: endTime,
      start_index: timeToIndex(startTime),
      title: subjectName!,
      shortcut: subjectCode!,
      color: getColorFromString(subjectName!, 'pastel', brightnessAdjustment),
      room_id: room?.id,
      room_name: room?.name,
      subject_id: subjectId,
      event_type: eventType,
      duration: event.duration || 1,
      weeks_bitmask: event.weeks_bitmask || 4095,
    })

    // if (event.start_time !== null &&
    //   event.day_of_week !== null &&
    //   event.room !== null &&
    //   event.weeks_bitmask !== null &&
    //   event.weeks_bitmask !== 0) {

    //   // Convert numeric time index to display time
    //   const timeIndex = Math.min(event.start_time!, timeSlots.length - 1)
    //   const startTime = timeSlots[timeIndex]!.from
    //   const endTime = calculateEndTime(startTime, event.duration!)

    //   const room = event.room as any as Room

    //   const brightnessAdjustment = eventType === 1 ? 0.9 : 1.1

    //   events.value.push({
    //     id: event.id!,
    //     day: days[event.day_of_week! - 1]!,
    //     start_time: startTime,
    //     end_time: endTime,
    //     start_index: timeToIndex(startTime),
    //     title: subjectName!,
    //     shortcut: subjectCode!,
    //     color: getColorFromString(subjectName!, 'pastel', brightnessAdjustment),
    //     room_id: room.id,
    //     room_name: room.name,
    //     subject_id: subjectId,
    //     event_type: eventType,
    //     duration: event.duration || 1,
    //     weeks_bitmask: event.weeks_bitmask || 4095,
    //   })
    // } else {
    //   const brightnessAdjustment = eventType === 1 ? 0.9 : 1.1

    //   eventTemplates.value.push({
    //     id: event.id!,
    //     day: null,
    //     start_time: null,
    //     end_time: null,
    //     title: subjectName!,
    //     shortcut: subjectCode || '',
    //     color: getColorFromString(subjectName!, 'pastel', brightnessAdjustment),
    //     duration: event.duration || 1,
    //     subject_id: subjectId,
    //     original_eventId: event.id,
    //     event_type: eventType,
    //     weeks_bitmask: event.weeks_bitmask || 4095,
    //   })
    // }
  })
}

function timeToIndex(time: string): number {
  const index = timeSlots.findIndex((slot) => slot.from === time)
  return index >= 0 ? index : 0
}

function calculateEndTime(startTime: string, duration: number): string {
  const startIndex = timeToIndex(startTime)

  if (startIndex === -1) {
    console.warn(
      `Could not find time slot for: "${startTime}". Available slots:`,
      timeSlots.map((slot) => slot.from),
    )
    return startTime
  }

  const endIndex = startIndex + duration - 1
  if (endIndex >= timeSlots.length) return timeSlots[timeSlots.length - 1]!.to

  return timeSlots[endIndex]!.to
}

function getSubjectName(subjectId?: number | null): string | null {
  if (!subjectId) return null

  const subject = subjectStore.subjects.find((s) => s.id === subjectId)
  return subject ? subject.name : null
}

const isSubjectInGroup = (
  subjectId: number | null,
  groupName: string | null,
): boolean => {
  if (!subjectId || !groupName) return true

  const matchingGroups = subjectGroupStore.subjectGroups.filter(
    (group) => group.subject === subjectId,
  )

  return matchingGroups.some((group) => group.name === groupName)
}

const applyParallelsFilter = (item: CalendarEvent) => {
  if (!item.subject_id) return false

  const subject = subjectStore.subjects.find((s) => s.id === item.subject_id)
  if (!subject) return false

  const subjectCode = subject.code || null

  const isBachelor = selectedYear.value.includes('bc')
  const isCorrectLevel = isBachelor
    ? isBachelorSubject(subjectCode)
    : isMasterSubject(subjectCode)

  const isCorrectSemester = subject.nominal_semester === nominalSemester.value

  const isInSelectedGroup =
    !selectedSubjectGroup.value ||
    isSubjectInGroup(item.subject_id, selectedSubjectGroup.value)

  return isCorrectLevel && isCorrectSemester && isInSelectedGroup
}

const applyWeekPatternMatch = (event: CalendarEvent) => {
  const eventWeeksBitmask = event.weeks_bitmask || 0

  if (exactWeekMatch.value) {
    // Exact match - patterns must be identical
    return eventWeeksBitmask === filterWeeksBitmask.value
  } else {
    // Partial match - any selected week in the filter must be present in the event
    // This is a bitwise AND to check if there's any overlap
    return (eventWeeksBitmask & filterWeeksBitmask.value) > 0
  }
}

const filteredEvents = computed(() => {
  let events = placedEvents.value

  events = events.filter(applyWeekPatternMatch)

  if (viewType.value === 'parallels') {
    return events.filter(applyParallelsFilter)
  } else if (viewType.value === 'rooms') {
    if (!preferredRoom.value) {
      return []
    }
    return events.filter((event) => event.room_id === preferredRoom.value)
  }

  return events
})

// Update filteredEventTemplates to use the same filter approach
const filteredEventTemplates = computed(() => {
  // Show only events with quantity > 0
  const templates = unplacedEvents.value
  // Only apply additional filtering in parallels view
  if (viewType.value === 'parallels') {
    return templates.filter(applyParallelsFilter)
  }

  // For rooms view and other views, show all unplaced events
  return templates
})

const getEventDuration = (event: CalendarEvent): number => {
  // For template events with no start/end time
  if (event?.duration) {
    return event.duration
  }

  if (!event.start_time || !event.end_time) {
    return event.duration || 1
  }

  const startIndex = timeSlots.findIndex(
    (slot) => slot.from === event.start_time,
  )
  const endIndex = timeSlots.findIndex((slot) => slot.to === event.end_time)
  return endIndex - startIndex + 1
}
const getRowEventPositions = computed<
  Map<number, { row: number; maxRows: number }>
>(() => {
  const eventsByDay = _.groupBy(filteredEvents.value, 'day')
  const eventPositions = new Map()

  Object.entries(eventsByDay).forEach(([, dayEvents]) => {
    const sortedEvents = [...dayEvents].sort(
      (a, b) => timeToIndex(a.start_time!) - timeToIndex(b.start_time!),
    )

    const rows: { end_time: string; event: CalendarEvent }[][] = []

    sortedEvents.forEach((event) => {
      const startIndex = timeSlots.findIndex(
        (slot) => slot.from === event.start_time,
      )

      let rowIndex = 0
      let foundRow = false

      while (!foundRow) {
        if (!rows[rowIndex]) {
          rows[rowIndex] = []
          foundRow = true
        } else {
          const overlaps = rows[rowIndex]?.some((occupiedSlot) => {
            const occupiedEndIndex = timeSlots.findIndex(
              (slot) => slot.to === occupiedSlot.event.end_time,
            )
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
    sortedEvents.forEach((event) => {
      const position = eventPositions.get(event.id)
      if (position) {
        position.maxRows = maxRows
      }
    })
  })

  return eventPositions
})

// Update the getEventStyle function to ensure dragging works
const getEventStyle = (event: CalendarEvent): CSSProperties => {
  if (!event.day || !event.start_time || !event.end_time) {
    return {}
  }

  const dayIndex = days.indexOf(event.day)
  const startIndex = timeToIndex(event.start_time)
  const duration = getEventDuration(event)
  const dayPositions = getDayRowPositions.value

  const { row = 0, maxRows = 1 } =
    getRowEventPositions.value.get(event.id) || {}

  const eventHeight = TIMETABLE_CONFIG.CELL_HEIGHT - 4
  const rowSpacing = (4 * maxRows) / (maxRows + 1)
  const topOffset = row * (eventHeight + rowSpacing)

  // Adjust opacity - keep events more visible during drag
  const isDraggingNow = draggedEvent.value !== null
  const isBeingDragged = draggedEvent.value?.id === event.id

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
    zIndex: 25, // Use consistent z-index
    cursor: 'move',
    opacity: isDraggingNow ? (isBeingDragged ? 0.4 : 0.85) : 1, // Make semi-transparent but not invisible
  }
}

const getCellStyle = (dayIndex: number, timeIndex: number): CSSProperties => {
  const eventPositions = getRowEventPositions.value
  const dayEvents = filteredEvents.value.filter(
    (e) => e.day === days[dayIndex],
  )
  const dayPositions = getDayRowPositions.value

  let maxRows = 1
  if (dayEvents.length > 0) {
    maxRows = eventPositions.get(dayEvents[0]!.id!)?.maxRows || 1
  }

  const cellHeight = TIMETABLE_CONFIG.CELL_HEIGHT * maxRows

  // Calculate if this cell is within the dragged area
  const isDraggedOver = Boolean(
    draggedOverDay.value === days[dayIndex] &&
    draggedOverTime.value &&
    timeIndex >= draggedOverTime.value.index &&
    timeIndex <
    draggedOverTime.value.index + getEventDuration(draggedEvent.value),
  )

  // Check if cell would cause a conflict if the dragged event was placed here
  const wouldConflict = Boolean(
    isDragging.value &&
    (() => {
      if (!draggedEvent.value) return false

      // Create a temporary event at this position to check for conflicts
      const eventToCheck = draggedEvent.value
      const duration = draggedEvent.value
        ? getEventDuration(draggedEvent.value)
        : eventToCheck.duration || 1

      // If we're dragging an existing event, we need to exclude it from conflicts
      const eventsToCheck = draggedEvent.value?.id
        ? placedEvents.value.filter((e) => e.id !== draggedEvent.value!.id)
        : placedEvents.value

      const endTimeIndex = timeIndex + duration - 1

      // Find events that would overlap with this position
      const conflictingEvents = eventsToCheck.filter((e) => {
        if (!e.day || !e.start_time || !e.end_time) return false

        // Check if same day
        if (e.day !== days[dayIndex]) return false

        // Get event time range
        const eventStartIndex = timeToIndex(e.start_time)
        const eventEndIndex = eventStartIndex + getEventDuration(e) - 1

        // Check for overlap
        return (
          timeIndex <= eventEndIndex &&
          endTimeIndex >= eventStartIndex &&
          // Room conflict check - if same room is used
          (eventToCheck.room_id === e.room_id ||
            preferredRoom.value === e.room_id)
        )
      })

      return conflictingEvents.length > 0
    })(),
  )

  // Get current conflicts based on mouse position
  const conflicts = getConflictingEvents.value

  // Calculate if this cell has a conflict
  const conflictResult = cellHasConflict(dayIndex, timeIndex)
  const hasConflict = isDraggedOver && conflictResult.hasConflict

  return {
    position: 'absolute',
    left: `${TIMETABLE_CONFIG.DAY_COLUMN_WIDTH + TIMETABLE_CONFIG.CELL_WIDTH * timeIndex}px`,
    top: `${dayPositions[dayIndex]}px`,
    width: `${TIMETABLE_CONFIG.CELL_WIDTH}px`,
    height: `${cellHeight}px`,
    borderRight: '1px solid #e0e0e0',
    borderBottom: '1px solid #e0e0e0',
    boxSizing: 'border-box',
    zIndex: 5, // Lower z-index for backgrounds to be below events
    backgroundColor: (() => {
      if (!draggedEvent.value) return 'transparent'

      // If conflict detected, use orange background
      if (isDraggedOver && hasConflict) {
        return 'rgba(255, 171, 145, 0.7)' // Semi-transparent orange for conflicts
      }

      // Show ALL conflicting cells in light orange when dragging
      if (wouldConflict) {
        return 'rgba(255, 224, 178, 0.7)' // Semi-transparent light orange for conflicts
      }

      // For regular hover during drag
      if (isDraggedOver) {
        return timeIndex + getEventDuration(draggedEvent.value) <=
          timeSlots.length
          ? 'rgba(227, 242, 253, 0.7)' // Semi-transparent blue for valid placement
          : 'rgba(255, 205, 210, 0.7)' // Semi-transparent red for invalid placement
      }

      return 'transparent'
    })(),
    // No longer using background image for icons
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

const getDayRowPositions = computed<number[]>(() => {
  const positions: number[] = Array(days.length).fill(0)
  const eventPositions = getRowEventPositions.value

  let currentTop = TIMETABLE_CONFIG.HEADER_HEIGHT

  days.forEach((day, index) => {
    positions[index] = currentTop

    const dayEvents = filteredEvents.value.filter((e) => e.day === day)
    let maxRows = 1

    if (dayEvents.length > 0) {
      const dayPositions = dayEvents
        .map((e) => eventPositions.get(e.id))
        .filter(Boolean) as { row: number; maxRows: number }[]

      if (dayPositions.length > 0) {
        maxRows = eventPositions.get(dayEvents[0]!.id!)?.maxRows || 1
      }
    }

    currentTop += TIMETABLE_CONFIG.CELL_HEIGHT * maxRows
  })

  return positions
})

const getDayStyle = (index: number): CSSProperties => {
  const eventPositions = getRowEventPositions.value
  const dayEvents = filteredEvents.value.filter((e) => e.day === days[index])
  const dayPositions = getDayRowPositions.value

  let maxRows = 1
  if (dayEvents.length > 0) {
    maxRows = eventPositions.get(dayEvents[0]!.id!)?.maxRows || 1
  }

  const rowHeight = TIMETABLE_CONFIG.CELL_HEIGHT * maxRows

  return {
    position: 'absolute',
    left: '0',
    top: `${dayPositions[index]}px`,
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
  const dayPositions = getDayRowPositions.value
  const eventPositions = getRowEventPositions.value

  const lastDayIndex = days.length - 1
  let lastDayHeight = TIMETABLE_CONFIG.CELL_HEIGHT

  const lastDayEvents = filteredEvents.value.filter(
    (e) => e.day === days[lastDayIndex],
  )

  if (lastDayEvents.length > 0) {
    const maxRows = eventPositions.get(lastDayEvents[0]!.id!)?.maxRows || 1
    lastDayHeight = TIMETABLE_CONFIG.CELL_HEIGHT * maxRows
  }

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

const handleDragStart = (event: DragEvent, itemData: CalendarEvent) => {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', itemData.id?.toString() || '')

    // Create an empty, transparent element to use as the drag image
    const emptyImg = document.createElement('div')
    emptyImg.style.position = 'absolute'
    emptyImg.style.top = '-9999px'
    emptyImg.style.opacity = '0'
    document.body.appendChild(emptyImg)

    event.dataTransfer.setDragImage(emptyImg, 0, 0)

    setTimeout(() => {
      document.body.removeChild(emptyImg)
      draggedEvent.value = {
        ...itemData,
        room_id:
          overrideRooms.value || !itemData.room_id
            ? preferredRoom.value
            : itemData.room_id,
      }
    }, 1)
  }
}

const getMousePosition = (
  event: DragEvent,
): { day: string; time: TimeSlot } | null => {
  const rect = (event.currentTarget as HTMLElement)?.getBoundingClientRect()
  if (!rect) return null

  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  // Use the day row positions to determine which day we're hovering over
  const dayPositions = getDayRowPositions.value
  let dayIndex = -1

  // Find which day row contains our current mouse position
  for (let i = 0; i < days.length; i++) {
    const nextDayIndex = i + 1
    const currentDayTop = dayPositions[i]
    const nextDayTop =
      nextDayIndex < days.length ? dayPositions[nextDayIndex] : Infinity

    if (y >= currentDayTop! && y < nextDayTop!) {
      dayIndex = i
      break
    }
  }

  const timeIndex = Math.floor(
    (x - TIMETABLE_CONFIG.DAY_COLUMN_WIDTH) / TIMETABLE_CONFIG.CELL_WIDTH,
  )

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

  mousePosition.value = {
    x: event.clientX,
    y: event.clientY,
  }

  const position = getMousePosition(event)
  if (position) {
    draggedOverDay.value = position.day
    draggedOverTime.value = position.time
  }
}

const handleMenuDragOver = (event: DragEvent) => {
  event.preventDefault()

  mousePosition.value = {
    x: event.clientX,
    y: event.clientY,
  }

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

const isValidEventPlacement = (
  position: { day: string; time: TimeSlot },
  duration: number,
): boolean => {
  if (!position) return false

  const timeIndex = timeSlots.findIndex(
    (slot) => slot.from === position.time.from,
  )
  const newEndIndex = timeIndex + duration - 1

  return timeIndex >= 0 && newEndIndex < timeSlots.length
}

const handleDrop = async (event: DragEvent) => {
  event.preventDefault()

  try {
    const position = getMousePosition(event)
    if (!position) throw new Error('Invalid drop position')
    if (!draggedEvent.value) throw new Error('No event to drop')

    if (!isValidEventPlacement(position, draggedEvent.value?.duration || 1)) {
      toast({
        title: 'Invalid Placement',
        description: 'The event cannot be placed here.',
        variant: 'destructive',
      })
      throw new Error('Invalid placement')
    }

    const draggedActivity = draggedEvent.value

    if (!draggedActivity) throw new Error('No event to drop')

    const updatedEvent: CalendarEvent = {
      ...draggedActivity,
      day: position.day,
      start_time: position.time.from,
      duration: draggedActivity.duration || 1,
      end_time: calculateEndTime(
        position.time.from,
        draggedActivity.duration || 1,
      ),
      start_index: timeToIndex(position.time.from),
      room_id:
        overrideRooms.value || !draggedActivity.room_id
          ? preferredRoom.value
          : draggedActivity.room_id,
    }

    if (!draggedActivity.room_id) {
      toast({
        title: 'Room Required',
        description: 'Please select a preferred room before placing events.',
        variant: 'destructive',
      })
      return
    }

    const eventIndex = placedEvents.value.findIndex(
      (e) => e.id === draggedActivity?.id,
    )
    if (eventIndex !== -1) {
      placedEvents.value[eventIndex] = updatedEvent
    } else {
      placedEvents.value.push(updatedEvent)
    }

    await saveEventPlacement(updatedEvent)
  } catch (error) {
    console.error('Error during drop:', error)
  } finally {
    handleDragEnd()
  }
}

async function saveEventPlacement(event: CalendarEvent) {
  if (!timetableId.value) {
    toast({
      title: 'Error',
      description: 'No timetable ID found. Please check the URL.',
      variant: 'destructive',
    })
    return
  }

  if (!event.room_id) {
    toast({
      title: 'Room Required',
      description: 'Please select a preferred room before placing events.',
      variant: 'destructive',
    })
    return
  }

  try {
    const dayOfWeek = days.indexOf(event.day!) + 1
    const startTimeIndex = timeToIndex(event.start_time!)

    const commonEventData = {
      day_of_week: dayOfWeek,
      start_time: startTimeIndex,
      room: event.room_id,
    }

    if (event.id == null) {
      const originalEvent = timetableEventStore.events.find(
        (e) => e.id === event.original_eventId,
      )
      if (!originalEvent) {
        throw new Error('Original event not found')
      }

      await timetableEventStore.createEvent({
        ...commonEventData,
        duration: event.duration,
        tta: (originalEvent.tta as any).id,
        tt: (originalEvent.tt as any).id,
        weeks_bitmask: originalEvent.weeks_bitmask,
      })
    } else {
      await timetableEventStore.updateEvent(event.id, commonEventData)
    }

    toast({
      title: 'Success',
      description: 'Event has been placed in the timetable.',
    })

    await fetchTimetableEvents(timetableId.value)
  } catch (error) {
    console.error('Error saving event placement:', error)
    toast({
      title: 'Error',
      description: 'Failed to save event placement.',
      variant: 'destructive',
    })
  }
}

async function toggleEventPlacement(event: CalendarEvent) {
  if (!timetableId.value || !event.id) return

  try {
    const currentEvent = timetableEventStore.events.find(
      (e) => e.id === event.id,
    )
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
        title: 'Success',
        description: 'Event has been moved to unplaced events.',
      })
      await fetchTimetableEvents(timetableId.value)
    }
  } catch (error) {
    toast({
      title: 'Error',
      description: 'Failed to update event placement.',
      variant: 'destructive',
    })
  }
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
      query,
    })

    await fetchTimetableEvents(timetableId.value)
  }
})

const handleDocumentClick = (event: MouseEvent) => {
  if (!contextMenuVisible.value) return

  const element = contextMenuRef.value?.$el || contextMenuRef.value

  if (element && !element.contains(event.target as Node)) {
    contextMenuVisible.value = false
  }
}

const contextMenuRef = templateRef('contextMenuRef')

watch(
  () => contextMenuVisible.value,
  (isVisible) => {
    if (isVisible) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleDocumentClick)
      }, 10)
    } else {
      document.removeEventListener('mousedown', handleDocumentClick)
    }
  },
)

function handleDocumentDragOver(e: DragEvent) {
  e.preventDefault()

  mousePosition.value = {
    x: e.clientX,
    y: e.clientY,
  }

  if (e.dataTransfer) {
    if (isOverTimetable(e)) {
      e.dataTransfer.dropEffect = 'move'
    } else if (isOverMenu.value) {
      e.dataTransfer.dropEffect = 'move'
    } else {
      e.dataTransfer.dropEffect = 'none'
    }
  }
}

function isOverTimetable(event: DragEvent): boolean {
  if (!TimeTableGrid.value) return false
  const timetableEl = TimeTableGrid.value.$el || TimeTableGrid.value

  const rect = timetableEl.getBoundingClientRect()
  return (
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  )
}

const filterWeeksBitmask = ref(parseInt('111111111111', 2)) // Default to all weeks selected
const exactWeekMatch = ref(false) // Default to inexact matching

const filterWeekBits = computed(() => {
  const binaryString = (filterWeeksBitmask.value || 0)
    .toString(2)
    .padStart(12, '0')
  return binaryString.split('').map((bit) => bit === '1')
})

const isFilterOddWeeksPattern = computed(() => {
  const oddWeeksMask = parseInt('101010101010', 2)
  return filterWeeksBitmask.value === oddWeeksMask
})

const isFilterEvenWeeksPattern = computed(() => {
  const evenWeeksMask = parseInt('010101010101', 2)
  return filterWeeksBitmask.value === evenWeeksMask
})

const isFilterAllWeeksPattern = computed(() => {
  const allWeeksMask = parseInt('111111111111', 2)
  return filterWeeksBitmask.value === allWeeksMask
})

function toggleFilterWeek(index: number) {
  const bitArray = filterWeekBits.value.slice()
  bitArray[index] = !bitArray[index]
  filterWeeksBitmask.value = parseInt(
    bitArray.map((bit) => (bit ? '1' : '0')).join(''),
    2,
  )
}

function selectOddWeeks() {
  filterWeeksBitmask.value = parseInt('101010101010', 2)
}

function selectEvenWeeks() {
  filterWeeksBitmask.value = parseInt('010101010101', 2)
}

function selectAllWeeks() {
  if (!isFilterAllWeeksPattern.value) {
    filterWeeksBitmask.value = parseInt('111111111111', 2)
  } else {
    filterWeeksBitmask.value = parseInt('000000000000', 2)
  }
}
const getConflictingEvents = computed(() => {
  if (!draggedEvent.value) return []
  if (!draggedOverDay.value || !draggedOverTime.value) return []

  const eventToCheck = draggedEvent.value
  const duration = draggedEvent.value
    ? getEventDuration(draggedEvent.value)
    : eventToCheck.duration || 1

  // If we're dragging an existing event, we need to exclude it from conflicts
  const eventsToCheck = draggedEvent.value
    ? placedEvents.value.filter((e) => e.id !== draggedEvent.value!.id)
    : placedEvents.value

  const startTimeIndex = timeToIndex(draggedOverTime.value.from)
  const endTimeIndex = startTimeIndex + duration - 1

  // Find events that overlap with the dragged position
  return eventsToCheck.filter((e) => {
    if (!e.day || !e.start_time || !e.end_time) return false

    // Check if same day
    if (e.day !== draggedOverDay.value) return false

    // Get event time range
    const eventStartIndex = timeToIndex(e.start_time)
    const eventEndIndex = eventStartIndex + getEventDuration(e) - 1

    // Check for overlap
    return (
      startTimeIndex <= eventEndIndex &&
      endTimeIndex >= eventStartIndex &&
      // Room conflict check - if same room is used
      (eventToCheck.room_id === e.room_id ||
        preferredRoom.value === e.room_id)
    )
  })
})

// Single source of truth for drag state
const dragState = computed(() => {
  if (!draggedEvent.value) return null

  const eventToCheck = draggedEvent.value
  const duration = draggedEvent.value
    ? getEventDuration(draggedEvent.value)
    : eventToCheck.duration || 1

  return { eventToCheck, duration }
})

// Single computed property for isDragging
const isDragging = computed(() => dragState.value !== null)

// Centralized conflict checking function
const checkConflicts = (
  day: string | number,
  timeIndex: number | undefined,
) => {
  // Early returns for invalid inputs
  if (!dragState.value || timeIndex === undefined)
    return { hasConflict: false, types: [], events: [] }

  try {
    const { eventToCheck, duration } = dragState.value
    const dayName = typeof day === 'number' ? days[day] : day

    // Exclude current event from check
    const eventsToCheck = eventToCheck.id
      ? placedEvents.value.filter((e) => e.id !== eventToCheck.id)
      : placedEvents.value

    const endTimeIndex = timeIndex + duration - 1
    const conflictTypes = new Set<string>()
    const conflictingEvents: CalendarEvent[] = []

    // Find conflicts
    for (const e of eventsToCheck) {
      if (!e.day || !e.start_time || !e.end_time) continue
      if (e.day !== dayName) continue

      const eventStartIndex = timeToIndex(e.start_time)
      const eventEndIndex = eventStartIndex + getEventDuration(e) - 1

      // Check time overlap
      if (timeIndex <= eventEndIndex && endTimeIndex >= eventStartIndex) {
        // Room conflict check
        const roomConflict =
          eventToCheck.room_id === e.room_id ||
          (preferredRoom.value === e.room_id && !eventToCheck.room_id)

        if (roomConflict) {
          conflictTypes.add('room')
          conflictingEvents.push(e)
        }
      }
    }

    return {
      hasConflict: conflictingEvents.length > 0,
      types: Array.from(conflictTypes),
      events: conflictingEvents,
    }
  } catch (error) {
    console.error('Error checking conflicts:', error)
    return { hasConflict: false, types: [], events: [] }
  }
}

// Current drag conflicts
const currentDragConflicts = computed(() => {
  if (!isDragging.value || !draggedOverDay.value || !draggedOverTime.value)
    return { hasConflict: false, types: [], events: [] }

  const timeIndex = timeToIndex(draggedOverTime.value.from)
  return checkConflicts(draggedOverDay.value, timeIndex)
})

// Room conflict indicator
const hasRoomConflict = computed(() => currentDragConflicts.value.hasConflict)

// Simplified cell conflict check
const cellHasConflict = (dayIndex: number, timeIndex: number | undefined) => {
  const result = checkConflicts(dayIndex, timeIndex)
  return { hasConflict: result.hasConflict, types: result.types }
}

function setupGlobalDragHandlers() {
  document.addEventListener('dragover', handleDocumentDragOver)

  document.addEventListener('dragend', handleDragEnd)
  window.addEventListener('dragend', handleDragEnd)
}

onMounted(async () => {
  await subjectStore.fetchSubjects()
  await buildingStore.fetchRooms()
  await ttEventTypeStore.fetchEventTypes()
  await subjectGroupStore.fetchSubjectGroups()
  await subjectGroupStore.fetchSubjectGroupGroups()

  if (subjectGroupStore.subjectGroupGroups.length > 0) {
    selectedSubjectGroup.value =
      subjectGroupStore.subjectGroupGroups[0]?.name ?? null
  }

  if (route.query.subject) {
    subjectId.value = parseInt(route.query.subject as string)
  }
  if (route.query.room) {
    roomId.value = parseInt(route.query.room as string)
  }

  loadTimetableData()
  setupGlobalDragHandlers()
})

function handleDragEnd() {
  draggedEvent.value = null
  draggedOverDay.value = null
  draggedOverTime.value = null
}

// Make sure to clean up when component unmounts
onUnmounted(() => {
  document.removeEventListener('dragover', handleDocumentDragOver)
  document.removeEventListener('dragend', handleDragEnd)
})

function handleEventContextMenu(
  event: MouseEvent,
  calendarEvent: CalendarEvent,
) {
  event.preventDefault()
  event.stopPropagation()

  // Position the context menu at the cursor position
  contextMenuPosition.value = { x: event.clientX, y: event.clientY }
  selectedEvent.value = calendarEvent
  contextMenuVisible.value = true
}

async function updateEventWeeksBitmask(eventId: number, newBitmask: number) {
  try {
    const eventIndex = placedEvents.value.findIndex((e) => e.id === eventId)
    if (eventIndex !== -1) {
      // Update local state
      placedEvents.value[eventIndex].weeks_bitmask = newBitmask

      // Save to server
      await timetableEventStore.updateEvent(eventId, {
        weeks_bitmask: newBitmask,
      })

      toast({
        title: 'Success',
        description: 'Event weeks updated successfully.',
      })
    }
  } catch (error) {
    console.error('Error updating event weeks:', error)
    toast({
      title: 'Error',
      description: 'Failed to update event weeks.',
      variant: 'destructive',
    })
  }
}

async function deleteEvent(event: CalendarEvent) {
  if (!event.id) return

  try {
    await toggleEventPlacement(event)
    contextMenuVisible.value = false

    toast({
      title: 'Success',
      description: 'Event removed from timetable.',
    })
  } catch (error) {
    console.error('Error removing event:', error)
    toast({
      title: 'Error',
      description: 'Failed to remove event.',
      variant: 'destructive',
    })
  }
}

function editEvent(event: CalendarEvent) {
  toast({
    title: 'Not implemented',
    description: 'Event editing will be implemented soon.',
  })
  contextMenuVisible.value = false
}
</script>

<template>
  <div>
    <ResizablePanelGroup direction="horizontal" class="h-[calc(100vh-180px)] rounded-lg border">
      <ResizablePanel :default-size="75">
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel :default-size="80">
            <div class="flex h-full flex-col">
              <div class="border-b bg-muted/20 px-2 py-1">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <h4 class="flex items-center text-sm font-medium">
                      <Calendar class="mr-1 h-4 w-4" /> Week Filter
                    </h4>
                    <div class="flex gap-1">
                      <Button size="sm" :variant="isFilterOddWeeksPattern ? 'default' : 'secondary'
                        " class="h-7 text-xs" @click="selectOddWeeks">
                        A
                      </Button>
                      <Button size="sm" :variant="isFilterEvenWeeksPattern ? 'default' : 'secondary'
                        " class="h-7 text-xs" @click="selectEvenWeeks">
                        B
                      </Button>
                      <Button size="sm" :variant="isFilterAllWeeksPattern ? 'default' : 'secondary'
                        " class="h-7 text-xs" @click="selectAllWeeks">
                        All Weeks
                      </Button>
                    </div>
                  </div>

                  <div class="flex justify-center gap-1">
                    <button v-for="(active, index) in filterWeekBits" :key="index" @click="toggleFilterWeek(index)"
                      class="flex h-6 w-6 items-center justify-center rounded-full border text-xs" :class="active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground'
                        ">
                      {{ index + 1 }}
                    </button>
                  </div>

                  <div class="flex items-center gap-2">
                    <div class="ml-4 flex items-center gap-2">
                      <label class="text-sm font-medium">Exact Match</label>
                      <Switch v-model:checked="exactWeekMatch" />
                    </div>
                  </div>
                </div>
              </div>
              <div class="flex items-center">
                <div class="flex w-full flex-col">
                  <div class="flex justify-center">
                    <!-- Replace separate buttons with proper tabs implementation -->
                    <Tabs v-model="viewType" default-value="parallels"
                      class="flex h-[100px] w-full flex-row items-start justify-between">
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
                          <div class="flex flex-wrap items-center justify-center gap-3">
                            <ComboBox :options="semesterOptions" title="Semester"
                              search-placeholder="Select semester..." v-model:selection="selectedSemester" />

                            <ComboBox :options="yearOptions" title="Year" search-placeholder="Select year..."
                              v-model:selection="selectedYear" />

                            <ComboBox :options="subjectGroupStore.subjectGroupGroups.map(
                              (g) => ({
                                id: g.name,
                                name: g.name,
                              }),
                            )
                              " title="Subject Group" search-placeholder="Select subject group..."
                              v-model:selection="selectedSubjectGroup" />

                            <Badge class="h-fit" variant="outline">
                              Nominal Semester: {{ nominalSemester }}
                            </Badge>
                          </div>
                        </TabsContent>

                        <TabsContent value="rooms">
                          <div class="flex flex-col items-center gap-4 px-4">
                            <div v-if="!preferredRoom" class="text-center text-muted-foreground">
                              Please select a room from bottom panel to view its
                              timetable.
                            </div>
                            <div v-else>
                              Now showing timetable for room:
                              <Badge variant="default">
                                {{
                                  buildingStore.rooms.find(
                                    (r) => r.id === preferredRoom,
                                  )?.name
                                }}
                              </Badge>
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="teacher">
                          <div class="px-4 text-center text-muted-foreground">
                            Teacher view shows schedules organized by teaching
                            staff
                          </div>
                        </TabsContent>

                        <TabsContent value="student">
                          <div class="px-4 text-center text-muted-foreground">
                            Student view shows schedules organized by student
                            groups
                          </div>
                        </TabsContent>
                      </div>
                    </Tabs>
                  </div>

                  <div class="flex flex-wrap items-center justify-center gap-3">
                    <div v-if="subjectId || roomId" class="flex items-center gap-2">
                      <Badge variant="outline" v-if="subjectId">
                        Subject: {{ getSubjectName(subjectId) || subjectId }}
                        <Button variant="ghost" size="icon" class="ml-1 h-4 w-4" @click="subjectId = null">
                          <span class="sr-only">Remove</span>
                          &times;
                        </Button>
                      </Badge>
                      <Badge variant="outline" v-if="roomId">
                        Room ID: {{ roomId }}
                        <Button variant="ghost" size="icon" class="ml-1 h-4 w-4" @click="roomId = null">
                          <span class="sr-only">Remove</span>
                          &times;
                        </Button>
                      </Badge>
                    </div>
                  </div>

                  <div v-if="
                    timetableId && timetableStore.selectedTimetable?.status
                  " class="flex justify-between pb-2 pr-3">
                    <div class="flex items-end gap-2 pl-10">
                      <Badge :variant="timetableStore.selectedTimetable?.status ===
                        'PUBLISHED'
                        ? 'default'
                        : timetableStore.selectedTimetable?.status === 'WIP'
                          ? 'secondary'
                          : 'destructive'
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
                <!-- Replace custom timetable with TimetableGrid component -->
                <TimetableGrid ref="TimeTableGrid" :days="days" :time-slots="timeSlots" :get-cell-style="getCellStyle"
                  :get-header-style="getHeaderStyle" :get-day-style="getDayStyle" :corner-cell-style="cornerCellStyle"
                  :container-style="containerStyle" :is-resizing="isResizing" :is-dragging="isDragging"
                  @cell-click="handleCellClick" @drag-over="handleDragOver" @drop="handleDrop" @drag-end="handleDragEnd"
                  @cell-context-menu="handleContextMenu">
                  <!-- Show placeholder message when no room is selected in rooms view -->
                  <div v-if="viewType === 'rooms' && !preferredRoom"
                    class="absolute inset-0 z-10 flex items-center justify-center bg-gray-50 bg-opacity-80">
                    <div class="text-lg font-medium text-gray-500">
                      Please select a room to view its schedule
                    </div>
                  </div>

                  <!-- Replace the current conflict icons implementation with this -->
                  <!-- Add conflict icons to cells -->
                  <div v-for="(day, dayIndex) in days" :key="`conflict-icons-${day}`">
                    <template v-for="(slot, slotIndex) in timeSlots" :key="`conflict-icons-${day}-${slot.index}`">
                      <div v-if="
                        isDragging &&
                        cellHasConflict(dayIndex, slot.index).hasConflict
                      " :style="{
                        position: 'absolute',
                        left: `${TIMETABLE_CONFIG.DAY_COLUMN_WIDTH + TIMETABLE_CONFIG.CELL_WIDTH * slot.index + 4}px`,
                        top: `${getDayRowPositions[dayIndex] ?? TIMETABLE_CONFIG.HEADER_HEIGHT}px`,
                        zIndex: 30,
                        pointerEvents: 'none',
                      }">
                        <ConflictIcons :conflicts="cellHasConflict(dayIndex, slot.index).types
                          " />
                      </div>
                    </template>
                  </div>

                  <!-- Add events as slots in the TimetableGrid -->
                  <div v-if="!isResizing" v-for="event in filteredEvents" :key="event.id" class="group relative">
                    <div :style="getEventStyle(event)" class="event rounded-lg shadow-md transition-all hover:shadow-lg"
                      draggable="true" @dragstart="handleDragStart($event, event)" @dragend="handleDragEnd"
                      @contextmenu="handleEventContextMenu($event, event)">
                      <div class="flex items-center justify-between">
                        <div class="event-title truncate font-semibold text-gray-800">
                          {{ event.shortcut }}
                          <span class="sr-only">{{ event.title }}</span>
                        </div>
                        <button @click.stop.prevent="() => { }" class="event-menu-button">
                          <MoreVertical
                            class="h-4 w-4 shrink-0 text-gray-500 opacity-0 transition-opacity group-hover:opacity-100" />
                        </button>
                      </div>
                      <div class="flex justify-between text-sm text-gray-600">
                        <div>{{ event.start_time }} - {{ event.end_time }}</div>
                        <div v-if="event.room_name"
                          class="inline-flex items-center rounded-sm border-primary bg-blue-100 px-1 text-xs font-semibold">
                          <Building class="h-4 w-4" /> {{ event.room_name }}
                        </div>
                      </div>
                    </div>
                  </div>
                </TimetableGrid>

                <!-- Add this right after your TimetableGrid component -->
                <!-- Drag preview element -->

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
          @drag-start="(event, template) => handleDragStart(event, template)" @drag-end="handleDragEnd"
          @menu-drag-over="handleMenuDragOver" @menu-drag-leave="isOverMenu = false" @menu-drop="handleMenuDrop" />
      </ResizablePanel>
    </ResizablePanelGroup>

    <div v-if="isDragging" :style="{
      position: 'fixed',
      left: mousePosition.x + 15 + 'px',
      top: mousePosition.y + 15 + 'px',
      width: `${TIMETABLE_CONFIG.CELL_WIDTH * getEventDuration(draggedEvent!) - 4}px`,
      height: `${TIMETABLE_CONFIG.CELL_HEIGHT - 4}px`,
      border: hasRoomConflict ? '2px solid #e53935' : '2px solid #2196f3',
      pointerEvents: 'none',
    }" :class="{
      'bg-blue-100': !hasRoomConflict,
      'bg-red-100': hasRoomConflict,
    }" class="z-50 rounded-lg border-2 border-solid border-gray-300 p-[4px] shadow-md">
      <div class="flex items-center justify-between">
        <div class="truncate font-semibold text-gray-800">
          {{ draggedEvent?.shortcut }}
        </div>
      </div>

      <div class="mt-1 flex justify-between text-sm text-gray-600">
        <div v-if="draggedOverTime">
          {{ draggedOverTime.from }} -
          {{
            calculateEndTime(
              draggedOverTime.from,
              getEventDuration(draggedEvent!) || 1,
            )
          }}
        </div>
        <div v-if="draggedEvent?.room_name || preferredRoom"
          class="inline-flex items-center rounded-sm border-primary bg-blue-100 px-1 text-xs font-semibold">
          <Building class="h-4 w-4" />
          {{
            buildingStore.rooms.find((r) => r.id === draggedEvent?.room_id)
              ?.name
          }}
        </div>
      </div>
    </div>

    <EventContextMenu v-if="selectedEvent" ref="contextMenuRef" :event="selectedEvent" :visible="contextMenuVisible"
      :position="contextMenuPosition" @update:visible="contextMenuVisible = $event" @delete-event="deleteEvent"
      @edit-event="editEvent" @drag-start="handleDragStart" @update-weeks-bitmask="updateEventWeeksBitmask"
      @drag-end="handleDragEnd" />
  </div>
</template>
