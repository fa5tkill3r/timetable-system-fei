<script setup lang="ts">
import {TimetableActivity} from "@/types.ts";
import TimeTableCell from "@/components/TimeTableCell.vue";
import {computed, ref} from "vue";

interface Props {
  times: string[];
  day: string;
}

const childRefs = ref<HTMLElement[]>([]);

const props = defineProps<Props>()

const events = ref<TimetableActivity[]>([]);

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

function addEvents(newEvents: TimetableActivity[]) {
  events.value.push(...newEvents);
}

function removeEvents(oldEvents: TimetableActivity[]) {
  events.value = events.value.filter(event => !oldEvents.includes(event));
}


</script>

<template>
  <TimeTableCell
    ref="childRefs"
    v-for="time in tableDataCells"
    :key="time"


  />

</template>

<style scoped>

</style>