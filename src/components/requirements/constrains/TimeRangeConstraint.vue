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
    constraintId?: number // Add ID to track which constraint this cell belongs to
}

// Interface for constraint model
interface TimeRangeConstraint {
    id?: number, // Make ID optional since new constraints won't have one
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
    // Track constraints by their IDs to preserve them when possible
    const constraintsById = new Map(
        constraints.value.filter(c => c.id !== undefined).map(c => [c.id!, c])
    );

    // Map constraints by day, strength, and position to efficiently find them
    const existingConstraintMap = new Map<string, TimeRangeConstraint>();

    // Map to track constraint ranges by day and strength
    const constraintRanges = new Map<string, { constraint: TimeRangeConstraint, start: number, end: number }[]>();

    // First, build a map of existing constraints for easy lookup
    constraints.value.forEach(constraint => {
        if (constraint.type !== 'TIMERANGE') return;

        const key = `${constraint.data.day_of_week}-${constraint.strength}`;

        // Initialize the ranges map for this key if needed
        if (!constraintRanges.has(key)) {
            constraintRanges.set(key, []);
        }

        const start = constraint.data.start_time;
        const end = start + constraint.data.duration - 1;

        // Add this constraint's range
        constraintRanges.get(key)!.push({
            constraint,
            start,
            end
        });

        // Map each position to the constraint
        for (let i = 0; i < constraint.data.duration; i++) {
            const position = start + i;
            existingConstraintMap.set(`${key}-${position}`, constraint);
        }
    });

    // Group cells by day and strength
    const groupedByDayAndStrength = availabilityCells.value.reduce((acc, cell) => {
        const strength = availabilityLevels.find(level => level.value === cell.level)?.strength;
        if (!strength) return acc;

        const dayIndex = dayToIndex(cell.day);
        const key = `${dayIndex}-${strength}`;

        if (!acc[key]) {
            acc[key] = {
                dayIndex,
                strength,
                timeSlots: new Set([cell.timeSlot]),
                cells: [cell]
            };
        } else {
            acc[key].timeSlots.add(cell.timeSlot);
            acc[key].cells.push(cell);
        }

        return acc;
    }, {} as Record<string, {
        dayIndex: number,
        strength: string,
        timeSlots: Set<number>,
        cells: AvailabilityCell[]
    }>);

    const newConstraints: TimeRangeConstraint[] = [];
    const processedRanges = new Set<string>();

    // Process each group to find segments and handle gaps
    Object.values(groupedByDayAndStrength).forEach(group => {
        const sortedSlots = Array.from(group.timeSlots).sort((a, b) => a - b);
        const lookupKey = `${group.dayIndex}-${group.strength}`;

        // Find continuous segments - this correctly identifies gaps when middle slots are removed
        let segments: { start: number; end: number; cells: number[] }[] = [];
        let start = sortedSlots[0];
        let end = start;
        let currentCells = [start];

        for (let i = 1; i < sortedSlots.length; i++) {
            if (sortedSlots[i] === end + 1) {
                // Continuous - extend segment
                end = sortedSlots[i];
                currentCells.push(sortedSlots[i]);  // Push the actual value not 'end'
            } else {
                // Gap - finish segment and start a new one
                segments.push({ start, end, cells: [...currentCells] });
                start = sortedSlots[i];
                end = start;
                currentCells = [start];
            }
        }
        // Add final segment
        segments.push({ start, end, cells: [...currentCells] });

        // Track if we've already used the original constraint ID for patching
        let originalIdUsed = false;

        // Sort segments by start time to ensure the first segment gets the original ID
        segments.sort((a, b) => a.start - b.start);

        // Find optimal operations for each segment
        segments.forEach(segment => {
            const duration = segment.end - segment.start + 1;

            // Try to match with an existing constraint
            let bestMatch: {
                constraint: TimeRangeConstraint,
                overlap: number,
                action: 'keep' | 'extend' | 'shrink' | 'split'
            } | undefined;

            // Get existing ranges for this day and strength
            const existingRanges = constraintRanges.get(lookupKey) || [];

            for (const range of existingRanges) {
                // Skip already processed ranges
                const rangeId = `${lookupKey}-${range.constraint.id}-${range.start}-${range.end}`;
                if (processedRanges.has(rangeId)) continue;

                // Calculate overlap
                const overlapStart = Math.max(segment.start, range.start);
                const overlapEnd = Math.min(segment.end, range.end);
                const overlap = overlapEnd >= overlapStart ? overlapEnd - overlapStart + 1 : 0;

                let action: 'keep' | 'extend' | 'shrink' | 'split' = 'keep';

                if (segment.start === range.start && segment.end === range.end) {
                    action = 'keep'; // Perfect match
                } else if (segment.start <= range.start && segment.end >= range.end) {
                    action = 'extend'; // Segment fully contains range
                } else if (segment.start >= range.start && segment.end <= range.end) {
                    action = 'shrink'; // Range fully contains segment
                } else if (overlap > 0) {
                    action = 'split'; // Partial overlap
                }

                // Choose the best match based on overlap
                if (overlap > 0 && (!bestMatch || overlap > bestMatch.overlap)) {
                    bestMatch = { constraint: range.constraint, overlap, action };
                }
            }

            if (bestMatch) {
                const constraint = bestMatch.constraint;
                const rangeId = `${lookupKey}-${constraint.id}-${constraint.data.start_time}-${constraint.data.start_time + constraint.data.duration - 1}`;
                processedRanges.add(rangeId);

                // Handle different match types
                if (bestMatch.action === 'keep') {
                    // Keep existing constraint unchanged
                    // Remove parent to prevent circular references
                    const cleanConstraint = { ...constraint };
                    if ('parent' in cleanConstraint) delete cleanConstraint.parent;
                    if ('nested_children' in cleanConstraint) delete cleanConstraint.nested_children;

                    newConstraints.push(cleanConstraint);
                } else if (bestMatch.action === 'extend') {
                    // Create extended constraint
                    newConstraints.push({
                        ...constraint,
                        data: {
                            ...constraint.data,
                            start_time: segment.start,
                            duration: duration
                        },
                        // Remove parent/children references
                        parent: undefined,
                        nested_children: undefined
                    });
                } else if (bestMatch.action === 'shrink') {
                    const constraint = bestMatch.constraint;
                    const constraintStart = constraint.data.start_time;
                    const constraintEnd = constraintStart + constraint.data.duration - 1;

                    if (!originalIdUsed && segment.start === constraintStart) {
                        // This is the first segment, keep original ID
                        newConstraints.push({
                            ...constraint,
                            id: constraint.id, // Explicitly preserve ID
                            parent: undefined,
                            nested_children: undefined,
                            data: {
                                ...constraint.data,
                                duration: duration
                            }
                        });
                        originalIdUsed = true;
                    } else if (!originalIdUsed && segment.start > constraintStart) {
                        // First part gets the original constraint ID
                        newConstraints.push({
                            ...constraint,
                            id: constraint.id, // Keep original ID
                            parent: undefined,
                            nested_children: undefined,
                            data: {
                                ...constraint.data,
                                duration: segment.start - constraintStart
                            }
                        });
                        originalIdUsed = true;

                        // Now add the current segment as a new constraint
                        newConstraints.push({
                            ...constraint,
                            id: undefined, // New constraint needs new ID
                            parent: undefined,
                            nested_children: undefined,
                            data: {
                                ...constraint.data,
                                start_time: segment.start,
                                duration: duration
                            }
                        });
                    } else {
                        // This is a later segment or ID already used, create new constraint
                        newConstraints.push({
                            ...constraint,
                            id: undefined, // New constraint for POST
                            parent: undefined,
                            nested_children: undefined,
                            data: {
                                ...constraint.data,
                                start_time: segment.start,
                                duration: duration
                            }
                        });
                    }
                    // We've handled this segment completely
                    return;
                } else if (bestMatch.action === 'split') {
                    // Handle partial overlap more efficiently
                    const constraintStart = constraint.data.start_time;
                    const constraintEnd = constraintStart + constraint.data.duration - 1;

                    // Keep original constraint for the first part (PATCH)
                    if (segment.start > constraintStart) {
                        newConstraints.push({
                            ...constraint, // Keep original ID
                            parent: undefined,
                            nested_children: undefined,
                            data: {
                                ...constraint.data,
                                duration: segment.start - constraintStart
                            }
                        });
                    }

                    // For the segment itself (if needed)
                    newConstraints.push({
                        ...constraint,
                        // Keep original ID if this is at the beginning of the original constraint
                        id: segment.start <= constraintStart ? constraint.id : undefined,
                        parent: undefined,
                        nested_children: undefined,
                        data: {
                            ...constraint.data,
                            start_time: segment.start,
                            duration: duration
                        }
                    });

                    // For the part after the segment (if needed)
                    if (segment.end < constraintEnd) {
                        newConstraints.push({
                            ...constraint,
                            id: undefined, // New constraint (POST)
                            parent: undefined,
                            nested_children: undefined,
                            data: {
                                ...constraint.data,
                                start_time: segment.end + 1,
                                duration: constraintEnd - segment.end
                            }
                        });
                    }
                }
            } else {
                // Create brand new constraint for this segment
                newConstraints.push({
                    type: 'TIMERANGE',
                    strength: group.strength as 'WEAK' | 'NORMAL' | 'STRONG',
                    data: {
                        day_of_week: group.dayIndex,
                        start_time: segment.start,
                        duration
                    }
                });
            }
        });
    });

    // Add this before updating constraints.value
    const sanitizedConstraints = newConstraints.map(constraint => {
        // Create a clean copy without circular references
        const clean = { ...constraint };
        if ('parent' in clean) delete clean.parent;
        if ('nested_children' in clean) delete clean.nested_children;
        return clean;
    });

    // Update the constraints model with our sanitized list
    constraints.value = sanitizedConstraints;
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
                level,
                constraintId: constraint.id // Store the constraint ID with the cell
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
