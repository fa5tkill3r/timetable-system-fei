<script setup lang="ts">
  import { useForm } from 'vee-validate'
  import { toTypedSchema } from '@vee-validate/zod'
  import * as z from 'zod'
  import { ref, computed, watch, onMounted } from 'vue'
  import { Calendar, Clock } from 'lucide-vue-next'

  import { Button } from '@/components/ui/button'
  import {
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
  } from '@/components/ui/form'
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '@/components/ui/dialog'
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select'
  import { Switch } from '@/components/ui/switch'
  import {
    TTEventExtended,
    useTimetableEventStore,
  } from '@/store/timetableEvents'
  import { useTTEventTypeStore } from '@/store/ttEventTypes'
  import { useSubjectStore } from '@/store/subjects'
  import { components } from '@/types/schema'
  import ComboBox from '@/components/common/ComboBox.vue'
  import { useBuildingStore } from '@/store/buildings'
  import { DAYS, generateTimeSlots, DEFAULT_TIME_CONFIG } from '@/lib/timetable'

  type TTEvent = components['schemas']['TTEvent']

  const props = defineProps<{
    open: boolean
    timetableId: number
    event?: TTEvent | null
    isLoading?: boolean
  }>()

  const emit = defineEmits<{
    'update:open': [value: boolean]
    submit: [result: { success: boolean; message: string; data?: TTEvent }]
  }>()

  const timetableEventStore = useTimetableEventStore()
  const ttEventTypeStore = useTTEventTypeStore()
  const subjectStore = useSubjectStore()
  const buildingStore = useBuildingStore()

  const isEditing = computed(() => !!props.event)
  const dialogTitle = computed(() =>
    isEditing.value ? 'Edit Activity' : 'Create Activity',
  )

  const weeksBitmask = ref(parseInt('111111111111', 2))
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

  function toggleWeek(index: number) {
    const bitArray = weekBits.value.slice()
    bitArray[index] = !bitArray[index]
    weeksBitmask.value = parseInt(
      bitArray.map((bit) => (bit ? '1' : '0')).join(''),
      2,
    )
  }

  function selectOddWeeks() {
    weeksBitmask.value = parseInt('101010101010', 2)
  }

  function selectEvenWeeks() {
    weeksBitmask.value = parseInt('010101010101', 2)
  }

  function selectAllWeeks() {
    if (!isAllWeeksPattern.value) {
      weeksBitmask.value = parseInt('111111111111', 2)
    } else {
      weeksBitmask.value = parseInt('000000000000', 2)
    }
  }

  const durations = Array.from({ length: 8 }, (_, i) => ({
    label: i + 1 === 1 ? '1 hour' : `${i + 1} hours`,
    value: i + 1,
  }))

  const placementEnabled = ref(false)

  const formSchema = computed(() => {
    const baseSchema = {
      subject: z.number().int().positive({ message: 'Subject is required' }),
      eventType: z
        .number()
        .int()
        .positive({ message: 'Event type is required' }),
      duration: z
        .number()
        .int()
        .min(1)
        .max(8, { message: 'Duration must be 1-8 hours' }),
    }

    if (placementEnabled.value) {
      return toTypedSchema(
        z.object({
          ...baseSchema,
          dayOfWeek: z.number().min(3, { message: 'Day is required' }),
          startTime: z
            .string()
            .min(1, { message: 'Start time is required' })
            .transform((val) => Number(val)),
          room: z.number().int().positive({ message: 'Room is required' }),
        }),
      )
    } else {
      return toTypedSchema(
        z.object({
          ...baseSchema,
          dayOfWeek: z.string().min(3).optional(),
          startTime: z.number().int().min(0).max(23).optional(),
          room: z.number().int().positive().optional(),
        }),
      )
    }
  })

  const form = useForm({
    validationSchema: formSchema,
    initialValues: {
      subject: undefined,
      eventType: undefined,
      dayOfWeek: undefined,
      startTime: undefined,
      duration: 2,
      room: undefined,
    },
  })

  const { setFieldValue } = form

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const { valid, errors } = await form.validate()

      if (!valid) {
        const firstErrorField = Object.keys(errors)[0]
        if (firstErrorField) {
          console.error(
            `Please fix validation errors: ${JSON.stringify(errors)}`,
          )
          return
        }
      }
      const eventData: TTEvent = {
        tt: props.timetableId,
        tta: (props.event?.tta as any)?.id,
        weeks_bitmask: weeksBitmask.value,
        start_time: values.startTime ?? null,
        duration: values.duration,
        room: values.room ?? null,
        day_of_week: values.dayOfWeek ?? null,
      }

      let result

      if (isEditing.value && props.event?.id) {
        const updateEvent = eventData as Partial<TTEventExtended>
        if (
          values.subject !== (props.event.tta as any).subject ||
          values.eventType !== (props.event.tta as any).event_type
        ) {
          updateEvent.tta = {
            id: (props.event.tta as any).id,
            subject: values.subject,
            event_type: values.eventType,
          }
        }
        result = await timetableEventStore.updateEvent(
          props.event.id,
          updateEvent,
        )

        if (result) {
          emit('submit', {
            success: true,
            message: 'Activity updated successfully',
            data: result,
          })
        } else {
          emit('submit', {
            success: false,
            message: 'Failed to update activity',
          })
        }
      } else {
        result = await timetableEventStore.createEvent(eventData)

        if (result) {
          emit('submit', {
            success: true,
            message: 'Activity created successfully',
            data: result,
          })
        } else {
          emit('submit', {
            success: false,
            message: 'Failed to create activity',
          })
        }
      }

      if (result) {
        emit('update:open', false)
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      emit('submit', {
        success: false,
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
      })
    }
  })

  function onDialogChange(open: boolean) {
    emit('update:open', open)
    if (!open) {
      form.resetForm()
    }
  }

  const subjectOptions = computed(() =>
    subjectStore.subjects.map((subject) => ({
      id: subject.id,
      name: subject.code
        ? `[${subject.code}] ${subject.name || 'Unnamed Subject'}`
        : subject.name || 'Unnamed Subject',
    })),
  )

  const eventTypeOptions = computed(() =>
    ttEventTypeStore.eventTypes.map((type) => ({
      id: type.id,
      name: type.name || 'Unnamed Type',
    })),
  )

  const roomOptions = computed(() => {
    return buildingStore.rooms.map((room) => ({
      id: room.id,
      name: room.name || `Room ${room.id}`,
    }))
  })

  const timeSlots = computed(() => {
    const allSlots = generateTimeSlots(DEFAULT_TIME_CONFIG)
    const selectedDuration = form.values.duration || 1
    const maxStartSlot = DEFAULT_TIME_CONFIG.SLOT_COUNT - selectedDuration

    return allSlots
      .filter((slot) => slot.index <= maxStartSlot)
      .map((slot) => {
        const endSlotIndex = slot.index + selectedDuration - 1
        const endSlot = allSlots.find((s) => s.index === endSlotIndex)!

        return {
          id: slot.index,
          name: `${slot.from} - ${endSlot.to}`,
          value: slot.index,
        }
      })
  })

  const dayOfWeekOptions = computed(() => {
    return DAYS.map((day, index) => ({
      id: index,
      name: day.charAt(0).toUpperCase() + day.slice(1),
    }))
  })

  watch(
    () => form.values.duration,
    (newDuration) => {
      const currentStartTime = Number(form.values.startTime)
      if (currentStartTime !== undefined) {
        const maxValidStart = DEFAULT_TIME_CONFIG.SLOT_COUNT - newDuration!

        if (currentStartTime > maxValidStart) {
          setFieldValue(
            'startTime',
            (maxValidStart >= 0 ? maxValidStart : undefined)?.toString(),
          )
        }
      }
    },
  )

  watch(placementEnabled, (newValue) => {
    if (!newValue) {
      setFieldValue('dayOfWeek', undefined)
      setFieldValue('startTime', undefined)
      setFieldValue('room', undefined)
    }

    form.validate()
  })

  watch(
    () => props.open,
    (open) => {
      const newEvent = props.event
      if (open && newEvent) {
        const ttaData = newEvent.tta as any

        setFieldValue('subject', ttaData?.subject)
        setFieldValue('eventType', ttaData?.event_type)
        setFieldValue('duration', newEvent.duration || 2)

        const hasPlacementData =
          (newEvent.room !== undefined && newEvent.room !== null) ||
          (newEvent.day_of_week !== undefined &&
            newEvent.day_of_week !== null) ||
          (newEvent.start_time !== undefined && newEvent.start_time !== null)

        if (hasPlacementData) {
          placementEnabled.value = true

          if (newEvent.room !== undefined && newEvent.room !== null) {
            setFieldValue('room', (newEvent.room as any).id)
          }

          if (
            newEvent.day_of_week !== undefined &&
            newEvent.day_of_week !== null
          ) {
            setFieldValue('dayOfWeek', newEvent.day_of_week)
          }

          if (
            newEvent.start_time !== undefined &&
            newEvent.start_time !== null
          ) {
            setFieldValue('startTime', newEvent.start_time.toString())
          }

          if (
            newEvent.weeks_bitmask !== undefined &&
            newEvent.weeks_bitmask !== null
          ) {
            weeksBitmask.value = newEvent.weeks_bitmask
          }
        } else {
          placementEnabled.value = false
        }
      }
    },
    { immediate: true },
  )

  onMounted(async () => {
    if (ttEventTypeStore.eventTypes.length === 0) {
      await ttEventTypeStore.fetchEventTypes()
    }

    if (subjectStore.subjects.length === 0) {
      await subjectStore.fetchSubjects()
    }

    if (buildingStore.rooms.length === 0) {
      await buildingStore.fetchRooms()
    }
  })
</script>

<template>
  <Dialog
    :open="open"
    @update:open="onDialogChange"
  >
    <DialogContent class="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>{{ dialogTitle }}</DialogTitle>
        <DialogDescription>
          {{
            isEditing
              ? 'Edit the details of this activity.'
              : 'Create a new activity for this timetable.'
          }}
        </DialogDescription>
      </DialogHeader>

      <form
        @submit="onSubmit"
        class="space-y-6"
      >
        <div class="grid gap-6 sm:grid-cols-2">
          <FormField
            v-slot="{ componentField }"
            name="subject"
          >
            <FormItem>
              <ComboBox
                :options="subjectOptions"
                :title="'Subject'"
                :search-placeholder="'Search subjects...'"
                :selection="form.values.subject"
                @update:selection="setFieldValue('subject', $event)"
              />
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField
            v-slot="{ componentField }"
            name="eventType"
          >
            <FormItem>
              <ComboBox
                :options="eventTypeOptions"
                :title="'Activity Type'"
                :search-placeholder="'Search activity types...'"
                :selection="form.values.eventType"
                @update:selection="setFieldValue('eventType', $event)"
              />
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField
            v-slot="{ componentField }"
            name="duration"
          >
            <FormItem>
              <FormLabel>Duration</FormLabel>
              <FormControl>
                <Select
                  :model-value="componentField.modelValue?.toString()"
                  @update:model-value="
                    setFieldValue('duration', Number($event))
                  "
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="duration in durations"
                      :key="duration.value"
                      :value="duration.value.toString()"
                    >
                      {{ duration.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        </div>

        <FormField name="weeksBitmask">
          <div class="space-y-2 border-t pt-4">
            <div class="flex items-center justify-between">
              <FormItem class="flex flex-row items-center space-y-0">
                <FormLabel class="flex items-center">
                  <Calendar class="mr-2 h-4 w-4" />
                  Weeks
                </FormLabel>
              </FormItem>

              <div class="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  :variant="isOddWeeksPattern ? 'default' : 'secondary'"
                  class="h-7 text-xs"
                  @click="selectOddWeeks"
                >
                  Odd
                </Button>
                <Button
                  type="button"
                  size="sm"
                  :variant="isEvenWeeksPattern ? 'default' : 'secondary'"
                  class="h-7 text-xs"
                  @click="selectEvenWeeks"
                >
                  Even
                </Button>
                <Button
                  type="button"
                  size="sm"
                  :variant="isAllWeeksPattern ? 'default' : 'secondary'"
                  class="h-7 text-xs"
                  @click="selectAllWeeks"
                >
                  All
                </Button>
              </div>
            </div>

            <div class="flex justify-center gap-1">
              <button
                type="button"
                v-for="(active, index) in weekBits"
                :key="index"
                @click="toggleWeek(index)"
                class="flex h-6 w-6 items-center justify-center rounded-full border text-xs"
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
          <FormMessage />
        </FormField>

        <FormField name="placementEnabled">
          <FormItem
            class="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"
          >
            <div class="space-y-0.5">
              <FormLabel>Place in timetable</FormLabel>
              <FormDescription>
                When enabled, the activity will be placed in the timetable
              </FormDescription>
            </div>
            <FormControl>
              <Switch v-model:checked="placementEnabled" />
            </FormControl>
          </FormItem>
        </FormField>

        <div
          v-show="placementEnabled"
          class="grid gap-6 border-t pt-4 sm:grid-cols-2"
        >
          <FormField
            v-slot="{ componentField }"
            name="room"
          >
            <FormItem>
              <ComboBox
                :options="roomOptions"
                :title="'Room'"
                :search-placeholder="'Search rooms...'"
                :selection="form.values.room"
                @update:selection="setFieldValue('room', $event)"
              />
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField
            v-slot="{ componentField }"
            name="dayOfWeek"
          >
            <FormItem>
              <ComboBox
                :options="dayOfWeekOptions"
                :title="'Day'"
                :search-placeholder="'Select day...'"
                :selection="form.values.dayOfWeek"
                @update:selection="setFieldValue('dayOfWeek', $event)"
              />
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField
            v-slot="{ componentField }"
            name="startTime"
            class="flex-1"
          >
            <FormItem>
              <FormLabel>Start Time</FormLabel>
              <FormControl>
                <Select v-bind="componentField">
                  <SelectTrigger>
                    <Clock class="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="slot in timeSlots"
                      :key="slot.value"
                      :value="slot.value.toString()"
                    >
                      {{ slot.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            @click="emit('update:open', false)"
            >Cancel</Button
          >
          <Button
            type="submit"
            :disabled="props.isLoading"
          >
            {{ isEditing ? 'Update' : 'Create' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
