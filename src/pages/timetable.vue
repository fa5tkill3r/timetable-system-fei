<script setup lang="ts">
import { useDragAndDrop } from "@formkit/drag-and-drop/vue";
import {computed, Ref, ref, shallowRef} from "vue";
import TimeTableCell from "@/components/TimeTableCell.vue";

const times = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00",
];

const days = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
];

const [parent, events] = useDragAndDrop(
    [
      { id: "event-1", name: "Event 1" },
      { id: "event-2", name: "Event 2" },
      { id: "event-3", name: "Event 3" },
    ],
    {
      draggable: (el) => el.id !== "no-drag",
    }
);

interface Cell {
  parent: Ref<HTMLElement | undefined>;
  events: Ref<Event[]>;
}

interface Event {
  id: string;
  name: string;
}

const initCell = (): Cell => {
  const [target, events] = useDragAndDrop(
      [
        { id: "event-1", name: "Event 1" },
      ],
      {}
  );

  return {
    parent: target,
    events,
  };
};

const cells = shallowRef<{ [key: string]: Cell }>({});
for (const day of days) {
  for (const time of times) {
    cells.value[`${day}-${time}`] = initCell();
  }
}

function getCell(day: string, time: string): Cell {
  const val = cells.value[`${day}-${time}`];
  console.log(val);
  return val;
}

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
          <td v-for="time in times" :key="time" class="time-slot">
            <ul :ref="getCell(day, time).parent" class="flex flex-col space-y-4">
              <li
                  v-for="event in getCell(day, time).events"
                  :key="event.id"
              >
                HM: {{ event.name }}
              </li>
            </ul>
          </td>
        </tr>
        </tbody>
      </table>
      <ul ref="parent">
        <li
            v-for="event in events"
            :key="event.id"
            class="cassette"
        >
          {{ event.name }}
        </li>
        <li id="no-drag">I am NOT draggable</li>
      </ul>
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
  border-collapse: collapse;
}

th, td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: center;
}

.time-slot {
  min-height: 50px;
}

.cassette {
  cursor: move;
  padding: 8px;
  margin: 4px;
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
}
</style>