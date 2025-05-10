import { CalendarEvent, TimeSlot } from '@/types/types'
import { DAYS } from '@/utils/timetable'
import { computed, ComputedRef, CSSProperties, Ref } from 'vue'
import { Conflicts } from './Conflicts'
import { useTimetableSettingsStore } from '@/store/timetableSettings'

export interface TimeTableStyleOptions {
  draggedEvent: Ref<CalendarEvent | null>
  draggedOverDay: Ref<string | null>
  draggedOverTime: Ref<TimeSlot | null>
  getRowEventPositions: ComputedRef<
    Map<number, { row: number; maxRows: number }>
  >
  getDayRowPositions: ComputedRef<number[]>
  timeToIndex: (time: string | null) => number | null
  filteredEvents: ComputedRef<CalendarEvent[]>
  conflicts: Conflicts | null
  timeSlots: ComputedRef<TimeSlot[]>
}

export function useTimeTableStyle(options: TimeTableStyleOptions) {
  const {
    draggedEvent,
    draggedOverDay,
    draggedOverTime,
    getRowEventPositions,
    getDayRowPositions,
    timeToIndex,
    filteredEvents,
    conflicts,
    timeSlots,
  } = options

  const cellHasConflict = conflicts?.cellHasConflict
  const checkConflicts = conflicts?.checkConflicts
  const readonly = conflicts === null

  const timetableSettings = useTimetableSettingsStore()

  const getEventStyle = (event: CalendarEvent): CSSProperties => {
    if (!event.day || !event.start_time || !event.end_time) {
      return {}
    }

    const dayIndex = DAYS.indexOf(event.day)
    const startIndex = timeToIndex(event.start_time)
    const duration = event.duration
    const dayPositions = getDayRowPositions.value

    const { row = 0, maxRows = 1 } =
      getRowEventPositions.value.get(event.id!) || {}

    const eventHeight = timetableSettings.config.CELL_HEIGHT - 4
    const rowSpacing = (4 * maxRows) / (maxRows + 1)
    const topOffset = row * (eventHeight + rowSpacing)

    const isDraggingNow = draggedEvent.value !== null
    const isBeingDragged = draggedEvent.value?.id === event.id

    return {
      position: 'absolute',
      left: `${timetableSettings.config.DAY_COLUMN_WIDTH + timetableSettings.config.CELL_WIDTH * startIndex!}px`,
      top: `${dayPositions[dayIndex]! + topOffset}px`,
      width: `${timetableSettings.config.CELL_WIDTH * duration - 4}px`,
      height: `${eventHeight}px`,
      backgroundColor: event.color,
      borderRadius: '4px',
      padding: '8px',
      boxSizing: 'border-box',
      overflow: 'hidden',
      zIndex: 25,
      cursor: readonly ? 'auto' : 'move',
      opacity: isDraggingNow ? (isBeingDragged ? 0.4 : 0.85) : 1,
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

    const cellHeight = timetableSettings.config.CELL_HEIGHT * maxRows

    const isDraggedOver = Boolean(
      draggedEvent.value &&
        draggedOverDay.value === DAYS[dayIndex] &&
        draggedOverTime.value &&
        timeIndex >= draggedOverTime.value.index &&
        timeIndex < draggedOverTime.value.index + draggedEvent.value.duration,
    )

    return {
      position: 'absolute',
      left: `${timetableSettings.config.DAY_COLUMN_WIDTH + timetableSettings.config.CELL_WIDTH * timeIndex}px`,
      top: `${dayPositions[dayIndex]}px`,
      width: `${timetableSettings.config.CELL_WIDTH}px`,
      height: `${cellHeight}px`,
      borderRight: '1px solid #e0e0e0',
      borderBottom: '1px solid #e0e0e0',
      boxSizing: 'border-box',
      zIndex: 5,
      cursor: 'auto',
      backgroundColor: (() => {
        if (!draggedEvent.value) return 'transparent' // No drag, no special background

        // Only apply conflict styling if conflicts system is active
        if (conflicts && conflicts.checkConflicts) {
          // 1. Darker Orange: If current cell is part of the dragged event's span AND the overall drag operation causes a conflict.
          if (isDraggedOver && conflicts.hasRoomConflict.value) {
            return 'rgba(255, 171, 145, 0.7)' // Semi-transparent orange for conflicts
          }

          // 2. Lighter Orange: If placing the event *starting at this cell* would cause this cell to be part of an overlap.
          const hypotheticalConflictDetails = conflicts.checkConflicts(
            dayIndex,
            timeIndex,
          )

          if (
            hypotheticalConflictDetails &&
            hypotheticalConflictDetails.cellInvolvedInOverlap
          ) {
            return 'rgba(255, 224, 178, 0.7)' // Semi-transparent light orange for potential conflicts this cell is part of
          }
        }

        // 3. Blue/Red: If current cell is part of dragged event's span (and no conflict color applied if conflicts active)
        // show validity of placement based on timetable bounds.
        if (isDraggedOver && draggedEvent.value && draggedOverTime.value) {
          const isValidPlacement =
            draggedOverTime.value.index + draggedEvent.value.duration <=
            timeSlots.value.length
          return isValidPlacement
            ? 'rgba(227, 242, 253, 0.7)' // Semi-transparent blue for valid placement
            : 'rgba(255, 205, 210, 0.7)' // Semi-transparent red for invalid placement
        }

        return 'transparent'
      })(),
    }
  }

  const getHeaderStyle = (index: number): CSSProperties => {
    return {
      position: 'absolute',
      left: `${timetableSettings.config.DAY_COLUMN_WIDTH + timetableSettings.config.CELL_WIDTH * index}px`,
      top: '0',
      width: `${timetableSettings.config.CELL_WIDTH}px`,
      height: `${timetableSettings.config.HEADER_HEIGHT}px`,
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

    const rowHeight = timetableSettings.config.CELL_HEIGHT * maxRows

    return {
      position: 'absolute',
      left: '0',
      top: `${dayPositions[index]}px`,
      width: `${timetableSettings.config.DAY_COLUMN_WIDTH}px`,
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
    width: `${timetableSettings.config.DAY_COLUMN_WIDTH}px`,
    height: `${timetableSettings.config.HEADER_HEIGHT}px`,
    borderRight: '1px solid #e0e0e0',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#f5f5f5',
    boxSizing: 'border-box',
  }

  const containerStyle = computed<CSSProperties>(() => {
    const dayPositions = getDayRowPositions.value
    const eventPositions = getRowEventPositions.value

    const lastDayIndex = DAYS.length - 1
    let lastDayHeight = timetableSettings.config.CELL_HEIGHT

    const lastDayEvents = filteredEvents.value.filter(
      (e) => e.day === DAYS[lastDayIndex],
    )

    if (lastDayEvents.length > 0) {
      const maxRows = eventPositions.get(lastDayEvents[0]!.id!)?.maxRows || 1
      lastDayHeight = timetableSettings.config.CELL_HEIGHT * maxRows
    }

    const totalHeight = dayPositions[lastDayIndex]! + lastDayHeight

    return {
      position: 'relative',
      width: `${timetableSettings.config.DAY_COLUMN_WIDTH + timetableSettings.config.CELL_WIDTH * timeSlots.value.length}px`,
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
