import { useSubjectGroupStore } from '@/store/subjectGroups'
import { useSubjectStore } from '@/store/subjects'
import { CalendarEvent } from '@/types/types'
import { computed, ref, Ref } from 'vue'

export interface TimeTableFilterOptions {
  placedEvents: Ref<CalendarEvent[]>
  unplacedEvents: Ref<CalendarEvent[]>
  preferredRoom: Ref<number | undefined>
  weekFilter: Ref<any>
}

export function useTimeTableFilter(options: TimeTableFilterOptions) {
  const selectedSemester = ref<string>('LS')
  const selectedYear = ref<string>('1bc')
  const selectedSubjectGroup = ref<string | null>(null)
  const viewType = ref<string>('parallels')

  const subjectStore = useSubjectStore()
  const subjectGroupStore = useSubjectGroupStore()

  const { placedEvents, unplacedEvents, preferredRoom, weekFilter } = options

  const isSubjectInGroup = (
    subjectId: number | null,
    groupName: string | null,
  ): boolean => {
    if (!subjectId || !groupName) return true

    const matchingGroups = subjectGroupStore.subjectGroups.filter(
      (group) => group.subject === subjectId,
    )

    return matchingGroups.some((group) => group.name === groupName)
  }

  const isBachelorSubject = (code: string | null) => {
    if (!code) return true
    return code.startsWith('B-') || !code.startsWith('I-')
  }

  const isMasterSubject = (code: string | null) => {
    if (!code) return true
    return code.startsWith('I-') || !code.startsWith('B-')
  }

  const applyParallelsFilter = (item: CalendarEvent) => {
    if (!item.subject_id) return false

    const subject = subjectStore.subjects.find((s) => s.id === item.subject_id)
    if (!subject) return false

    const subjectCode = subject.code || null

    const isBachelor = selectedYear.value.includes('bc')
    const isCorrectLevel = isBachelor
      ? isBachelorSubject(subjectCode)
      : isMasterSubject(subjectCode)

    const isCorrectSemester = subject.nominal_semester === nominalSemester.value

    const isInSelectedGroup =
      !selectedSubjectGroup.value ||
      isSubjectInGroup(item.subject_id, selectedSubjectGroup.value)

    return isCorrectLevel && isCorrectSemester && isInSelectedGroup
  }

  const applyWeekPatternMatch = (event: CalendarEvent) => {
    const eventWeeksBitmask = event.weeks_bitmask || 0

    if (weekFilter.value?.exactWeekMatch) {
      // Exact match - patterns must be identical
      return eventWeeksBitmask === weekFilter.value.filterWeeksBitmask
    } else {
      // Partial match - any selected week in the filter must be present in the event
      // This is a bitwise AND to check if there's any overlap
      return (eventWeeksBitmask & weekFilter.value?.filterWeeksBitmask!) > 0
    }
  }

  const nominalSemester = computed(() => {
    const isSummer = selectedSemester.value === 'LS'

    if (selectedYear.value === '1bc') return isSummer ? 2 : 1
    if (selectedYear.value === '2bc') return isSummer ? 4 : 3
    if (selectedYear.value === '3bc') return isSummer ? 6 : 5
    if (selectedYear.value === '1i') return isSummer ? 2 : 1
    if (selectedYear.value === '2i') return isSummer ? 4 : 3

    return null
  })

  const filteredEvents = computed(() => {
    let events = placedEvents.value

    events = events.filter(applyWeekPatternMatch)

    if (viewType.value === 'parallels') {
      return events.filter(applyParallelsFilter)
    } else if (viewType.value === 'rooms') {
      if (!preferredRoom.value) {
        return []
      }
      return events.filter((event) => event.room_id === preferredRoom.value)
    }

    return events
  })

  // Update filteredEventTemplates to use the same filter approach
  const filteredEventTemplates = computed(() => {
    // Show only events with quantity > 0
    const templates = unplacedEvents.value
    // Only apply additional filtering in parallels view
    if (viewType.value === 'parallels') {
      return templates.filter(applyParallelsFilter)
    }

    // For rooms view and other views, show all unplaced events
    return templates
  })

  return {
    selectedSemester,
    selectedYear,
    selectedSubjectGroup,
    viewType,
    filteredEvents,
    filteredEventTemplates,
    nominalSemester,
  }
}
