import { CalendarEvent, TimeSlot } from '@/types/types'
import { computed, Ref } from 'vue'

export interface ConflictOptions {
  isDragging: Ref<boolean>
  draggedEvent: Ref<CalendarEvent | null>
  draggedOverDay: Ref<string | null>
  draggedOverTime: Ref<TimeSlot | null>
  placedEvents: Ref<CalendarEvent[]>
  timeToIndex: (time: string) => number
  getEventDuration: (event: CalendarEvent) => number
  days: readonly string[]
}

export interface Conflicts {
  hasRoomConflict: Ref<boolean>
  cellHasConflict: (
    dayIndex: number,
    timeIndex: number | undefined,
  ) => {
    hasConflict: boolean
    types: string[]
  }
  checkConflicts: (
    day: string | number,
    timeIndex: number | undefined,
  ) => {
    hasConflict: boolean
    types: string[]
    events: CalendarEvent[]
  }
}

export function useConflicts(options: ConflictOptions): Conflicts {
  const {
    isDragging,
    draggedEvent,
    draggedOverDay,
    draggedOverTime,
    placedEvents,
    timeToIndex,
    getEventDuration,
    days,
  } = options

  const hasRoomConflict = computed(() => currentDragConflicts.value.hasConflict)

  const currentDragConflicts = computed(() => {
    if (!isDragging.value || !draggedOverDay.value || !draggedOverTime.value)
      return { hasConflict: false, types: [], events: [] }

    const timeIndex = timeToIndex(draggedOverTime.value.from)
    return checkConflicts(draggedOverDay.value, timeIndex)
  })

  // Simplified cell conflict check
  const cellHasConflict = (dayIndex: number, timeIndex: number | undefined) => {
    const result = checkConflicts(dayIndex, timeIndex)
    return { hasConflict: result.hasConflict, types: result.types }
  }

  const checkConflicts = (
    day: string | number,
    timeIndex: number | undefined,
  ) => {
    // Early returns for invalid inputs
    if (!draggedEvent.value || timeIndex === undefined)
      return { hasConflict: false, types: [], events: [] }

    try {
      const event = draggedEvent.value
      const dayName = typeof day === 'number' ? days[day] : day

      // Exclude current event from check
      const eventsToCheck = event.id
        ? placedEvents.value.filter((e) => e.id !== event.id)
        : placedEvents.value

      const endTimeIndex = timeIndex + event.duration! - 1
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
          const roomConflict = event.room_id === e.room_id

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

  return {
    hasRoomConflict,
    cellHasConflict,
    checkConflicts,
  }
}
