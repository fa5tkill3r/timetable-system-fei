<script setup lang="ts">
import TimeTableCell from "@/components/TimeTableCell.vue";
import {computed, ref, watch} from "vue";
import {state} from "@formkit/drag-and-drop";

interface Props {
  times: string[];
  day: string;
}

const childRefs = ref<HTMLElement[]>([]);

const props = defineProps<Props>()

const emits = defineEmits<{
  'add-row': [day: string],
  'empty': [],
}>();


const tableDataCells = computed<number>(() => {
  // events from childRefs
  let length = 0;
  childRefs.value.forEach((childRef) => {
    // console.log(childRef.items);
    length += childRef.items.reduce((acc, item) => acc + item.duration - 1, 0);
  });

  console.log(length)

  // const eventsLength = events.value.reduce((acc, event) => acc + event.duration - 1, 0);
  const cellCount = props.times.length;

  // console.log(eventsLength, events.value);

  return cellCount - length;
})


state.on('dragEnded', (event) => {
  console.log('dragend');
  const lengths = childRefs.value.map((childRef) => childRef.items.length);
  if (lengths.every((length) => length === 0)) {
    console.log('empty');
    emits('empty');
  }
});

</script>

<template>
  <TimeTableCell
    ref="childRefs"
    v-for="time in tableDataCells"
    :key="time"
    :day="props.day"
    @addRow="(day) => emits('add-row', day)"


  />

</template>

<style scoped>

</style>