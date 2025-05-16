import { getColorFromString } from '@/lib/utils'
import { useSubjectStore } from '@/store/subjects'
import { useTimetableEventStore } from '@/store/timetableEvents'
import { components } from '@/types/schema'
import { CalendarEvent } from '@/types/types'
import { DAYS, isPattern, TimeSlot } from '@/lib/timetable'
import _ from 'lodash'
import { computed, ComputedRef, Ref } from 'vue'
import { DEFAULT_TIME_CONFIG as TIME_CONFIG } from '@/lib/timetable'
import { useTimetableSettingsStore } from '@/store/timetableSettings'

export interface TimeTableBaseOptions {
  filteredEvents: ComputedRef<CalendarEvent[]>
}

type Room = components['schemas']['Room']

export function useTimeTableBase(options: TimeTableBaseOptions) {
  const subjectStore = useSubjectStore()
  const timetableEventStore = useTimetableEventStore()
  const timetableSettings = useTimetableSettingsStore()

  const { filteredEvents } = options

  const events = computed<CalendarEvent[]>(() => {
    const processedEvents: CalendarEvent[] = []

    timetableEventStore.events.forEach((event) => {
      const ttaData = event.tta as any
      const subjectId = ttaData?.subject
      const eventType = ttaData?.event_type

      const subjectName = getSubjectName(subjectId)
      const subjectCode = getSubjectCode(subjectId)

      const timeIndex = Math.min(event.start_time!, timeSlots.value.length - 1)
      const startTime = timeSlots.value[timeIndex]?.from
      const endTime = calculateEndTime(startTime, event.duration!)

      const room = event.room as any as Room

      const brightnessAdjustment = eventType === 1 ? 0.9 : 1.1

      const weekType = () => {
        if (event.weeks_bitmask === null) return 'NONE'
        if (isPattern(event.weeks_bitmask!, '101010101010')) return 'A'
        if (isPattern(event.weeks_bitmask!, '010101010101')) return 'B'
        if (isPattern(event.weeks_bitmask!, '111111111111')) return 'FULL'
        if (isPattern(event.weeks_bitmask!, '000000000000')) return 'NONE'
        return 'CUSTOM'
      }

      processedEvents.push({
        id: event.id!,
        day: DAYS[event.day_of_week! - 1] ?? null,
        start_time: startTime ?? null,
        end_time: endTime,
        start_index: timeToIndex(startTime),
        title: subjectName!,
        shortcut: subjectCode!,
        color: getColorFromString(subjectName!, brightnessAdjustment),
        room_id: room?.id,
        room_name: room?.name,
        subject_id: subjectId,
        event_type: eventType,
        duration: event.duration || 1,
        weeks_bitmask: event.weeks_bitmask ?? 0,
        weekType: weekType(),
      })
    })

    return processedEvents
  })

  function getSubjectCode(subjectId?: number | null): string | null {
    if (!subjectId) return null

    const subject = subjectStore.subjects.find((s) => s.id === subjectId)
    return subject ? subject.code : null
  }

  const timeSlots = computed<TimeSlot[]>(() => {
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
  })

  const getRowEventPositions = computed<
    Map<number, { row: number; maxRows: number }>
  >(() => {
    const eventsByDay = _.groupBy(filteredEvents.value, 'day')
    const eventPositions = new Map()

    Object.entries(eventsByDay).forEach(([, dayEvents]) => {
      const sortedEvents = [...dayEvents].sort(
        (a, b) => timeToIndex(a.start_time!)! - timeToIndex(b.start_time)!,
      )

      const rows: { end_time: string; event: CalendarEvent }[][] = []

      sortedEvents.forEach((event) => {
        const startIndex = timeSlots.value.findIndex(
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
              const occupiedEndIndex = timeSlots.value.findIndex(
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

  const getDayRowPositions = computed<number[]>(() => {
    const positions: number[] = Array(DAYS.length).fill(0)
    const eventPositions = getRowEventPositions.value

    let currentTop = timetableSettings.config.HEADER_HEIGHT

    DAYS.forEach((day, index) => {
      positions[index] = currentTop

      const dayEvents = filteredEvents.value.filter((e) => e.day === day)
      let maxRows = 1

      if (dayEvents.length > 0) {
        const dayPositions = dayEvents
          .map((e) => eventPositions.get(e.id!))
          .filter(Boolean) as { row: number; maxRows: number }[]

        if (dayPositions.length > 0) {
          maxRows = eventPositions.get(dayEvents[0]!.id!)?.maxRows || 1
        }
      }

      currentTop += timetableSettings.config.CELL_HEIGHT * maxRows
    })

    return positions
  })

  function timeToIndex(time: string | null | undefined): number | null {
    if (!time) return null
    const index = timeSlots.value.findIndex((slot) => slot.from === time)
    return index >= 0 ? index : 0
  }

  function calculateEndTime(
    startTime: string | undefined,
    duration: number,
  ): string | null {
    if (!startTime) return null
    const startIndex = timeToIndex(startTime)

    if (startIndex === -1) {
      console.warn(
        `Could not find time slot for: "${startTime}". Available slots:`,
        timeSlots.value.map((slot) => slot.from),
      )
      return startTime
    }

    const endIndex = startIndex! + duration - 1
    if (endIndex >= timeSlots.value.length)
      return timeSlots.value[timeSlots.value.length - 1]!.to

    return timeSlots.value[endIndex]!.to
  }

  function getSubjectName(subjectId?: number | null): string | null {
    if (!subjectId) return null

    const subject = subjectStore.subjects.find((s) => s.id === subjectId)
    return subject ? subject.name : null
  }

  return {
    events,
    timeSlots,
    getRowEventPositions,
    getDayRowPositions,
    timeToIndex,
    calculateEndTime,
    getSubjectName,
    getSubjectCode,
  }
}
