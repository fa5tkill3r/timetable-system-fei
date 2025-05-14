<script setup lang="ts">
  import {
    ref,
    CSSProperties,
    onMounted,
    onUnmounted,
    watch,
    nextTick,
  } from 'vue'
  import { useToast } from '@/components/ui/toast'
  import { Button } from '@/components/ui/button'
  import { useI18n } from 'vue-i18n'
  import TimetableGrid from '@/components/timetables/TimetableGrid.vue'
  import { LoaderCircle } from 'lucide-vue-next'
  import {
    DAYS,
    COMPACT_TIMETABLE_CONFIG,
    DEFAULT_TIME_CONFIG,
    generateTimeSlots,
    getBaseTimetableStyles,
  } from '@/lib/timetable'

  const { t } = useI18n()

  const availabilityLevels = [
    { id: 'clear', name: 'clear', color: '#FFFFFF', value: 0, strength: null },
    { id: 'weak', name: 'weak', color: '#FFCCCC', value: 1, strength: 'WEAK' },
    {
      id: 'medium',
      name: 'medium',
      color: '#FF8080',
      value: 2,
      strength: 'MEDIUM',
    },
    {
      id: 'strong',
      name: 'strong',
      color: '#FF0000',
      value: 3,
      strength: 'STRONG',
    },
  ]

  interface AvailabilityCell {
    day: string
    timeSlot: number
    level: number
    constraintId?: number
  }

  interface TimeRangeConstraint {
    id?: number
    type: 'TIMERANGE'
    strength: 'WEAK' | 'MEDIUM' | 'STRONG'
    data: {
      day_of_week: number
      start_time: number
      duration: number
    }
    parent: number | null | undefined
    nested_children: number[] | null | undefined
  }

  const constraints = defineModel<TimeRangeConstraint[]>({
    default: () => [],
  })

  const { toast } = useToast()
  const isMouseDown = ref(false)
  const isRightMouseDown = ref(false)
  const selectedLevel = ref(availabilityLevels[1])
  const availabilityCells = ref<AvailabilityCell[]>([])
  const isResizing = ref(false)

  const timeSlots = generateTimeSlots(DEFAULT_TIME_CONFIG)
  const timetableConfig = COMPACT_TIMETABLE_CONFIG
  const days = DAYS

  defineProps({
    isUpdating: {
      type: Boolean,
      default: false,
    },
  })

  const { getHeaderStyle, getDayStyle, cornerCellStyle, containerStyle } =
    getBaseTimetableStyles(days, timeSlots, timetableConfig)

  const getCellStyle = (dayIndex: number, timeIndex: number): CSSProperties => {
    const cell = availabilityCells.value.find(
      (cell) => cell.day === days[dayIndex] && cell.timeSlot === timeIndex,
    )

    const backgroundColor = cell
      ? availabilityLevels.find((level) => level.value === cell.level)?.color ||
        '#FFFFFF'
      : '#FFFFFF'

    return {
      position: 'absolute',
      left: `${timetableConfig.DAY_COLUMN_WIDTH + timetableConfig.CELL_WIDTH * timeIndex}px`,
      top: `${timetableConfig.HEADER_HEIGHT + timetableConfig.CELL_HEIGHT * dayIndex}px`,
      width: `${timetableConfig.CELL_WIDTH}px`,
      height: `${timetableConfig.CELL_HEIGHT}px`,
      borderRight: '1px solid #e0e0e0',
      borderBottom: '1px solid #e0e0e0',
      backgroundColor,
      boxSizing: 'border-box',
      zIndex: 1,
      cursor: 'pointer',
      userSelect: 'none',
    }
  }

  function dayToIndex(day: string): number {
    return DAYS.indexOf(day)
  }

  function handleCellInteraction(dayIndex: number, timeIndex: number) {
    const day = days[dayIndex]
    const existingCellIndex = availabilityCells.value.findIndex(
      (cell) => cell.day === day && cell.timeSlot === timeIndex,
    )

    if (existingCellIndex !== -1) {
      availabilityCells.value[existingCellIndex]!.level =
        selectedLevel.value!.value
    } else if (selectedLevel.value?.value !== 0) {
      availabilityCells.value.push({
        day: day!,
        timeSlot: timeIndex,
        level: selectedLevel.value!.value,
      })
    }
  }

  function handleMouseDown(
    dayIndex: number,
    timeIndex: number,
    event: MouseEvent,
  ) {
    if (event && event.button === 2) {
      isRightMouseDown.value = true
      handleCellRightClick(dayIndex, timeIndex, false)
    } else {
      isMouseDown.value = true
      handleCellInteraction(dayIndex, timeIndex)
    }
  }

  function handleMouseOver(
    dayIndex: number,
    timeIndex: number,
    event: MouseEvent,
  ) {
    if (event && event.buttons === 2) {
      isRightMouseDown.value = true
      handleCellRightClick(dayIndex, timeIndex, false)
    } else if (isMouseDown.value) {
      handleCellInteraction(dayIndex, timeIndex)
    }
  }

  function debounce<T extends (...args: any[]) => void>(
    func: T,
    delay: number,
  ): { (...args: Parameters<T>): void; cancel: () => void } {
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const debouncedFunc = (...args: Parameters<T>) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      timeoutId = setTimeout(() => {
        if (isMouseDown.value || isRightMouseDown.value) {
          return
        }
        func(...args)
      }, delay)
    }

    debouncedFunc.cancel = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }

    return debouncedFunc
  }

  const debouncedUpdateConstraints = debounce(updateConstraintsFromCells, 2000)

  function handleMouseUp() {
    if (isMouseDown.value || isRightMouseDown.value) {
      debouncedUpdateConstraints()
    }
    isMouseDown.value = false
    isRightMouseDown.value = false
  }

  function handleCellRightClick(
    dayIndex: number,
    timeIndex: number,
    updateConstraints = true,
  ) {
    const day = days[dayIndex]
    const existingCellIndex = availabilityCells.value.findIndex(
      (cell) => cell.day === day && cell.timeSlot === timeIndex,
    )

    if (existingCellIndex !== -1) {
      availabilityCells.value.splice(existingCellIndex, 1)

      if (updateConstraints) {
        debouncedUpdateConstraints()
      }
    }
  }

  function clearAllAvailability() {
    if (confirm(t('constraints.timeRange.confirmClear'))) {
      debouncedUpdateConstraints.cancel()

      availabilityCells.value = []
      constraints.value = []

      toast({
        title: t('constraints.timeRange.cleared'),
        description: t('constraints.timeRange.clearedMessage'),
      })
    }
  }

  function updateConstraintsFromCells() {
    try {
      const constraintRanges = new Map<
        string,
        { constraint: TimeRangeConstraint; start: number; end: number }[]
      >()

      constraints.value.forEach((constraint) => {
        if (constraint.type !== 'TIMERANGE') return

        const key = `${constraint.data.day_of_week}-${constraint.strength}`

        if (!constraintRanges.has(key)) {
          constraintRanges.set(key, [])
        }

        const start = constraint.data.start_time
        const end = start + constraint.data.duration - 1

        constraintRanges.get(key)!.push({
          constraint,
          start,
          end,
        })
      })

      const groupedByDayAndStrength = availabilityCells.value.reduce(
        (acc, cell) => {
          const strength = availabilityLevels.find(
            (level) => level.value === cell.level,
          )?.strength
          if (!strength) return acc

          const dayIndex = dayToIndex(cell.day)
          const key = `${dayIndex}-${strength}`

          if (!acc[key]) {
            acc[key] = {
              dayIndex,
              strength,
              timeSlots: new Set([cell.timeSlot]),
              cells: [cell],
            }
          } else {
            acc[key].timeSlots.add(cell.timeSlot)
            acc[key].cells.push(cell)
          }
          return acc
        },
        {} as Record<
          string,
          {
            dayIndex: number
            strength: string
            timeSlots: Set<number>
            cells: AvailabilityCell[]
          }
        >,
      )

      const newConstraints: TimeRangeConstraint[] = []
      const processedOriginalRanges = new Set<string>()

      Object.values(groupedByDayAndStrength).forEach((group) => {
        const sortedSlots = Array.from(group.timeSlots).sort((a, b) => a - b)

        if (sortedSlots.length === 0) {
          return
        }

        const lookupKey = `${group.dayIndex}-${group.strength}`

        // Find continuous segments from sorted time slots
        let segments: { start: number; end: number }[] = []
        let currentSegmentStart = sortedSlots[0]!
        let currentSegmentEnd = sortedSlots[0]!

        for (let i = 1; i < sortedSlots.length; i++) {
          if (sortedSlots[i] === currentSegmentEnd + 1) {
            currentSegmentEnd = sortedSlots[i]!
          } else {
            segments.push({
              start: currentSegmentStart,
              end: currentSegmentEnd,
            })
            currentSegmentStart = sortedSlots[i]!
            currentSegmentEnd = sortedSlots[i]!
          }
        }
        segments.push({ start: currentSegmentStart, end: currentSegmentEnd })

        // Flag to track if the original ID has been used for a segment in this group (day/strength)
        // Critical for 'shrink' logic to assign original ID correctly
        let originalIdUsedForThisGroup = false

        // Sort segments by start time to ensure consistent ID assignment (eg, first segment gets priority)
        segments.sort((a, b) => a.start - b.start)

        segments.forEach((segment) => {
          const duration = segment.end - segment.start + 1
          if (duration <= 0) return // Should not happen with correct segment logic, but a safeguard

          let bestMatch:
            | {
                constraint: TimeRangeConstraint
                overlap: number
                action: 'keep' | 'extend' | 'shrink' | 'split'
              }
            | undefined

          const existingRangesForGroup = constraintRanges.get(lookupKey) || []

          for (const range of existingRangesForGroup) {
            const originalRangeKey = `${lookupKey}-${range.constraint.id}-${range.start}-${range.end}`
            if (processedOriginalRanges.has(originalRangeKey)) {
              continue // This original constraint range has already been matched
            }

            const overlapStart = Math.max(segment.start, range.start)
            const overlapEnd = Math.min(segment.end, range.end)
            const overlap =
              overlapEnd >= overlapStart ? overlapEnd - overlapStart + 1 : 0

            if (overlap === 0) continue

            let action: 'keep' | 'extend' | 'shrink' | 'split'
            if (segment.start === range.start && segment.end === range.end) {
              action = 'keep'
            } else if (
              segment.start <= range.start &&
              segment.end >= range.end
            ) {
              action = 'extend'
            } else if (
              segment.start >= range.start &&
              segment.end <= range.end
            ) {
              action = 'shrink'
            } else {
              action = 'split'
            }

            if (!bestMatch || overlap > bestMatch.overlap) {
              bestMatch = { constraint: range.constraint, overlap, action }
            }
          }

          if (bestMatch) {
            const matchedOriginalConstraint = bestMatch.constraint
            const originalConstraintData = matchedOriginalConstraint.data

            const originalRangeKey = `${lookupKey}-${matchedOriginalConstraint.id}-${originalConstraintData.start_time}-${originalConstraintData.start_time + originalConstraintData.duration - 1}`
            processedOriginalRanges.add(originalRangeKey)

            if (bestMatch.action === 'keep') {
              newConstraints.push({
                ...matchedOriginalConstraint,
                parent: undefined,
                nested_children: undefined,
              })
            } else if (bestMatch.action === 'extend') {
              newConstraints.push({
                ...matchedOriginalConstraint,
                data: {
                  ...originalConstraintData,
                  start_time: segment.start,
                  duration: duration,
                },
                parent: undefined,
                nested_children: undefined,
              })
            } else if (bestMatch.action === 'shrink') {
              const constraintStart = originalConstraintData.start_time
              if (
                !originalIdUsedForThisGroup &&
                segment.start === constraintStart
              ) {
                newConstraints.push({
                  ...matchedOriginalConstraint,
                  id: matchedOriginalConstraint.id,
                  parent: undefined,
                  nested_children: undefined,
                  data: { ...originalConstraintData, duration: duration },
                })
                if (matchedOriginalConstraint.id != null)
                  originalIdUsedForThisGroup = true
              } else if (
                !originalIdUsedForThisGroup &&
                segment.start > constraintStart
              ) {
                newConstraints.push({
                  ...matchedOriginalConstraint,
                  id: matchedOriginalConstraint.id,
                  parent: undefined,
                  nested_children: undefined,
                  data: {
                    ...originalConstraintData,
                    duration: segment.start - constraintStart,
                  },
                })
                if (matchedOriginalConstraint.id != null)
                  originalIdUsedForThisGroup = true

                newConstraints.push({
                  ...matchedOriginalConstraint,
                  id: undefined,
                  parent: undefined,
                  nested_children: undefined,
                  data: {
                    ...originalConstraintData,
                    start_time: segment.start,
                    duration: duration,
                  },
                })
              } else {
                newConstraints.push({
                  ...matchedOriginalConstraint,
                  id: undefined,
                  parent: undefined,
                  nested_children: undefined,
                  data: {
                    ...originalConstraintData,
                    start_time: segment.start,
                    duration: duration,
                  },
                })
              }
            } else if (bestMatch.action === 'split') {
              const constraintStart = originalConstraintData.start_time
              const constraintEnd =
                constraintStart + originalConstraintData.duration - 1

              if (segment.start > constraintStart) {
                newConstraints.push({
                  ...matchedOriginalConstraint,
                  id:
                    !originalIdUsedForThisGroup &&
                    matchedOriginalConstraint.id != null
                      ? matchedOriginalConstraint.id
                      : undefined,
                  parent: undefined,
                  nested_children: undefined,
                  data: {
                    ...originalConstraintData,
                    start_time: constraintStart,
                    duration: segment.start - constraintStart,
                  },
                })
                if (
                  !originalIdUsedForThisGroup &&
                  matchedOriginalConstraint.id != null
                )
                  originalIdUsedForThisGroup = true
              }

              newConstraints.push({
                ...matchedOriginalConstraint,

                id:
                  segment.start === constraintStart &&
                  !originalIdUsedForThisGroup &&
                  matchedOriginalConstraint.id != null
                    ? matchedOriginalConstraint.id
                    : undefined,
                parent: undefined,
                nested_children: undefined,
                data: {
                  ...originalConstraintData,
                  start_time: segment.start,
                  duration: duration,
                },
              })
              if (
                segment.start === constraintStart &&
                !originalIdUsedForThisGroup &&
                matchedOriginalConstraint.id != null
              )
                originalIdUsedForThisGroup = true

              if (segment.end < constraintEnd) {
                newConstraints.push({
                  ...matchedOriginalConstraint,
                  id: undefined,
                  parent: undefined,
                  nested_children: undefined,
                  data: {
                    ...originalConstraintData,
                    start_time: segment.end + 1,
                    duration: constraintEnd - segment.end,
                  },
                })
              }
            }
          } else {
            newConstraints.push({
              type: 'TIMERANGE',
              strength: group.strength as 'WEAK' | 'MEDIUM' | 'STRONG',
              data: {
                day_of_week: group.dayIndex,
                start_time: segment.start,
                duration,
              },
              id: undefined,
              parent: undefined,
              nested_children: undefined,
            })
          }
        })
      })

      const validConstraints = newConstraints.filter((c) => c.data.duration > 0)

      const sanitizedConstraints = validConstraints.map((constraint) => {
        const clean = { ...constraint }
        delete clean.parent
        delete clean.nested_children
        return clean
      })

      constraints.value = sanitizedConstraints

      nextTick(() => {})
    } catch (error) {
      console.error('Error updating constraints:', error)
      toast({
        title: t('constraints.timeRange.error') || 'Error',
        description:
          t('constraints.timeRange.errorUpdating') ||
          'Failed to update constraints',
        variant: 'destructive',
      })
    }
  }

  function initializeCellsFromConstraints() {
    const cells: AvailabilityCell[] = []

    if (!constraints.value) return

    constraints.value.forEach((constraint) => {
      if (constraint.type !== 'TIMERANGE') return

      const day = days[constraint.data.day_of_week]
      const level = availabilityLevels.find(
        (l) => l.strength === constraint.strength,
      )?.value

      if (!day || level === undefined) return

      for (let i = 0; i < constraint.data.duration; i++) {
        const timeSlot = constraint.data.start_time + i
        cells.push({
          day,
          timeSlot,
          level,
          constraintId: constraint.id,
        })
      }
    })

    availabilityCells.value = cells
  }

  watch(
    () => constraints.value,
    () => {
      initializeCellsFromConstraints()
    },
    { deep: true },
  )

  onMounted(() => {
    initializeCellsFromConstraints()
  })

  onUnmounted(() => {
    debouncedUpdateConstraints.cancel()
  })
</script>

<template>
  <div
    class="mx-auto flex flex-col p-6"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
  >
    <h1 class="mb-6 text-2xl font-bold">
      {{ $t('constraints.timeRange.title') }}
    </h1>

    <div class="mb-6">
      <h2 class="mb-2 text-lg font-semibold">
        {{ $t('constraints.timeRange.selectLevel') }}
      </h2>
      <div class="mb-4 flex gap-4">
        <Button
          v-for="level in availabilityLevels"
          :key="level.id"
          :variant="selectedLevel?.id === level.id ? 'default' : 'outline'"
          class="flex items-center gap-2"
          :style="{
            backgroundColor:
              level.id !== 'clear' && selectedLevel?.id === level.id
                ? level.color
                : undefined,
            color:
              level.id !== 'clear' && selectedLevel?.id === level.id
                ? level.id === 'strong'
                  ? '#fff'
                  : '#000'
                : undefined,
          }"
          @click="selectedLevel = level"
        >
          <div
            class="h-4 w-4 rounded border border-gray-300"
            :style="{
              backgroundColor: level.color,
              borderColor: level.id === 'clear' ? '#e0e0e0' : 'rgba(0,0,0,0.2)',
            }"
          ></div>
          {{ $t(`constraints.timeRange.levels.${level.name}`) }}
        </Button>
      </div>

      <div class="mb-4 flex justify-between">
        <div>
          <p class="text-sm text-gray-500">
            {{ $t('constraints.timeRange.instructions') }}
          </p>
        </div>
        <div class="space-x-2">
          <Button
            variant="outline"
            @click="clearAllAvailability"
            >{{ $t('constraints.timeRange.clearAll') }}</Button
          >
        </div>
      </div>
    </div>

    <div class="relative h-[calc(100vh-300px)] select-none">
      <TimetableGrid
        :days="days"
        :time-slots="timeSlots"
        :get-cell-style="getCellStyle"
        :get-header-style="getHeaderStyle"
        :get-day-style="getDayStyle"
        :corner-cell-style="cornerCellStyle"
        :container-style="containerStyle"
        :is-resizing="isResizing"
        @cell-mouse-down="handleMouseDown"
        @cell-mouse-over="handleMouseOver"
        @mouse-leave="handleMouseUp"
        :compact="true"
        :class="{ 'pointer-events-none': isUpdating }"
      />

      <div
        v-if="isUpdating"
        class="absolute left-0 top-0 z-10 flex items-center justify-center bg-white/60"
        :style="{
          width: `${timetableConfig.DAY_COLUMN_WIDTH + timeSlots.length * timetableConfig.CELL_WIDTH}px`,
          height: `${timetableConfig.HEADER_HEIGHT + days.length * timetableConfig.CELL_HEIGHT}px`,
        }"
      >
        <div class="flex flex-col items-center">
          <LoaderCircle class="h-8 w-8 animate-spin text-primary" />
          <span class="mt-2 text-sm font-medium text-gray-700">{{
            $t('saving')
          }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
