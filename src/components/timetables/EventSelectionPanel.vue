<script setup lang="ts">
import { ref, computed } from 'vue'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Trash2 } from 'lucide-vue-next'
import { useTimetableEventStore } from '@/store/timetableEvents'
import { useTTEventTypeStore } from '@/store/ttEventTypes'
import { getColorFromString } from '@/lib/utils'

interface EventTemplate {
  id: string
  title: string
  duration: number
  color: string
  quantity: number
  subjectId?: number | null
  originalEventId?: number | null
  eventType?: number | null
}

const props = defineProps<{
  eventTemplates: EventTemplate[]
  isLoading: boolean
}>()

const emit = defineEmits<{
  'dragStart': [event: DragEvent, template: EventTemplate]
  'dragEnd': []
  'menuDragOver': [event: DragEvent]
  'menuDragLeave': []
  'menuDrop': [event: DragEvent]
}>()

const isOverMenu = ref(false)
const searchQuery = ref('')
const ttEventTypeStore = useTTEventTypeStore()

const filteredEventTemplates = computed(() =>
  props.eventTemplates.filter((template) =>
    template.title.toLowerCase().includes(searchQuery.value.toLowerCase()) &&
    template.quantity > 0
  )
)

function getEventTypeLabel(eventType: number | null): string {
  if (!eventType) return 'Other';
  
  const eventTypeObj = eventType ? ttEventTypeStore.getEventTypeById(eventType) : null;
  return eventTypeObj?.name || `Type ${eventType}`;
}

function handleDragStart(event: DragEvent, template: EventTemplate) {
  emit('dragStart', event, template)
}

function handleDragEnd() {
  emit('dragEnd')
}

function handleMenuDragOver(event: DragEvent) {
  isOverMenu.value = true
  emit('menuDragOver', event)
}

function handleMenuDragLeave() {
  isOverMenu.value = false
  emit('menuDragLeave')
}

function handleMenuDrop(event: DragEvent) {
  emit('menuDrop', event)
}

function getAdjustedColor(template: EventTemplate): string {
  // Use more subtle brightness adjustment
  const brightnessAdjustment = template.eventType === 1 ? 0.9 : 1.1
  return getColorFromString(template.title, 'pastel', brightnessAdjustment)
}
</script>

<template>
  <!-- Event selection panel -->
  <div class="h-full bg-white p-4" :class="{ 'bg-gray-50': isOverMenu }" @dragover="handleMenuDragOver"
    @dragleave="handleMenuDragLeave" @drop="handleMenuDrop">

    <Tabs default-value="events" class="h-full">
      <TabsList class="w-full">
        <TabsTrigger value="events" class="w-full">Unplaced Events</TabsTrigger>
        <TabsTrigger value="requirements" class="w-full">Requirements</TabsTrigger>
      </TabsList>

      <TabsContent value="events" class="h-[calc(100%-40px)] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold">Unplaced Events</h3>
          <Badge>{{ filteredEventTemplates.length }}</Badge>
        </div>

        <Input v-model="searchQuery" type="text" class="mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Search events..." />

        <div class="space-y-3">
          <div v-for="template in filteredEventTemplates" :key="template.id" v-show="template.quantity > 0"
            class="p-3 rounded-lg cursor-move relative group" :style="{ backgroundColor: getAdjustedColor(template) }"
            draggable="true" @dragstart="handleDragStart($event, template)" @dragend="handleDragEnd">
            <div class="font-medium">{{ template.title }}</div>
            <div class="flex justify-between items-center text-sm text-gray-600">
              <span>{{ getEventTypeLabel(template.eventType) }}</span>
              <span>Duration: {{ template.duration }}h</span>
            </div>
            <div class="text-sm text-gray-600 mt-1">
              <span class="ml-auto">Remaining: {{ template.quantity }}</span>
            </div>
            <div v-if="template.originalEventId" class="text-xs text-gray-500 mt-1">
              ID: {{ template.originalEventId }}
            </div>
          </div>
        </div>

        <div v-if="filteredEventTemplates.length === 0" class="text-center py-8 text-muted-foreground">
          No unplaced events found.
        </div>

        <div v-if="eventTemplates.length === 0 && !isLoading"
          class="mb-4 text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
          No unplaced events found. Check if events exist in the timetable.
        </div>

        <div v-if="isLoading" class="flex justify-center py-4">
          <div class="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>

        <div v-if="isOverMenu"
          class="absolute inset-0 border-2 border-dashed border-blue-500 bg-blue-50 bg-opacity-50 rounded pointer-events-none flex items-center justify-center">
          <div class="flex items-center text-blue-600">
            <Trash2 class="w-5 h-5 mr-2" />
            <span>Drop to remove event</span>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="requirements">
        <div class="space-y-4 pt-2">
          <h3 class="text-lg font-semibold">Timetable Requirements</h3>
          <div class="text-sm text-muted-foreground">
            Configure additional constraints and requirements for this timetable.
          </div>
        </div>
      </TabsContent>
    </Tabs>
  </div>
</template>
