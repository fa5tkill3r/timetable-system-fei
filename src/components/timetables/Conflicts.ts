import { CalendarEvent, TimeSlot } from '@/types/types'
import { computed, Ref } from 'vue'
import { DAYS } from '@/utils/timetable'

export interface ConflictOptions {
  isDragging: Ref<boolean>
  draggedEvent: Ref<CalendarEvent | null>
  draggedOverDay: Ref<string | null>
  draggedOverTime: Ref<TimeSlot | null>
  placedEvents: Ref<CalendarEvent[]>
  timeToIndex: (time: string | null) => number | null
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
    cellInvolvedInOverlap: boolean
    overlappingCells: number[]
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
  } = options

  const hasRoomConflict = computed(() => currentDragConflicts.value.hasConflict)

  const currentDragConflicts = computed(() => {
    if (!isDragging.value || !draggedOverDay.value || !draggedOverTime.value)
      return {
        hasConflict: false,
        types: [],
        events: [],
        cellInvolvedInOverlap: false,
        overlappingCells: [],
      }

    const timeIndex = timeToIndex(draggedOverTime.value.from)
    return checkConflicts(draggedOverDay.value, timeIndex!)
  })

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
      return {
        hasConflict: false,
        types: [],
        events: [],
        cellInvolvedInOverlap: false,
        overlappingCells: [],
      }

    try {
      const event = draggedEvent.value
      const dayName = typeof day === 'number' ? DAYS[day] : day

      // Exclude current event from check
      const eventsToCheck = event.id
        ? placedEvents.value.filter((e) => e.id !== event.id)
        : placedEvents.value

      const endTimeIndex = timeIndex + event.duration - 1
      const conflictTypes = new Set<string>()
      const conflictingEvents: CalendarEvent[] = []
      let cellInvolvedInOverlap = false
      const overlappingCells: number[] = []

      // Find conflicts
      for (const e of eventsToCheck) {
        if (!e.day || !e.start_time || !e.end_time) continue
        if (e.day !== dayName) continue

        const existingEventStartIndex = timeToIndex(e.start_time)!
        const existingEventEndIndex = existingEventStartIndex + e.duration - 1

        // Check time overlap
        if (
          timeIndex <= existingEventEndIndex &&
          endTimeIndex >= existingEventStartIndex
        ) {
          // Check weeks overlap - events must have at least one common week
          const eventWeeksBitmask = event.weeks_bitmask || 0
          const existingEventWeeksBitmask = e.weeks_bitmask || 0

          // Only consider it a conflict if weeks overlap (at least one bit in common)
          if ((eventWeeksBitmask & existingEventWeeksBitmask) === 0) {
            continue // No weeks in common, not a conflict
          }

          // Room conflict check
          const roomConflict = event.room_id === e.room_id

          if (roomConflict) {
            conflictTypes.add('room')
            conflictingEvents.push(e)

            // Determine overlapping cells
            const overlapStart = Math.max(timeIndex, existingEventStartIndex)
            const overlapEnd = Math.min(endTimeIndex, existingEventEndIndex)

            // Add all overlapping cells to the array
            for (let i = overlapStart; i <= overlapEnd; i++) {
              overlappingCells.push(i)
            }

            // Check if the current timeIndex cell is part of the overlap
            if (timeIndex >= overlapStart && timeIndex <= overlapEnd) {
              cellInvolvedInOverlap = true
            }
          }
        }
      }

      return {
        hasConflict: conflictingEvents.length > 0,
        types: Array.from(conflictTypes),
        events: conflictingEvents,
        cellInvolvedInOverlap,
        overlappingCells,
      }
    } catch (error) {
      console.error('Error checking conflicts:', error)
      return {
        hasConflict: false,
        types: [],
        events: [],
        cellInvolvedInOverlap: false,
        overlappingCells: [],
      }
    }
  }

  return {
    hasRoomConflict,
    cellHasConflict,
    checkConflicts,
  }
}
