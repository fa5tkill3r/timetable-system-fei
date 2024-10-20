<script setup lang="ts">
import { ref } from 'vue';
import { useDragAndDrop } from "@formkit/drag-and-drop/vue";
import DraggableList from '@/components/DraggableList.vue';

const sourceItems = ["item1", "item2", "item3"];
const targetLists = ref([]);
</script>

<template>
  <div>
    <div>
      <DraggableList :initial-items="sourceItems" :is-source="true" />
      <DraggableList
          v-for="(list, index) in 5"
          :key="index"
      />
    </div>
  </div>
</template>

<style scoped>
/* Your styles here */
</style>