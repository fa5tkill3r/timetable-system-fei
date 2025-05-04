<script setup lang="ts">
import { ref, CSSProperties, onMounted, onUnmounted, watch } from 'vue'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import TimetableGrid from '@/components/timetables/TimetableGrid.vue'
import {
    DAYS,
    COMPACT_TIMETABLE_CONFIG,
    DEFAULT_TIME_CONFIG,
    generateTimeSlots,
    getBaseTimetableStyles
} from '@/utils/timetable'

const availabilityLevels = [
    { id: 'clear', name: 'Clear', color: '#FFFFFF', value: 0, strength: null },
    { id: 'weak', name: 'Weak', color: '#FFCCCC', value: 1, strength: 'WEAK' },
    { id: 'normal', name: 'Normal', color: '#FF8080', value: 2, strength: 'NORMAL' },
    { id: 'strong', name: 'Strong', color: '#FF0000', value: 3, strength: 'STRONG' }
]

interface AvailabilityCell {
    day: string
    timeSlot: number
    level: number
}

// Interface for constraint model
interface TimeRangeConstraint {
    type: 'TIMERANGE',
    strength: 'WEAK' | 'NORMAL' | 'STRONG',
    data: {
        day_of_week: number,
        start_time: number,
        duration: number
    }
}

const constraints = defineModel<TimeRangeConstraint[]>({
    default: () => []
});

const { toast } = useToast()
const isMouseDown = ref(false)
const isRightMouseDown = ref(false)
const selectedLevel = ref(availabilityLevels[1])
const availabilityCells = ref<AvailabilityCell[]>([])
const isResizing = ref(false)

const timeSlots = generateTimeSlots(DEFAULT_TIME_CONFIG)
const timetableConfig = COMPACT_TIMETABLE_CONFIG
const days = DAYS

const { getHeaderStyle, getDayStyle, cornerCellStyle, containerStyle } = getBaseTimetableStyles(
    days,
    timeSlots,
    timetableConfig
)

const getCellStyle = (dayIndex: number, timeIndex: number): CSSProperties => {
    const cell = availabilityCells.value.find(
        cell => cell.day === days[dayIndex] && cell.timeSlot === timeIndex
    )

    const backgroundColor = cell
        ? availabilityLevels.find(level => level.value === cell.level)?.color || '#FFFFFF'
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
    return DAYS.indexOf(day);
}

function handleCellInteraction(dayIndex: number, timeIndex: number) {
    const day = days[dayIndex]
    const existingCellIndex = availabilityCells.value.findIndex(
        cell => cell.day === day && cell.timeSlot === timeIndex
    )

    if (existingCellIndex !== -1) {
        availabilityCells.value[existingCellIndex]!.level = selectedLevel.value!.value
    } else if (selectedLevel.value?.value !== 0) {
        availabilityCells.value.push({
            day: day!,
            timeSlot: timeIndex,
            level: selectedLevel.value!.value
        })
    }
}

function handleMouseDown(dayIndex: number, timeIndex: number, event: MouseEvent) {
    if (event && event.button === 2) {
        isRightMouseDown.value = true
        handleCellRightClick(dayIndex, timeIndex, false)
    } else {
        isMouseDown.value = true
        handleCellInteraction(dayIndex, timeIndex)
    }
}

function handleMouseOver(dayIndex: number, timeIndex: number, event: MouseEvent) {
    if (event && event.buttons === 2) {
        isRightMouseDown.value = true
        handleCellRightClick(dayIndex, timeIndex, false)
    } else if (isMouseDown.value) {
        handleCellInteraction(dayIndex, timeIndex)
    }
}

function handleMouseUp() {
    if (isMouseDown.value || isRightMouseDown.value) {
        updateConstraintsFromCells();
    }
    isMouseDown.value = false
    isRightMouseDown.value = false
}

function handleCellRightClick(dayIndex: number, timeIndex: number, updateConstraints = true) {
    const day = days[dayIndex]
    const existingCellIndex = availabilityCells.value.findIndex(
        cell => cell.day === day && cell.timeSlot === timeIndex
    )

    if (existingCellIndex !== -1) {
        availabilityCells.value.splice(existingCellIndex, 1)

        if (updateConstraints) {
            updateConstraintsFromCells();
        }
    }
}

function clearAllAvailability() {
    if (confirm("Are you sure you want to clear all availability markings?")) {
        availabilityCells.value = []
        constraints.value = []
        toast({
            title: "Cleared",
            description: "All availability markings have been cleared."
        })
    }
}

function updateConstraintsFromCells() {
    const groupedCells = availabilityCells.value.reduce((acc, cell) => {
        const strength = availabilityLevels.find(level => level.value === cell.level)?.strength;
        if (!strength) return acc;

        const dayIndex = dayToIndex(cell.day);
        const key = `${dayIndex}-${strength}`;

        if (!acc[key]) {
            acc[key] = {
                dayIndex,
                strength,
                timeSlots: [cell.timeSlot]
            };
        } else {
            acc[key].timeSlots.push(cell.timeSlot);
        }

        return acc;
    }, {} as Record<string, { dayIndex: number, strength: string, timeSlots: number[] }>);

    const newConstraints: TimeRangeConstraint[] = [];

    Object.values(groupedCells).forEach(group => {
        const sortedSlots = [...group.timeSlots].sort((a, b) => a - b);

        let start = sortedSlots[0];
        let end = start;

        for (let i = 1; i < sortedSlots.length; i++) {
            if (sortedSlots[i] === end + 1) {
                end = sortedSlots[i];
            } else {
                newConstraints.push({
                    type: 'TIMERANGE',
                    strength: group.strength as 'WEAK' | 'NORMAL' | 'STRONG',
                    data: {
                        day_of_week: group.dayIndex,
                        start_time: start,
                        duration: end - start + 1
                    }
                });

                start = sortedSlots[i];
                end = start;
            }
        }

        newConstraints.push({
            type: 'TIMERANGE',
            strength: group.strength as 'WEAK' | 'NORMAL' | 'STRONG',
            data: {
                day_of_week: group.dayIndex,
                start_time: start,
                duration: end - start + 1
            }
        });
    });

    constraints.value = newConstraints;
}

function initializeCellsFromConstraints() {
    const cells: AvailabilityCell[] = [];

    if (!constraints.value) return;

    constraints.value.forEach(constraint => {
        if (constraint.type !== 'TIMERANGE') return;

        const day = days[constraint.data.day_of_week];
        const level = availabilityLevels.find(l => l.strength === constraint.strength)?.value;

        if (!day || level === undefined) return;

        for (let i = 0; i < constraint.data.duration; i++) {
            const timeSlot = constraint.data.start_time + i;
            cells.push({
                day,
                timeSlot,
                level
            });
        }
    });

    availabilityCells.value = cells;
}

watch(() => constraints.value, () => {
    initializeCellsFromConstraints();
}, { deep: true });

onMounted(() => {
    initializeCellsFromConstraints();
});
</script>

<template>
    <div class="flex flex-col mx-auto p-6" @mouseup="handleMouseUp" @mouseleave="handleMouseUp">
        <h1 class="text-2xl font-bold mb-6">Time Range Select</h1>

        <div class="mb-6">
            <h2 class="text-lg font-semibold mb-2">Select Unavailability Level:</h2>
            <div class="flex gap-4 mb-4">
                <Button v-for="level in availabilityLevels" :key="level.id"
                    :variant="selectedLevel?.id === level.id ? 'default' : 'outline'" class="flex items-center gap-2"
                    :style="{
                        backgroundColor: level.id !== 'clear' && selectedLevel?.id === level.id ? level.color : undefined,
                        color: level.id !== 'clear' && selectedLevel?.id === level.id
                            ? (level.id === 'strong' ? '#fff' : '#000')
                            : undefined
                    }" @click="selectedLevel = level">
                    <div class="w-4 h-4 rounded border border-gray-300" :style="{
                        backgroundColor: level.color,
                        borderColor: level.id === 'clear' ? '#e0e0e0' : 'rgba(0,0,0,0.2)'
                    }"></div>
                    {{ level.name }}
                </Button>
            </div>

            <div class="flex justify-between mb-4">
                <div>
                    <p class="text-sm text-gray-500">
                        Click and drag to mark your unavailability. Use different colors to indicate the level of
                        unavailability.
                    </p>
                </div>
                <div class="space-x-2">
                    <Button variant="outline" @click="clearAllAvailability">Clear All</Button>
                </div>
            </div>
        </div>

        <div class="h-[calc(100vh-300px)] select-none">
            <TimetableGrid :days="days" :time-slots="timeSlots" :get-cell-style="getCellStyle"
                :get-header-style="getHeaderStyle" :get-day-style="getDayStyle" :corner-cell-style="cornerCellStyle"
                :container-style="containerStyle" :is-resizing="isResizing" @cell-mouse-down="handleMouseDown"
                @cell-mouse-over="handleMouseOver" @mouse-leave="handleMouseUp" :compact=true />
        </div>
    </div>
</template>
