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
    Ref,
    ComputedRef,
  } from 'vue'
  import _ from 'lodash'
  import { useRoute, useRouter } from 'vue-router'
  import { useTimetableStore } from '@/store/timetables'
  import { useTimetableEventStore } from '@/store/timetableEvents'
  import { useSubjectStore } from '@/store/subjects'
  import { useBuildingStore } from '@/store/buildings'
  import { useTTEventTypeStore } from '@/store/ttEventTypes'
  import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
  } from '@/components/ui/tabs'
  import {
    MoreVertical,
    Building,
    CalendarCog,
    AlertCircle,
  } from 'lucide-vue-next'
  import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
  import { Badge } from '@/components/ui/badge'
  import { Button } from '@/components/ui/button'
  import { useToast } from '@/components/ui/toast'
  import ComboBox from '@/components/common/ComboBox.vue'
  import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
  } from '@/components/ui/resizable'
  import RoomSelectionPanel from '@/components/timetables/RoomSelectionPanel.vue'
  import EventSelectionPanel from '@/components/timetables/EventSelectionPanel.vue'
  import { useSubjectGroupStore } from '@/store/subjectGroups'
  import TimetableGrid from '@/components/timetables/TimetableGrid.vue'
  import { DAYS } from '@/utils/timetable'
  import ConflictIcons from '@/components/timetables/ConflictIcons.vue'
  import EventContextMenu from '@/components/timetables/EventContextMenu.vue'
  import { templateRef } from '@vueuse/core'
  import { CalendarEvent, TimeSlot } from '@/types/types'
  import { useConflicts } from '@/components/timetables/Conflicts'
  import WeekFilter from '@/components/timetables/WeekFilter.vue'
  import { useTimeTableFilter } from '@/components/timetables/TimeTableFilter'
  import { useTimeTableStyle } from '@/components/timetables/TimeTableStyle'
  import { useTimeTableBase } from '@/components/timetables/TimeTableBase'
  import TimetableSettings from '@/components/timetables/TimetableSettings.vue'
  import { useTimetableSettingsStore } from '@/store/timetableSettings'
  import { useSubjectUserRoleStore } from '@/store/subjectUserRoles'
  import { EMPTY_IMAGE } from '@/lib/utils'

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

  const timetableStore = useTimetableStore()
  const timetableEventStore = useTimetableEventStore()
  const subjectStore = useSubjectStore()
  const buildingStore = useBuildingStore()
  const ttEventTypeStore = useTTEventTypeStore()
  const subjectGroupStore = useSubjectGroupStore()
  const subjectUserRoleStore = useSubjectUserRoleStore()

  const { toast } = useToast()
  const route = useRoute('/timetables/[id]/')
  const router = useRouter()

  const subjectId = ref<number | null>(null)
  const roomId = ref<number | null>(null)
  const selectedTimetableName = ref<string>('')
  const isOverMenu = ref(false)
  const isResizing = ref(false)
  const preferredRoom = ref<number | undefined>(undefined)
  const overrideRooms = ref<boolean>(false)
  const draggedEvent = ref<CalendarEvent | null>(null)
  const draggedOverDay = ref<string | null>(null)
  const draggedOverTime = ref<TimeSlot | null>(null)
  const mousePosition = ref({ x: 0, y: 0 })
  const TimeTableGrid = useTemplateRef('TimeTableGrid')
  const weekFilter = useTemplateRef('weekFilter')
  const selectedTeacher = ref<string | null>(null)

  const contextMenuVisible = ref(false)
  const contextMenuPosition = ref({ x: 0, y: 0 })
  const selectedEvent = ref<CalendarEvent | null>(null)

  const timetableSettings = useTimetableSettingsStore()

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

  const isDragging = computed(() => draggedEvent.value !== null)

  const staffMembers = computed(() => {
    // Get unique lecturers across all events
    const uniqueStaffMembers = new Set<string>()

    events.value
      .filter((event) => event.subject_id)
      .forEach((event) => {
        // Get lecturer roles for this subject
        subjectUserRoleStore
          .getLecturersForSubject(event.subject_id!)
          .forEach((role) => {
            const user = role.user as any
            const name = user.full_name || 'Unknown'
            uniqueStaffMembers.add(name)
          })
      })

    // Convert to array of objects for ComboBox
    return Array.from(uniqueStaffMembers).map((name) => ({
      id: name,
      name: name,
    }))
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
    } catch (error) {
      console.error('Error fetching timetable events:', error)
      toast({
        title: 'Error loading events',
        description: 'Failed to load timetable events. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleDragStart = (event: DragEvent, itemData: CalendarEvent) => {
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', itemData.id?.toString() || '')

      // Fix dragging object preview. We are using image because of MACOS globe cursor
      event.dataTransfer.setDragImage(EMPTY_IMAGE, 0, 0)

      setTimeout(() => {
        // document.body.removeChild(test)
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

    // Use the day row positions to determine which day we arre hovering over
    const dayPositions = getDayRowPositions.value
    let dayIndex = -1

    // Find which day row contains our current mouse position
    for (let i = 0; i < DAYS.length; i++) {
      const nextDayIndex = i + 1
      const currentDayTop = dayPositions[i]
      const nextDayTop =
        nextDayIndex < DAYS.length ? dayPositions[nextDayIndex] : Infinity

      if (y >= currentDayTop! && y < nextDayTop!) {
        dayIndex = i
        break
      }
    }

    const timeIndex = Math.floor(
      (x - timetableSettings.config.DAY_COLUMN_WIDTH) /
        timetableSettings.config.CELL_WIDTH,
    )

    if (
      dayIndex >= 0 &&
      dayIndex < DAYS.length &&
      timeIndex >= 0 &&
      timeIndex < timeSlots.value.length
    ) {
      return {
        day: DAYS[dayIndex]!,
        time: timeSlots.value[timeIndex]!,
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

    const timeIndex = timeSlots.value.findIndex(
      (slot) => slot.from === position.time.from,
    )
    const newEndIndex = timeIndex + duration - 1

    return timeIndex >= 0 && newEndIndex < timeSlots.value.length
  }

  const handleDrop = async (event: DragEvent) => {
    event.preventDefault()

    try {
      const position = getMousePosition(event)
      if (!position) throw new Error('Invalid drop position')
      if (!draggedEvent.value) throw new Error('No event to drop')

      if (!isValidEventPlacement(position, draggedEvent.value?.duration)) {
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
        duration: draggedActivity.duration,
        end_time: calculateEndTime(
          position.time.from,
          draggedActivity.duration,
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
      const dayOfWeek = DAYS.indexOf(event.day!) + 1
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
        duration: event.duration,
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

  const handleDocumentClick = (event: MouseEvent) => {
    if (!contextMenuVisible.value) return

    const element = contextMenuRef.value?.$el || contextMenuRef.value

    if (element && !element.contains(event.target as Node)) {
      contextMenuVisible.value = false
    }
  }

  const contextMenuRef = templateRef('contextMenuRef')

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

  onMounted(async () => {
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

    document.addEventListener('dragover', handleDocumentDragOver)
    document.addEventListener('dragend', handleDragEnd)
    window.addEventListener('dragend', handleDragEnd)
  })

  function handleDragEnd() {
    draggedEvent.value = null
    draggedOverDay.value = null
    draggedOverTime.value = null
  }

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

    contextMenuPosition.value = { x: event.clientX, y: event.clientY }
    selectedEvent.value = calendarEvent
    contextMenuVisible.value = true
  }

  async function updateEventWeeksBitmask(eventId: number, newBitmask: number) {
    try {
      const eventIndex = placedEvents.value.findIndex((e) => e.id === eventId)
      if (eventIndex !== -1) {
        placedEvents.value[eventIndex]!.weeks_bitmask = newBitmask

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

  const {
    selectedSemester,
    selectedYear,
    selectedSubjectGroup,
    viewType,
    filteredEvents,
    filteredEventTemplates,
    nominalSemester,
  } = useTimeTableFilter({
    placedEvents,
    unplacedEvents,
    preferredRoom,
    weekFilter,
    selectedTeacher,
  })

  const {
    events,
    timeSlots,
    timeToIndex,
    calculateEndTime,
    getRowEventPositions,
    getDayRowPositions,
  } = useTimeTableBase({
    filteredEvents,
  })

  const conflicts = useConflicts({
    draggedEvent,
    isDragging,
    placedEvents,
    draggedOverDay,
    draggedOverTime,
    timeToIndex,
  })

  const { hasRoomConflict, checkConflicts } = conflicts

  const {
    getCellStyle,
    getEventStyle,
    getHeaderStyle,
    containerStyle,
    cornerCellStyle,
    getDayStyle,
  } = useTimeTableStyle({
    draggedEvent,
    draggedOverDay,
    draggedOverTime,
    getRowEventPositions,
    getDayRowPositions,
    timeToIndex,
    filteredEvents,
    conflicts,
    timeSlots,
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
        query,
      })

      await fetchTimetableEvents(timetableId.value)
    }
  })

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
</script>

<template>
  <div>
    <ResizablePanelGroup
      direction="horizontal"
      class="h-[calc(100vh-180px)] rounded-lg border"
    >
      <ResizablePanel :default-size="75">
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel :default-size="80">
            <div class="flex h-full flex-col">
              <WeekFilter ref="weekFilter" />
              <div class="flex items-center">
                <div class="flex w-full flex-col">
                  <div class="flex justify-center">
                    <Tabs
                      v-model="viewType"
                      default-value="parallels"
                      class="flex h-[100px] w-full flex-row items-start justify-between"
                    >
                      <TabsList class="h-fit">
                        <TabsTrigger value="parallels">{{
                          $t('timetable.editor.views.parallels')
                        }}</TabsTrigger>
                        <TabsTrigger value="rooms">{{
                          $t('timetable.editor.views.rooms')
                        }}</TabsTrigger>
                        <TabsTrigger value="teacher">{{
                          $t('timetable.editor.views.teacher')
                        }}</TabsTrigger>
                        <TabsTrigger value="student">{{
                          $t('timetable.editor.views.student')
                        }}</TabsTrigger>
                      </TabsList>

                      <div class="mr-2">
                        <TabsContent value="parallels">
                          <div
                            class="flex flex-wrap items-center justify-center gap-3"
                          >
                            <ComboBox
                              :options="semesterOptions"
                              :title="$t('timetable.editor.semester')"
                              :search-placeholder="
                                $t('timetable.editor.searchSemester')
                              "
                              v-model:selection="selectedSemester"
                            />

                            <ComboBox
                              :options="yearOptions"
                              :title="$t('timetable.editor.year')"
                              :search-placeholder="
                                $t('timetable.editor.searchYear')
                              "
                              v-model:selection="selectedYear"
                            />

                            <ComboBox
                              :options="
                                subjectGroupStore.subjectGroupGroups.map(
                                  (g) => ({
                                    id: g.name,
                                    name: g.name,
                                  }),
                                )
                              "
                              :title="$t('timetable.editor.subjectGroup')"
                              :search-placeholder="
                                $t('timetable.editor.searchSubjectGroup')
                              "
                              v-model:selection="selectedSubjectGroup"
                            />

                            <Badge
                              class="h-fit"
                              variant="outline"
                            >
                              {{ $t('timetable.editor.nominalSemester') }}:
                              {{ nominalSemester }}
                            </Badge>
                          </div>
                        </TabsContent>

                        <TabsContent value="rooms">
                          <div class="flex flex-col items-center gap-4 px-4">
                            <div
                              v-if="!preferredRoom"
                              class="text-center text-muted-foreground"
                            >
                              {{ $t('timetable.editor.roomNotSelected') }}
                            </div>
                            <div v-else>
                              {{ $t('timetable.editor.showingTimetableFor') }}:
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
                          <div class="flex flex-col items-center gap-4 px-4">
                            <div
                              class="flex flex-wrap items-center justify-center gap-3"
                            >
                              <ComboBox
                                :options="staffMembers"
                                :title="$t('timetable.editor.teacher')"
                                :search-placeholder="
                                  $t('timetable.editor.searchTeacher')
                                "
                                v-model:selection="selectedTeacher"
                              />
                              <div
                                v-if="!selectedTeacher"
                                class="text-center text-muted-foreground"
                              >
                                {{ $t('timetable.editor.teacherNotSelected') }}
                              </div>
                              <div v-else>
                                {{
                                  $t('timetable.editor.showingTimetableFor')
                                }}:
                                <Badge variant="default">{{
                                  selectedTeacher
                                }}</Badge>
                              </div>
                            </div>
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

                  <div
                    v-if="
                      timetableId && timetableStore.selectedTimetable?.status
                    "
                    class="flex justify-between pb-2 pr-3"
                  >
                    <div class="flex items-end gap-2 pl-10">
                      <Badge variant="outline">
                        {{ selectedTimetableName }}
                      </Badge>

                      <Badge
                        :variant="
                          timetableStore.selectedTimetable?.status ===
                          'PUBLISHED'
                            ? 'default'
                            : timetableStore.selectedTimetable?.status ===
                                'TEST'
                              ? 'secondary'
                              : 'destructive'
                        "
                      >
                        {{ timetableStore.selectedTimetable?.status }}
                      </Badge>

                      <Badge
                        variant="outline"
                        v-if="timetableStore.selectedTimetable?.owner"
                      >
                        Owner: {{ timetableStore.selectedTimetable?.owner }}
                      </Badge>
                    </div>
                    <div>
                      <TimetableSettings />
                    </div>
                  </div>
                </div>
              </div>

              <ScrollArea class="overflow-auto p-1">
                <div class="flex justify-center">
                  <TimetableGrid
                    ref="TimeTableGrid"
                    :days="DAYS"
                    :time-slots="timeSlots"
                    :get-cell-style="getCellStyle"
                    :get-header-style="getHeaderStyle"
                    :get-day-style="getDayStyle"
                    :corner-cell-style="cornerCellStyle"
                    :container-style="containerStyle"
                    :is-resizing="isResizing"
                    :is-dragging="isDragging"
                    @drag-over="handleDragOver"
                    @drop="handleDrop"
                    @drag-end="handleDragEnd"
                    :compact="timetableSettings.compactView"
                  >
                    <div
                      v-if="viewType === 'rooms' && !preferredRoom"
                      class="absolute inset-0 z-10 flex items-center justify-center bg-gray-50 bg-opacity-80"
                    >
                      <div class="text-lg font-medium text-gray-500">
                        {{ $t('timetable.editor.roomNotSelectedTimetable') }}
                      </div>
                    </div>

                    <div
                      v-for="(day, dayIndex) in DAYS"
                      :key="`conflict-icons-${day}`"
                    >
                      <template
                        v-for="(slot, slotIndex) in timeSlots"
                        :key="`conflict-icons-${day}-${slot.index}`"
                      >
                        <div
                          v-if="
                            isDragging &&
                            checkConflicts(dayIndex, slot.index)
                              .cellInvolvedInOverlap
                          "
                          :style="{
                            position: 'absolute',
                            left: `${timetableSettings.config.DAY_COLUMN_WIDTH + timetableSettings.config.CELL_WIDTH * slot.index + 4}px`,
                            top: `${getDayRowPositions[dayIndex] ?? timetableSettings.config.HEADER_HEIGHT}px`,
                            zIndex: 30,
                            pointerEvents: 'none',
                          }"
                        >
                          <ConflictIcons
                            :conflicts="
                              checkConflicts(dayIndex, slot.index).types
                            "
                          />
                        </div>
                      </template>
                    </div>

                    <div
                      v-if="!isResizing"
                      v-for="event in filteredEvents"
                      :key="event.id || 'temp'"
                      class="group relative"
                    >
                      <div
                        :style="getEventStyle(event)"
                        class="event rounded-lg shadow-md transition-all hover:shadow-lg"
                        draggable="true"
                        @dragstart="handleDragStart($event, event)"
                        @dragend="handleDragEnd"
                        @contextmenu="handleEventContextMenu($event, event)"
                      >
                        <div class="flex items-center justify-between">
                          <div
                            class="event-title truncate font-semibold text-gray-800"
                          >
                            {{ event.shortcut }}
                          </div>
                          <div class="flex items-center">
                            <!-- Pattern indicator -->
                            <div
                              v-if="event.weekType !== 'FULL'"
                              class="flex items-center rounded px-1 text-xs font-bold"
                              :class="{
                                'bg-blue-100 text-blue-800':
                                  event.weekType === 'A',
                                'bg-green-100 text-green-800':
                                  event.weekType === 'B',
                                'bg-purple-100 text-purple-800':
                                  event.weekType === 'CUSTOM',
                                'bg-red-500 text-red-800':
                                  event.weekType === 'NONE',
                              }"
                            >
                              <template
                                v-if="
                                  event.weekType === 'A' ||
                                  event.weekType === 'B'
                                "
                              >
                                {{ event.weekType }}
                              </template>
                              <CalendarCog
                                v-else-if="event.weekType === 'CUSTOM'"
                                class="h-4 w-4"
                              />
                              <AlertCircle
                                v-else-if="event.weekType === 'NONE'"
                                class="h-4 w-4"
                              />
                            </div>
                          </div>
                        </div>
                        <div class="flex justify-between text-sm text-gray-600">
                          <div v-if="!timetableSettings.compactView">
                            {{ event.start_time }} - {{ event.end_time }}
                          </div>
                          <div
                            v-if="event.room_name"
                            class="inline-flex items-center rounded-sm border-primary bg-blue-100 px-1 text-xs font-semibold"
                          >
                            <Building class="h-4 w-4" /> {{ event.room_name }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TimetableGrid>
                </div>

                <ScrollBar orientation="horizontal" />
                <ScrollBar orientation="vertical" />
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle
            @dragging="isResizing = $event"
            with-handle
          />

          <ResizablePanel :default-size="20">
            <RoomSelectionPanel
              v-model:selected-room-id="preferredRoom"
              v-model:override-rooms="overrideRooms"
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>

      <ResizableHandle
        @dragging="isResizing = $event"
        with-handle
      />

      <ResizablePanel :default-size="25">
        <EventSelectionPanel
          :event-templates="filteredEventTemplates"
          :is-loading="timetableEventStore.isLoading"
          @drag-start="(event, template) => handleDragStart(event, template)"
          @drag-end="handleDragEnd"
          @menu-drag-over="handleMenuDragOver"
          @menu-drag-leave="isOverMenu = false"
          @menu-drop="handleMenuDrop"
        />
      </ResizablePanel>
    </ResizablePanelGroup>

    <div
      v-if="isDragging"
      :style="{
        position: 'fixed',
        left: mousePosition.x + 15 + 'px',
        top: mousePosition.y + 15 + 'px',
        width: `${timetableSettings.config.CELL_WIDTH * draggedEvent!.duration - 4}px`,
        height: `${timetableSettings.compactView ? 'auto' : `${timetableSettings.config.CELL_HEIGHT - 4}px`}`,
        border: hasRoomConflict ? '2px solid #e53935' : '2px solid #2196f3',
        pointerEvents: 'none',
      }"
      :class="{
        'bg-blue-100': !hasRoomConflict,
        'bg-red-100': hasRoomConflict,
      }"
      class="z-50 rounded-lg border-2 border-solid border-gray-300 p-[4px] shadow-md"
    >
      <div class="flex items-center justify-between">
        <div class="truncate font-semibold text-gray-800">
          {{ draggedEvent?.shortcut }}
        </div>
      </div>

      <div class="mt-1 flex justify-between text-sm text-gray-600">
        <div v-if="draggedOverTime && !timetableSettings.compactView">
          {{ draggedOverTime.from }} -
          {{ calculateEndTime(draggedOverTime.from, draggedEvent!.duration) }}
        </div>
        <div
          v-if="draggedEvent?.room_name || preferredRoom"
          class="inline-flex items-center rounded-sm border-primary bg-blue-100 px-1 text-xs font-semibold"
        >
          <Building class="h-4 w-4" />
          {{
            buildingStore.rooms.find((r) => r.id === draggedEvent?.room_id)
              ?.name
          }}
        </div>
      </div>
    </div>

    <EventContextMenu
      v-if="selectedEvent"
      ref="contextMenuRef"
      :event="selectedEvent"
      :visible="contextMenuVisible"
      :position="contextMenuPosition"
      @update:visible="contextMenuVisible = $event"
      @delete-event="deleteEvent"
      @edit-event="editEvent"
      @drag-start="handleDragStart"
      @update-weeks-bitmask="updateEventWeeksBitmask"
      @drag-end="handleDragEnd"
    />
  </div>
</template>
