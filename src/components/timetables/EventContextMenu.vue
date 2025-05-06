<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { Button } from '@/components/ui/button'
import { GripVertical, Trash2, Edit, Calendar, Copy } from 'lucide-vue-next'
import { useSubjectUserRoleStore } from '@/store/subjectUserRoles'
import { components } from '@/types/schema'
import { CalendarEvent } from '@/types/types'


interface Props {
  event: CalendarEvent
  visible: boolean
  position: { x: number; y: number }
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:visible': [value: boolean]
  'delete-event': [event: CalendarEvent]
  'edit-event': [event: CalendarEvent]
  'drag-start': [event: DragEvent, calendarEvent: CalendarEvent]
  'drag-end': []
  'update-weeks-bitmask': [eventId: number, newBitmask: number]
}>()

const subjectUserRoleStore = useSubjectUserRoleStore()

const weeksBitmask = ref(props.event.weeks_bitmask || 0)

watch(() => props.event.id, () => {
  weeksBitmask.value = props.event.weeks_bitmask || 0
})

const staffMembers = computed(() => {
  if (!props.event.subject_id) return []

  return subjectUserRoleStore.getLecturersForSubject(props.event.subject_id)
    .map(role => {
      const user = role.user as any
      return {
        name: user.full_name || user.username || 'Unknown',
        role: role.role_id === 1 ? 'Lecturer' : 'Teaching Assistant'
      }
    })
})

const weekBits = computed(() => {
  const binaryString = (weeksBitmask.value || 0).toString(2).padStart(12, '0')
  return binaryString.split('').map(bit => bit === '1')
})

const toggleWeek = (index: number) => {
  const bitArray = weekBits.value.slice()
  bitArray[index] = !bitArray[index]

  const newBitmask = parseInt(bitArray.map(bit => bit ? '1' : '0').join(''), 2)

  weeksBitmask.value = newBitmask

  emit('update-weeks-bitmask', props.event.id, newBitmask)
}

const handleDragStart = (event: DragEvent) => {
  if (event.dataTransfer) {
    const eventData = {
      ...props.event,
      isCopy: true, // Flag to indicate this should create a new event
      sourceEventId: props.event.id // Keep reference to source event
    }
    
    // Store as JSON string so all data is transferred
    event.dataTransfer.setData('application/json', JSON.stringify(eventData))
    
    // Change to copy operation instead of move
    event.dataTransfer.effectAllowed = 'copy'

    const calendarEvent = {
      ...props.event,
      id: null,
      original_eventId: props.event.id, 
    }
    // props.event.original_eventId = props.event.id
    // props.event.id = null

    emit('drag-start', event, calendarEvent)

    setTimeout(() => {
      emit('update:visible', false)
    }, 0);
  }
}

const selectOddWeeks = () => {
  const oddWeeksMask = parseInt('101010101010', 2)
  weeksBitmask.value = oddWeeksMask
  emit('update-weeks-bitmask', props.event.id, oddWeeksMask)
}

const selectEvenWeeks = () => {
  const evenWeeksMask = parseInt('010101010101', 2)
  weeksBitmask.value = evenWeeksMask
  emit('update-weeks-bitmask', props.event.id, evenWeeksMask)
}

// Select all weeks
const selectAllWeeks = () => {
  const allWeeksMask = parseInt('111111111111', 2)
  weeksBitmask.value = allWeeksMask
  emit('update-weeks-bitmask', props.event.id, allWeeksMask)
}

</script>

<template>
  <div v-if="visible" :style="{
    position: 'absolute',
    left: `${position.x}px`,
    top: `${position.y}px`,
    zIndex: 1000,
  }">
    <Card class="w-80 shadow-lg context-menu-card">
      <div class="absolute top-2 right-2 cursor-move" draggable="true" @dragstart="handleDragStart"
      @dragend="emit('drag-end')">
        <GripVertical class="h-4 w-4 text-muted-foreground hover:text-foreground" />
      </div>

      <CardHeader :style="{ backgroundColor: event.color + '20' }">
        <CardTitle class="flex justify-between items-center">
          {{ event.shortcut }}
        </CardTitle>
        <CardDescription class="font-medium">{{ event.title }}</CardDescription>
        <div class="text-xs flex justify-between">
          <span>{{ event.day }} {{ event.start_time }} - {{ event.end_time }}</span>
          <span v-if="event.room_name" class="font-medium">Room: {{ event.room_name }}</span>
        </div>
      </CardHeader>

      <CardContent class="pt-4">
        <div v-if="staffMembers.length > 0" class="mb-4">
          <h4 class="font-semibold mb-1 text-sm">Staff</h4>
          <div v-for="(member, idx) in staffMembers" :key="idx" class="text-sm flex justify-between">
            <span>{{ member.name }}</span>
            <span class="text-xs text-muted-foreground">{{ member.role }}</span>
          </div>
        </div>

        <div class="mb-2">
          <h4 class="font-semibold mb-1 text-sm flex items-center justify-between">
            <div class="flex items-center gap-1">
              <Calendar class="h-3.5 w-3.5 mr-1" /> Weeks
            </div>
            <div class="h-3 flex items-center justify-center gap-1">
              <Button size="sm" variant="secondary" class="text-xs h-fit" @click="selectOddWeeks">
                A
              </Button>
              <Button size="sm" variant="secondary" class="text-xs h-fit" @click="selectEvenWeeks">
                B
              </Button>
              <Button size="sm" variant="secondary" class="text-xs h-fit" @click="selectAllWeeks">
                FULL
              </Button>
            </div>

          </h4>
          <div class="flex gap-1 mt-1 justify-center">
            <button v-for="(active, index) in weekBits" :key="index" @click="toggleWeek(index)"
              class="w-5 h-5 rounded-full flex items-center justify-center text-xs border p-0 aspect-square"
              :class="active ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground'">
              {{ index + 1 }}
            </button>
          </div>
        </div>
      </CardContent>

      <CardFooter class="flex justify-between">
        <Button size="sm" variant="outline"
          class="text-destructive hover:bg-destructive hover:text-destructive-foreground w-full"
          @click="emit('delete-event', event)">
          <Trash2 class="h-3.5 w-3.5 mr-1" /> Delete
        </Button>
      </CardFooter>
    </Card>
  </div>
</template>
