<script setup lang="ts">
  import { ref, computed, watch, useTemplateRef } from 'vue'
  import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
  } from '@/components/ui/card'
  import { Button } from '@/components/ui/button'
  import { GripVertical, Trash2, Edit, Calendar, Copy } from 'lucide-vue-next'
  import { useSubjectUserRoleStore } from '@/store/subjectUserRoles'
  import { CalendarEvent } from '@/types/types'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()

  interface Props {
    event: CalendarEvent
    visible: boolean
    position: { x: number; y: number }
  }

  const menuRef = useTemplateRef('menuRef')

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

  watch(
    () => props.event.id,
    () => {
      weeksBitmask.value = props.event.weeks_bitmask || 0
    },
  )

  const staffMembers = computed(() => {
    if (!props.event.subject_id) return []

    return subjectUserRoleStore
      .getLecturersForSubject(props.event.subject_id)
      .map((role) => {
        const user = role.user as any
        const customRole = role.role as any
        console.log('ROle', customRole)

        return {
          name:
            user.full_name ||
            user.username ||
            t('timetable.editor.eventMenu.unknown'),
          role:
            customRole.id === 1
              ? t('timetable.editor.eventMenu.lecturer')
              : t('timetable.editor.eventMenu.teachingAssistant'),
        }
      })
  })

  const weekBits = computed(() => {
    const binaryString = (weeksBitmask.value || 0).toString(2).padStart(12, '0')
    return binaryString.split('').map((bit) => bit === '1')
  })

  const isOddWeeksPattern = computed(() => {
    const oddWeeksMask = parseInt('101010101010', 2)
    return weeksBitmask.value === oddWeeksMask
  })

  const isEvenWeeksPattern = computed(() => {
    const evenWeeksMask = parseInt('010101010101', 2)
    return weeksBitmask.value === evenWeeksMask
  })

  const isAllWeeksPattern = computed(() => {
    const allWeeksMask = parseInt('111111111111', 2)
    return weeksBitmask.value === allWeeksMask
  })

  const toggleWeek = (index: number) => {
    const bitArray = weekBits.value.slice()
    bitArray[index] = !bitArray[index]

    const newBitmask = parseInt(
      bitArray.map((bit) => (bit ? '1' : '0')).join(''),
      2,
    )

    weeksBitmask.value = newBitmask

    emit('update-weeks-bitmask', props.event.id!, newBitmask)
  }

  const handleDragStart = (event: DragEvent) => {
    if (event.dataTransfer) {
      const eventData = {
        ...props.event,
        isCopy: true,
        sourceEventId: props.event.id,
      }

      event.dataTransfer.setData('application/json', JSON.stringify(eventData))

      event.dataTransfer.effectAllowed = 'copy'

      const calendarEvent = {
        ...props.event,
        id: null,
        original_eventId: props.event.id,
      }

      emit('drag-start', event, calendarEvent)

      setTimeout(() => {
        emit('update:visible', false)
      }, 0)
    }
  }

  const selectOddWeeks = () => {
    const oddWeeksMask = parseInt('101010101010', 2)
    weeksBitmask.value = oddWeeksMask
    emit('update-weeks-bitmask', props.event.id!, oddWeeksMask)
  }

  const selectEvenWeeks = () => {
    const evenWeeksMask = parseInt('010101010101', 2)
    weeksBitmask.value = evenWeeksMask
    emit('update-weeks-bitmask', props.event.id!, evenWeeksMask)
  }

  const selectAllWeeks = () => {
    if (isAllWeeksPattern.value) {
      weeksBitmask.value = 0
      emit('update-weeks-bitmask', props.event.id!, 0)
      return
    } else {
      weeksBitmask.value = parseInt('111111111111', 2)
      emit('update-weeks-bitmask', props.event.id!, parseInt('111111111111', 2))
      return
    }
  }

  const adjustedPosition = computed(() => {
    const menuHeight = menuRef.value?.offsetHeight || 0
    const viewportHeight = window.innerHeight

    let y = props.position.y

    if (y + menuHeight > viewportHeight) {
      y = Math.max(10, viewportHeight - menuHeight - 10)
    }

    return {
      x: props.position.x,
      y,
    }
  })
</script>

<template>
  <div
    v-if="visible"
    ref="menuRef"
    :style="{
      position: 'absolute',
      left: `${position.x}px`,
      top: `${adjustedPosition.y}px`,
      zIndex: 1000,
    }"
  >
    <Card class="context-menu-card w-80 shadow-lg">
      <div
        class="absolute right-2 top-2 cursor-move"
        draggable="true"
        @dragstart="handleDragStart"
        @dragend="emit('drag-end')"
      >
        <GripVertical
          class="h-4 w-4 text-muted-foreground hover:text-foreground"
        />
      </div>

      <CardHeader :style="{ backgroundColor: event.color + '20' }">
        <CardTitle class="flex items-center justify-between">
          {{ event.shortcut }}
        </CardTitle>
        <CardDescription class="font-medium">{{ event.title }}</CardDescription>
        <div class="flex justify-between text-xs">
          <span
            >{{ $t(`days.${event.day}`) }} {{ event.start_time }} -
            {{ event.end_time }}</span
          >
          <span
            v-if="event.room_name"
            class="font-medium"
            >{{ $t('timetable.editor.eventMenu.room') }}
            {{ event.room_name }}</span
          >
        </div>
      </CardHeader>

      <CardContent class="pt-4">
        <div
          v-if="staffMembers.length > 0"
          class="mb-4"
        >
          <h4 class="mb-1 text-sm font-semibold">
            {{ $t('timetable.editor.eventMenu.staff') }}
          </h4>
          <div
            v-for="(member, idx) in staffMembers"
            :key="idx"
            class="flex justify-between text-sm"
          >
            <span>{{ member.name }}</span>
            <span class="text-xs text-muted-foreground">{{ member.role }}</span>
          </div>
        </div>

        <div class="mb-2">
          <h4
            class="mb-1 flex items-center justify-between text-sm font-semibold"
          >
            <div class="flex items-center gap-1">
              <Calendar class="mr-1 h-3.5 w-3.5" />
              {{ $t('timetable.editor.eventMenu.weeks') }}
            </div>
            <div class="flex h-3 items-center justify-center gap-1">
              <Button
                size="sm"
                :variant="isOddWeeksPattern ? 'default' : 'secondary'"
                class="h-fit text-xs"
                @click="selectOddWeeks"
              >
                {{ $t('timetable.editor.eventMenu.weekPatternA') }}
              </Button>
              <Button
                size="sm"
                :variant="isEvenWeeksPattern ? 'default' : 'secondary'"
                class="h-fit text-xs"
                @click="selectEvenWeeks"
              >
                {{ $t('timetable.editor.eventMenu.weekPatternB') }}
              </Button>
              <Button
                size="sm"
                :variant="isAllWeeksPattern ? 'default' : 'secondary'"
                class="h-fit text-xs"
                @click="selectAllWeeks"
              >
                {{ $t('timetable.editor.eventMenu.weekPatternFull') }}
              </Button>
            </div>
          </h4>
          <div class="mt-1 flex justify-center gap-1">
            <button
              v-for="(active, index) in weekBits"
              :key="index"
              @click="toggleWeek(index)"
              class="flex aspect-square h-5 w-5 items-center justify-center rounded-full border p-0 text-xs"
              :class="
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground'
              "
            >
              {{ index + 1 }}
            </button>
          </div>
        </div>
      </CardContent>

      <CardFooter class="flex justify-between">
        <Button
          size="sm"
          variant="outline"
          class="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
          @click="emit('delete-event', event)"
        >
          <Trash2 class="mr-1 h-3.5 w-3.5" />
          {{ $t('timetable.editor.eventMenu.delete') }}
        </Button>
      </CardFooter>
    </Card>
  </div>
</template>
