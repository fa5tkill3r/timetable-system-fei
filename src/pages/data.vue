<script setup lang="ts">
import {ref} from 'vue';
import {useDragAndDrop} from "@formkit/drag-and-drop/vue";
import DraggableList from '@/components/TimeTableCell.vue';

const sourceItems = ["item1", "item2", "item3"];
const targetLists = ref([]);
</script>

<template>
  <div>
    <table style="width:100%">
      <tr>
        <th>Person 1</th>
        <th>Person 2</th>
        <th>Person 3</th>
      </tr>
      <tr>
        <td>Emil</td>
        <td>Tobias</td>
        <td>
          <table>
            <tr>
              <td>
                Test
              </td>
            </tr>
            <tr>
              <td>
                Test2
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td>16</td>
        <td>14</td>
        <td>10</td>
      </tr>
    </table>

  </div>
</template>

<style scoped>
table, th, td {
  border:1px solid black;
}
</style>