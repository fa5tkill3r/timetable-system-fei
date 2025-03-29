<script setup lang="ts">

import { ref, computed, CSSProperties, watch, onMounted } from 'vue'
import _ from 'lodash'
import { useRoute, useRouter } from 'vue-router'
import { useTimetableStore } from '@/store/timetables'
import { useTimetableEventStore } from '@/store/timetableEvents'
import { useSubjectStore } from '@/store/subjects'
import { useBuildingStore } from '@/store/buildings'
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
import ComboBox from '@/components/ComboBox.vue'


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
  subjectId?: number | null
  originalEventId?: number | null
  eventType?: number | null
}

interface CalendarEvent {
  id: number
  day: string
  startTime: string
  endTime: string
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
const { toast } = useToast()
const route = useRoute()
const router = useRouter()


const viewType = ref<string>('Parallels')
const subjectId = ref<number | null>(null)
const roomId = ref<number | null>(null)


const selectedTimetable = ref<number | null>(null)
const selectedTimetableName = ref<string>('')

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


const isMenuOpen = ref(true)
const isOverMenu = ref(false)
const searchQuery = ref('')


const events = ref<CalendarEvent[]>([])
const eventTemplates = ref<EventTemplate[]>([])


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


onMounted(async () => {

  await subjectStore.fetchSubjects()
  await buildingStore.fetchRooms()

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


    if (selectedTimetable.value) {
      await fetchTimetableEvents(selectedTimetable.value)
    } else if (timetableStore.timetables.length > 0) {
      selectedTimetable.value = timetableStore.timetables[0].id
      selectedTimetableName.value = timetableStore.timetables[0].name
    }
  } catch (error) {
    toast({
      title: "Error loading data",
      description: "Failed to load timetables. Please try again.",
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

function getEventTypeLabel(eventType: number | null): string {
  if (eventType === 1) return 'Lecture'
  if (eventType === 2) return 'Lab'
  return 'Other'
}

function processTimetableEvents() {

  events.value = []
  eventTemplates.value = []


  timetableEventStore.events.forEach(event => {

    const subjectName = getSubjectName(event.subject)
    const subjectCode = getSubjectCode(event.subject)


    if (event.start_time !== null &&
      event.day_of_week !== null &&
      event.room !== null &&
      event.weeks_bitmask !== null &&
      event.weeks_bitmask !== 0) {

      const startTime = event.start_time.substring(0, 5)
      const endTime = calculateEndTime(startTime, event.duration)

      const roomDetail = buildingStore.rooms.find(r => r.id === event.room);
      const roomName = event.room_name || (roomDetail ? roomDetail.name : `Room ${event.room}`);

      console.log("Event room info:", {
        id: event.room,
        name: roomName,
        fromAPI: event.room_name,
        fromStore: roomDetail?.name
      });

      const title = subjectName || event.subject_name || `Event ${event.id}`;
      const shortcut = subjectCode || (title ? title.substring(0, 3).toUpperCase() : `E${event.id}`);

      events.value.push({
        id: event.id,
        day: getDayName(event.day_of_week),
        startTime: startTime,
        endTime: endTime,
        title: title,
        shortcut: shortcut,
        color: getColorFromString(title),
        roomId: event.room,
        roomName: roomName,
        subjectId: event.subject,
        eventType: event.event_type
      })
    } else {

      const title = subjectName || event.subject_name || `Event ${event.id}`

      const existingTemplate = eventTemplates.value.find(t =>
        t.title === title &&
        t.duration === event.duration &&
        t.eventType === event.event_type
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
          subjectId: event.subject,
          originalEventId: event.id,
          eventType: event.event_type
        })
      }
    }
  })
}


function getDayName(dayOfWeek: number): string {
  return days[dayOfWeek - 1] || 'Monday'
}


function calculateEndTime(startTime: string, duration: number): string {

  const startIndex = timeSlots.findIndex(slot => slot.from === startTime)


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


watch(selectedTimetable, async (newTimetableId) => {
  if (newTimetableId) {

    const timetable = await timetableStore.getTimetable(newTimetableId)
    if (timetable) {
      selectedTimetableName.value = timetable.name


      await fetchTimetableEvents(newTimetableId)
    }
  }
})


watch([subjectId, roomId, viewType], async () => {
  if (selectedTimetable.value) {

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

    await fetchTimetableEvents(selectedTimetable.value)
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
  if (!selectedTimetable.value) {
    toast({
      title: "Error",
      description: "No timetable selected. Please select a timetable first.",
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


    const eventData = {
      day_of_week: dayOfWeek,
      start_time: event.startTime,
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
        timetable: selectedTimetable.value,
        subject: event.subjectId,
        subject_name: event.title,
        duration: getEventDuration(event),
        event_type: event.eventType || 1,
      }
      result = await timetableEventStore.createEvent(fullEventData)
    }

    if (result) {
      toast({
        title: "Success",
        description: "Event has been placed in the timetable."
      })

      await fetchTimetableEvents(selectedTimetable.value)
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
  if (!selectedTimetable.value || !event.id) return

  try {

    const currentEvent = timetableEventStore.events.find(e => e.id === event.id)
    if (!currentEvent) return


    const eventData = {
      timetable: selectedTimetable.value,
      subject: event.subjectId || null,
      subject_name: event.title,
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
      await fetchTimetableEvents(selectedTimetable.value)
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
  console.log("Drag ended")
  draggedEvent.value = null
  draggedTemplate.value = null
  draggedOverDay.value = null
  draggedOverTime.value = null
}
</script>

<template>

  <div class="flex flex-col">
    <div class="flex items-center pr-80">
      <div class="flex flex-col gap-4 w-full">
        <div class="flex justify-center">
          <div class="inline-flex gap-4 " role="group">
            <Button variant="outline" size="sm"
              :class="{ 'bg-primary text-primary-foreground': viewType === 'Parallels' }"
              @click="viewType = 'Parallels'">
              Parallels
            </Button>
            <Button variant="outline" size="sm" :class="{ 'bg-primary text-primary-foreground': viewType === 'Rooms' }"
              @click="viewType = 'Rooms'">
              Rooms
            </Button>
            <Button variant="outline" size="sm"
              :class="{ 'bg-primary text-primary-foreground': viewType === 'Teacher' }" @click="viewType = 'Teacher'">
              Teacher
            </Button>
            <Button variant="outline" size="sm"
              :class="{ 'bg-primary text-primary-foreground': viewType === 'Student' }" @click="viewType = 'Student'">
              Student
            </Button>
          </div>
        </div>

        <div class="flex flex-wrap justify-center gap-3 items-center">
          <TimetableSwitcher :timetables="timetableStore.timetables" :selected-id="selectedTimetable"
            :selected-name="selectedTimetableName" @select="selectedTimetable = $event" />

          <Select v-model="subjectId">
            <SelectTrigger class="w-[180px]">
              <SelectValue :placeholder="subjectId ? 'Subject filter active' : 'Filter by subject'" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="null">All subjects</SelectItem>
              <SelectItem v-for="subject in subjectOptions" :key="subject.id" :value="subject.id">
                {{ subject.name }}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select v-model="roomId">
            <SelectTrigger class="w-[180px]">
              <SelectValue :placeholder="roomId ? 'Room filter active' : 'Filter by room'" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="null">All rooms</SelectItem>
              <SelectItem v-for="room in []" :key="room.id" :value="room.id">
                {{ room.name }}
              </SelectItem>
            </SelectContent>
          </Select>

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

        <div v-if="selectedTimetable && timetableStore.selectedTimetable?.status"
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
          <div class="min-w-[150px]">
            <ComboBox :options="roomOptions" title="Preferred Room" search-placeholder="Select preferred room..."
              @update:selection="preferredRoom = $event" />
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="flex justify-center items-start">
    <div class="flex flex-col">


      <ScrollArea class="overflow-auto max-w-[calc(100vw-theme(space.10))] p-1"
        :class="{ 'max-w-[calc(100vw-theme(space.8)-theme(space.10))]': isMenuOpen }">
        <div :style="containerStyle" @dragover="handleDragOver" @drop="handleDrop"
          class="flex-shrink-0 bg-white rounded-lg shadow-md overflow-hidden mb-2" :class="{ 'mr-80': isMenuOpen }">
          <div :style="cornerCellStyle"></div>

          <div v-for="(time, index) in timeSlots" :key="index" :style="getHeaderStyle(index)"
            class="bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
            {{ time.from }} - {{ time.to }}
          </div>

          <div v-for="(day, index) in days" :key="day" :style="getDayStyle(index)">
            {{ day }}
          </div>

          <div v-for="(day, dayIndex) in days" :key="day">
            <div v-for="(time, timeIndex) in timeSlots" :key="`${day}-${time}`"
              :style="getCellStyle(dayIndex, timeIndex)" />
          </div>

          <div v-for="event in events" :key="event.id" class="relative group">
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

        <div v-if="isMenuOpen"
          class="bg-white border-l border-t border-b border-gray-200 p-4 fixed top-0 right-0 max-w-full w-80 h-full z-10"
          :class="{ 'bg-gray-50': isOverMenu }" @dragover="handleMenuDragOver" @dragleave="handleMenuDragLeave"
          @drop="handleMenuDrop">
          <Tabs default-value="events">
            <TabsList class="w-full">
              <TabsTrigger value="events" class="w-full">Unplaced Events</TabsTrigger>
              <TabsTrigger value="requirements" class="w-full">Requirements</TabsTrigger>
            </TabsList>
            <TabsContent value="events">
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

        <ScrollBar orientation="horizontal" :class="{ 'mr-80': isMenuOpen }" />
      </ScrollArea>
    </div>
  </div>
</template>
