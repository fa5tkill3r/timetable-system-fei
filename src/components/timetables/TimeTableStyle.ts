import { CalendarEvent, TimeSlot } from '@/types/types'
import { DAYS } from '@/utils/timetable'
import { computed, ComputedRef, CSSProperties, Ref } from 'vue'
import { DEFAULT_TIMETABLE_CONFIG as TIMETABLE_CONFIG } from '@/utils/timetable'
import { ConflictOptions, Conflicts } from './Conflicts'

export interface TimeTableStyleOptions {
  draggedEvent: Ref<CalendarEvent | null>
  draggedOverDay: Ref<string | null>
  draggedOverTime: Ref<TimeSlot | null>
  getRowEventPositions: ComputedRef<
    Map<number, { row: number; maxRows: number }>
  >
  getDayRowPositions: ComputedRef<number[]>
  timeToIndex: (time: string) => number
  getEventDuration: (event: CalendarEvent) => number
  filteredEvents: ComputedRef<CalendarEvent[]>
  conflicts: Conflicts
  timeSlots: TimeSlot[]
}

export function useTimeTableStyle(options: TimeTableStyleOptions) {
  const {
    draggedEvent,
    draggedOverDay,
    draggedOverTime,
    getRowEventPositions,
    getDayRowPositions,
    timeToIndex,
    getEventDuration,
    filteredEvents,
    conflicts,
    timeSlots,
  } = options

  const { cellHasConflict, checkConflicts } = conflicts

  // Update the getEventStyle function to ensure dragging works
  const getEventStyle = (event: CalendarEvent): CSSProperties => {
    if (!event.day || !event.start_time || !event.end_time) {
      return {}
    }

    const dayIndex = DAYS.indexOf(event.day)
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
      (e) => e.day === DAYS[dayIndex],
    )
    const dayPositions = getDayRowPositions.value

    let maxRows = 1
    if (dayEvents.length > 0) {
      maxRows = eventPositions.get(dayEvents[0]!.id!)?.maxRows || 1
    }

    const cellHeight = TIMETABLE_CONFIG.CELL_HEIGHT * maxRows

    const isDraggedOver = Boolean(
      draggedOverDay.value === DAYS[dayIndex] &&
        draggedOverTime.value &&
        timeIndex >= draggedOverTime.value.index &&
        timeIndex <
          draggedOverTime.value.index + getEventDuration(draggedEvent.value),
    )

    const wouldConflict = checkConflicts(dayIndex, timeIndex).hasConflict

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
      zIndex: 5,
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

  const getDayStyle = (index: number): CSSProperties => {
    const eventPositions = getRowEventPositions.value
    const dayEvents = filteredEvents.value.filter((e) => e.day === DAYS[index])
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

    const lastDayIndex = DAYS.length - 1
    let lastDayHeight = TIMETABLE_CONFIG.CELL_HEIGHT

    const lastDayEvents = filteredEvents.value.filter(
      (e) => e.day === DAYS[lastDayIndex],
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

  return {
    getEventStyle,
    getCellStyle,
    getHeaderStyle,
    getDayStyle,
    cornerCellStyle,
    containerStyle,
  }
}
