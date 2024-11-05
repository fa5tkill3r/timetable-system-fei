<script setup lang="ts">
import { useDragAndDrop } from "@formkit/drag-and-drop/vue";
import { computed, Ref, ref, shallowRef } from "vue";
import TimeTableCell from "@/components/TimeTableCell.vue";
import DraggableList from "@/components/DraggableList.vue";
import {computeColorFromName} from "@/utils.ts";
import {TimetableActivity} from "@/types.ts";

const times = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00",
];

const days = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
];

function makeActivity(shortName: string, name: string, duration = 1): TimetableActivity {
  const color = computeColorFromName(name);
  return { id: shortName, name, shortName, color, duration };
}

const events = [
  makeActivity("I-ASOS", "Architektúra softvérových systémov"),
  makeActivity("I-DP1-AI", "Diplomový projekt 1", 2),
  makeActivity("I-MOBV", "Mobilné výpočty"),
  makeActivity("I-SVIS", "Spoločenské, morálne a právne súvislosti vývoja informačných systémov"),
];


interface Cell {
  parent: Ref<HTMLElement | undefined>;
  events: Ref<TimetableActivity[]>;
}

const cells = ref<{ [key: string]: Cell }>({});

const initCell = (day: string, time: string): Cell => {
  const [target, cellEvents] = useDragAndDrop<TimetableActivity>([
    { id: "event-1", name: "Event 1" },
  ], {
    draggable: (el) => true,
  });
  return {
    parent: target,
    events: cellEvents,
  };
};


</script>

<template>
  <div class="flex-1 space-y-4 p-8 pt-6">
    <div class="flex items-center justify-between space-y-2">
      <h2 class="text-3xl font-bold tracking-tight">
        Timetable editor
      </h2>
    </div>

    <div class="timetable">
      <table>
        <thead>
        <tr>
          <th></th>
          <th v-for="time in times" :key="time">{{ time }}</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="day in days" :key="day">
          <td>{{ day }}</td>
          <DraggableList v-for="time in times" :key="time" class="">
<!--            <DraggableList/>-->
          </DraggableList>
        </tr>
        </tbody>
      </table>
      <DraggableList
          :initial-items="events"
      />
    </div>
  </div>
</template>

<style scoped>
.timetable {
  display: flex;
  flex-direction: column;
}

table {
  width: 100%;
  //border-collapse: collapse;
}

th, td {
  border: 1px solid #ddd;
  //padding: 8px;
  text-align: center;
}

.time-slot {
  min-height: 50px;
}

</style>