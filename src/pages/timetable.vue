<script setup lang="ts">
  import { useDragAndDrop } from '@formkit/drag-and-drop/vue'
  import { Ref, ref } from 'vue'
  import { computeColorFromName } from '@/utils.ts'
  import { TimetableActivity } from '@/types.ts'
  import SubjectStack from '@/components/SubjectStack.vue'
  import TimeTableRow from '@/components/TimeTableRow.vue'

  const times = [
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
  ]

  const days = ref([
    {
      name: 'Monday',
      rows: 1,
    },
    {
      name: 'Tuesday',
      rows: 1,
    },
    {
      name: 'Wednesday',
      rows: 1,
    },
    {
      name: 'Thursday',
      rows: 1,
    },
    {
      name: 'Friday',
      rows: 1,
    },
  ])

  function makeActivity(
    shortName: string,
    name: string,
    duration = 1,
  ): TimetableActivity {
    const color = computeColorFromName(name)
    return { id: shortName, name, shortName, color, duration }
  }

  const events = [
    makeActivity('I-ASOS', 'Architektúra softvérových systémov'),
    makeActivity('I-DP1-AI', 'Diplomový projekt 1', 2),
    makeActivity('I-MOBV', 'Mobilné výpočty'),
    makeActivity(
      'I-SVIS',
      'Spoločenské, morálne a právne súvislosti vývoja informačných systémov',
    ),
    makeActivity(
      'Test 1',
      'Spoločenské, morálne a právne súvislosti vývoja informačných systémov',
    ),
    makeActivity(
      'Test 2',
      'Spoločenské, morálne a právne súvislosti vývoja informačných systémov',
    ),
    makeActivity(
      'Test 3',
      'Spoločenské, morálne a právne súvislosti vývoja informačných systémov',
    ),
  ]

  interface Cell {
    parent: Ref<HTMLElement | undefined>
    events: Ref<TimetableActivity[]>
  }

  const cells = ref<{ [key: string]: Cell }>({})

  const initCell = (day: string, time: string): Cell => {
    const [target, cellEvents] = useDragAndDrop<TimetableActivity>(
      [{ id: 'event-1', name: 'Event 1' }],
      {
        draggable: (el) => true,
      },
    )
    return {
      parent: target,
      events: cellEvents,
    }
  }

  function addRow(day: string, row: number) {
    const fd = days.value.find((d) => d.name === day)
    if (!fd) {
      return
    }

    console.log(`Adding row to ${day} at ${row}`)
    fd.rows = row + 1
  }

  function deleteRow(day: string, row: number) {
    if (row === 1) {
      return
    }

    const fd = days.value.find((d) => d.name === day)
    if (!fd) {
      return
    }

    console.log(`Deleting row from ${day} at ${row}`)
    fd.rows = row - 1
  }
</script>

<template>
  <div class="flex-1 space-y-4 p-8 pt-6">
    <div class="flex items-center justify-between space-y-2">
      <h2 class="text-3xl font-bold tracking-tight">Timetable editor</h2>
    </div>

    <div class="timetable">
      <table class="">
        <thead>
          <tr>
            <th></th>
            <th v-for="time in times" :key="time">{{ time }}</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="day in days" :key="day.name">
            <tr v-for="row in day.rows" :key="row">
              <td v-if="row === 1" :rowspan="day.rows">
                {{ day.name }}
              </td>
              <TimeTableRow
                :times="times"
                :day="day"
                @add-row="() => addRow(day.name, row)"
                @empty="() => deleteRow(day.name, row)"
              />
            </tr>
            <!--          <TimeTableCell v-for="time in times" :key="time" class="">-->
            <!--&lt;!&ndash;            <TimeTableCell/>&ndash;&gt;-->
            <!--          </TimeTableCell>-->
          </template>
        </tbody>
      </table>
    </div>

    <h3 class="text-2xl font-bold tracking-tight">Subjects</h3>

    <SubjectStack class="" :initial-items="events" />
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

  th,
  td {
    border: 1px solid #ddd;
    //padding: 8px;
    text-align: center;
  }

  .time-slot {
    min-height: 50px;
  }
</style>
