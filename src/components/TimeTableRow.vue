<script setup lang="ts">
  import TimeTableCell from '@/components/TimeTableCell.vue'
  import { computed, nextTick, ref, watch } from 'vue'
  import { state } from '@formkit/drag-and-drop'

  interface Props {
    times: string[]
    day: string
  }

  const childRefs = ref<HTMLElement[]>([])

  const props = defineProps<Props>()

  const emits = defineEmits<{
    'add-row': [day: string]
    empty: []
  }>()

  const tableDataCells = computed<number>(() => {
    // events from childRefs
    let length = 0
    childRefs.value.forEach((childRef) => {
      // console.log(childRef.items);
      length += childRef.items.reduce((acc, item) => acc + item.duration - 1, 0)
    })

    console.log(length)

    // const eventsLength = events.value.reduce((acc, event) => acc + event.duration - 1, 0);
    const cellCount = props.times.length

    return cellCount - length
  })

  watch(tableDataCells, (newVal, oldVal) => {
    // wait tick
    nextTick(() => {
      const diff = newVal - oldVal
      if (newVal < oldVal) {
        // Remove items from the beginning of the array
        for (let i = 0; i < childRefs.value.length - 1; i++) {
          const childRef = childRefs.value[i]
          const nextChildRef = childRefs.value[i + 1]

          if (nextChildRef.items && nextChildRef.items.length > 0) {
            // If current childRef doesn't have items array, initialize it
            if (!childRef.items) {
              childRef.items = []
            }
            // Move one item from next child to current child
            const [item] = nextChildRef.items.splice(0, 1)
            childRef.items.push(item)
          }
        }
      } else if (newVal > oldVal) {
        for (let i = childRefs.value.length; i > 0; i--) {
          const childRef = childRefs.value[i - 1]
          const prevChildRef = childRefs.value[i - 2]

          if (prevChildRef?.items) {
            const prevItems = prevChildRef.items
            childRef.items = prevItems.splice(prevItems.length - 1, 1)
          }
        }
      } else {
        // do nothing
      }
    })
  })

  state.on('dragEnded', (event) => {
    console.log('dragend')
    const lengths = childRefs.value.map((childRef) => childRef.items.length)
    if (lengths.every((length) => length === 0)) {
      console.log('empty')
      emits('empty')
    }
  })

  const timeSlot = (timeFrom: string, timeTo: string) => `${timeFrom}-${timeTo}`
</script>

<template>
  <TimeTableCell
    ref="childRefs"
    v-for="time in tableDataCells"
    :key="time"
    :day="props.day"
    :timeSlot="
      timeSlot(
        props.times[time - 1],
        props.times[time - 1 + childRefs[time - 1]?.colSpan],
      )
    "
    @addRow="(day) => emits('add-row', day)"
  />
</template>

<style scoped></style>
