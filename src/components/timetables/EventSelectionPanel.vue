<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted } from 'vue'
  import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
  } from '@/components/ui/tabs'
  import { Input } from '@/components/ui/input'
  import { Badge } from '@/components/ui/badge'
  import { Trash2, X as XIcon } from 'lucide-vue-next'
  import { useTTEventTypeStore } from '@/store/ttEventTypes'
  import { getColorFromString } from '@/lib/utils'
  import { Button } from '@/components/ui/button'
  import ComboBoxFilter, {
    RoomFilterOption,
  } from '@/components/common/ComboBoxFilter.vue'
  import { useSubjectGroupStore } from '@/store/subjectGroups'
  import { useSubjectStore } from '@/store/subjects'
  import { components } from '@/types/schema'
  import type { CalendarEvent } from '@/types/types'

  type EventType = components['schemas']['TTEventType']
  interface UnplacedEvent extends CalendarEvent {
    quantity: number
  }

  const props = defineProps<{
    eventTemplates: CalendarEvent[]
    isLoading: boolean
  }>()

  const emit = defineEmits<{
    dragStart: [event: DragEvent, template: CalendarEvent]
    dragEnd: []
    menuDragOver: [event: DragEvent]
    menuDragLeave: []
    menuDrop: [event: DragEvent]
  }>()

  const isOverMenu = ref(false)
  const searchQuery = ref('')
  const ttEventTypeStore = useTTEventTypeStore()
  const subjectGroupStore = useSubjectGroupStore()

  const selectedEventTypeIds = ref<(string | number)[]>([])
  const selectedGroupIds = ref<(string | number)[]>([])

  const eventTypeOptions = computed(() => {
    return ttEventTypeStore.eventTypes.map(
      (type: EventType) =>
        ({
          label: type.name,
          value: type.id,
        }) as RoomFilterOption,
    )
  })

  const groupOptions = computed(() => {
    const groupsSet = new Set<string>()
    const options: { label: string; value: string }[] = []

    const subjectIds = new Set<number>()
    props.eventTemplates.forEach((template) => {
      if (template.subject_id) {
        subjectIds.add(template.subject_id)
      }
    })

    subjectIds.forEach((subjectId) => {
      const groups = subjectGroupStore.getGroupsBySubject(subjectId)
      groups.forEach((group) => {
        if (group.name && !groupsSet.has(group.name)) {
          groupsSet.add(group.name)
          options.push({
            label: group.name,
            value: group.name,
          })
        }
      })
    })

    return options
  })

  const isFiltered = computed(
    () =>
      searchQuery.value.trim() !== '' ||
      selectedEventTypeIds.value.length > 0 ||
      selectedGroupIds.value.length > 0,
  )

  function getSubjectGroups(subjectId: number | null | undefined) {
    if (!subjectId) return []
    return subjectGroupStore.getGroupsBySubject(subjectId)
  }

  const groupedEvents = computed(() => {
    const groups = new Map<string, UnplacedEvent>()

    props.eventTemplates.forEach((event) => {
      const key = `${event.title}_${event.event_type}`

      if (groups.has(key)) {
        const existingEvent = groups.get(key)!
        existingEvent.quantity += 1
      } else {
        groups.set(key, {
          ...event,
          quantity: 1,
        } as UnplacedEvent)
      }
    })

    return Array.from(groups.values())
  })

  const filteredEventTemplates = computed(() => {
    let filtered = groupedEvents.value.filter(
      (template) => (template.quantity || 0) > 0,
    )

    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase()
      filtered = filtered.filter((template) =>
        template.title.toLowerCase().includes(query),
      )
    }

    if (selectedEventTypeIds.value.length > 0) {
      filtered = filtered.filter(
        (template) =>
          template.event_type &&
          selectedEventTypeIds.value.includes(template.event_type),
      )
    }

    if (selectedGroupIds.value.length > 0) {
      filtered = filtered.filter((template) => {
        if (!template.subject_id) return false

        const groups = getSubjectGroups(template.subject_id)
        return groups.some(
          (group) => group.name && selectedGroupIds.value.includes(group.name),
        )
      })
    }

    return filtered
  })

  function resetFilters() {
    searchQuery.value = ''
    selectedEventTypeIds.value = []
    selectedGroupIds.value = []
  }

  function getEventTypeLabel(eventType: number | null): string {
    if (!eventType) return 'Other'

    const eventTypeObj = eventType
      ? ttEventTypeStore.getEventTypeById(eventType)
      : null
    return eventTypeObj?.name || `Type ${eventType}`
  }

  function handleDragStart(event: DragEvent, template: CalendarEvent) {
    emit('dragStart', event, template)
  }

  function handleDragEnd() {
    emit('dragEnd')
  }

  function handleMenuDragOver(event: DragEvent) {
    isOverMenu.value = true
    emit('menuDragOver', event)
  }

  function handleMenuDragLeave(event: DragEvent) {
    const relatedTarget = event.relatedTarget as HTMLElement | null
    const currentTarget = event.currentTarget as HTMLElement

    if (!currentTarget.contains(relatedTarget)) {
      isOverMenu.value = false
      emit('menuDragLeave')
    }
  }

  function handleMenuDrop(event: DragEvent) {
    isOverMenu.value = false
    emit('menuDrop', event)
  }

  function getAdjustedColor(template: CalendarEvent): string {
    if (template.color) return template.color

    const brightnessAdjustment = template.event_type === 1 ? 0.9 : 1.1
    return getColorFromString(template.title, 'pastel', brightnessAdjustment)
  }

  const isCompactMode = ref(false)
  const containerRef = ref<HTMLElement | null>(null)
  let resizeObserver: ResizeObserver | null = null

  onMounted(() => {
    if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          isCompactMode.value = entry.contentRect.width < 220
        }
      })

      resizeObserver.observe(containerRef.value)
    }
  })

  onUnmounted(() => {
    if (resizeObserver) {
      resizeObserver.disconnect()
    }
  })
</script>

<template>
  <!-- Event selection panel -->
  <div
    ref="containerRef"
    class="relative h-full bg-white p-4"
    :class="{ 'bg-gray-50': isOverMenu }"
    @dragover="handleMenuDragOver"
    @dragleave="handleMenuDragLeave"
    @drop="handleMenuDrop"
  >
    <Tabs
      default-value="events"
      class="h-full"
    >
      <!-- Hide tabs when in compact mode -->
      <TabsList
        v-if="!isCompactMode"
        class="w-full"
      >
        <TabsTrigger
          value="events"
          class="w-full"
          >{{ $t('timetable.editor.eventSelection.title') }}</TabsTrigger
        >
        <TabsTrigger
          value="requirements"
          class="w-full"
          >{{ $t('timetable.editor.eventSelection.requirements') }}
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value="events"
        class="h-[calc(100%-40px)] overflow-y-auto"
        :class="{ 'h-full': isCompactMode }"
      >
        <div
          v-if="!isCompactMode"
          class="mb-4 flex items-center justify-between"
        >
          <h3 class="text-lg font-semibold">
            {{ $t('timetable.editor.eventSelection.title') }}
          </h3>
          <Badge>{{ filteredEventTemplates.length }}</Badge>
        </div>

        <div
          v-if="!isCompactMode"
          class="mb-4 space-y-2"
        >
          <Input
            v-model="searchQuery"
            type="text"
            class="w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
            :placeholder="$t('timetable.editor.eventSelection.search')"
          />

          <div class="flex flex-wrap gap-2">
            <ComboBoxFilter
              :title="$t('timetable.editor.eventSelection.type')"
              :options="eventTypeOptions"
              v-model="selectedEventTypeIds"
              class="h-8"
            />

            <ComboBoxFilter
              :title="$t('timetable.editor.eventSelection.group')"
              :options="groupOptions"
              v-model="selectedGroupIds"
              class="h-8"
            />

            <Button
              v-if="isFiltered"
              variant="ghost"
              size="sm"
              class="h-8"
              @click="resetFilters"
            >
              {{ $t('reset') }}
              <XIcon class="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        <div class="space-y-3">
          <div
            v-for="template in filteredEventTemplates"
            :key="`${template.title}_${template.event_type}`"
            v-show="(template.quantity || 0) > 0"
            class="group relative cursor-move rounded-lg p-2"
            :class="{ 'p-3': !isCompactMode }"
            :style="{ backgroundColor: getAdjustedColor(template) }"
            draggable="true"
            @dragstart="handleDragStart($event, template)"
            @dragend="handleDragEnd"
          >
            <div class="truncate font-medium">
              <span class="font-semibold">{{ template.shortcut || '' }}</span>

              <span
                v-if="!isCompactMode"
                class="ml-1"
                >- {{ template.title }}</span
              >
            </div>

            <div
              class="space-y-0.5 text-gray-600"
              :class="{ 'text-xs': isCompactMode, 'text-sm': !isCompactMode }"
            >
              <div class="truncate">
                {{ getEventTypeLabel(template.event_type ?? null) }}
              </div>
              <div class="truncate">
                {{ $t('timetable.editor.eventSelection.duration') }}:
                {{ template.duration || 1 }}h
              </div>
              <div class="truncate">
                {{ $t('timetable.editor.eventSelection.remaining') }}:
                {{ template.quantity || 0 }}
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="filteredEventTemplates.length === 0"
          class="py-8 text-center text-muted-foreground"
        >
          {{ $t('timetable.editor.eventSelection.nothingFound') }}
        </div>

        <div
          v-if="isLoading"
          class="flex justify-center py-4"
        >
          <div
            class="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
          ></div>
        </div>

        <div
          v-if="isOverMenu && isLoading === false"
          class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded border-2 border-dashed border-blue-500 bg-blue-50 bg-opacity-50"
        >
          <div class="flex items-center text-blue-600">
            <Trash2 class="mr-2 h-5 w-5" />
            <span>{{
              $t('timetable.editor.eventSelection.dropToRemove')
            }}</span>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="requirements">
        <div class="space-y-4 pt-2">
          <h3 class="text-lg font-semibold">
            {{ $t('timetable.editor.eventSelection.requirements') }}
          </h3>
          <div class="text-sm text-muted-foreground">
            {{ $t('timetable.editor.eventSelection.requirementsTodo') }}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  </div>
</template>
