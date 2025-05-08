<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTimeTableBase } from '@/components/timetables/TimeTableBase'
import { useTimeTableStyle } from '@/components/timetables/TimeTableStyle'
import { DAYS } from '@/utils/timetable'
import { useTimetableEventStore } from '@/store/timetableEvents'
import { useTimetableSettingsStore } from '@/store/timetableSettings'
import { useAuthStore } from '@/store/auth'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import TimetableGrid from '@/components/timetables/TimetableGrid.vue'
import { Building } from 'lucide-vue-next'
import { CalendarEvent } from '@/types/types'
import { useToast } from '@/components/ui/toast'
import { useSubjectUserRoleStore } from '@/store/subjectUserRoles'
import { useSubjectStore } from '@/store/subjects'

const timetableEventStore = useTimetableEventStore()
const timetableSettings = useTimetableSettingsStore()
const subjectUserRoleStore = useSubjectUserRoleStore()
const subjectStore = useSubjectStore()
const authStore = useAuthStore()
const { toast } = useToast()

const events = ref<CalendarEvent[]>([])
const isLoading = ref(true)


const currentUserId = computed(() => {
  return authStore.user?.id || null
})

const userSubjectIds = computed(() => {
  if (!currentUserId.value) return new Set<number>()

  const subjectIds = new Set<number>()

  subjectUserRoleStore.lecturers.forEach(role => {

    if (role.user.id === Number(currentUserId.value)) {
      subjectIds.add(role.subject.id)
    }
  })

  return subjectIds
})

const filteredEvents = computed<CalendarEvent[]>(() => {
  if (!currentUserId.value) return []

  return events.value.filter(event => {
    const isPlaced = event.start_time !== null &&
      event.end_time !== null &&
      event.day !== null

    const isUserSubject = event.subject_id && userSubjectIds.value.has(event.subject_id)

    return isPlaced && isUserSubject
  })
})

const {
  timeSlots,
  getRowEventPositions,
  getDayRowPositions,
  processTimetableEvents,
  timeToIndex
} = useTimeTableBase({
  events,
  filteredEvents
})

const {
  getCellStyle,
  getEventStyle,
  getHeaderStyle,
  containerStyle,
  cornerCellStyle,
  getDayStyle
} = useTimeTableStyle({
  draggedEvent: ref(null),
  draggedOverDay: ref(null),
  draggedOverTime: ref(null),
  getRowEventPositions,
  getDayRowPositions,
  timeToIndex,
  filteredEvents,
  conflicts: null,
  timeSlots
})

async function loadUserTimetable() {
  isLoading.value = true
  try {
    await timetableEventStore.fetchEvents()
    await subjectStore.fetchSubjects()
    await subjectUserRoleStore.fetchLecturers()

    processTimetableEvents()
  } catch (error) {
    console.error('Error fetching timetable events:', error)
    toast({
      title: 'Error loading schedule',
      description: 'Failed to load your schedule. Please try again later.',
      variant: 'destructive',
    })
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadUserTimetable()
})
</script>

<template>
  <div>
    <div class="mb-2 flex items-center justify-between">
      <h3 class="font-semibold">My Schedule</h3>
      <button class="text-xs text-muted-foreground hover:text-foreground" @click="loadUserTimetable">
        Refresh
      </button>
    </div>

    <div v-if="isLoading" class="flex h-[300px] items-center justify-center">
      <div class="text-sm text-muted-foreground">Loading your schedule...</div>
    </div>

    <div v-else-if="filteredEvents.length === 0" class="flex h-[300px] items-center justify-center">
      <div class="text-center text-sm text-muted-foreground">
        <p>No scheduled events found.</p>
      </div>
    </div>

    <ScrollArea v-else class="overflow-auto">
      <div class="flex justify-center">
        <TimetableGrid :days="DAYS" :time-slots="timeSlots" :get-cell-style="getCellStyle"
          :get-header-style="getHeaderStyle" :get-day-style="getDayStyle" :corner-cell-style="cornerCellStyle"
          :container-style="containerStyle" :is-resizing="false" :is-dragging="false"
          :compact="timetableSettings.compactView">
          <div v-for="event in filteredEvents" :key="event.id" class="group relative">
            <div :style="getEventStyle(event)" class="event rounded-lg shadow-md">
              <div class="flex items-center justify-between">
                <div class="event-title truncate font-semibold text-gray-800">
                  {{ event.shortcut }}
                  <span class="sr-only">{{ event.title }}</span>
                </div>
              </div>
              <div class="flex justify-between text-sm text-gray-600">
                <div v-if="!timetableSettings.compactView">{{ event.start_time }} - {{ event.end_time }}
                </div>
                <div v-if="event.room_name"
                  class="inline-flex items-center rounded-sm border-primary bg-blue-100 px-1 text-xs font-semibold">
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
</template>