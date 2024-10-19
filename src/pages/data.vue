<script setup lang="ts">
import { ref } from 'vue';
import { useDragAndDrop } from "@formkit/drag-and-drop/vue";

const [source, items1] = useDragAndDrop(["item1", "item2", "item3"], {
  accepts: () => true,
});

const targetLists = ref([
  ["item4", "item5", "item6"],
  ["item7", "item8", "item9"]
]);

const targets = targetLists.value.map((list, index) => {
  const [target, items] = useDragAndDrop(list, {
    accepts: () => true,
  });
  return { target, items };
});
</script>

<template>
  <div>
    <ul ref="source" class="border p-4">
      <li v-for="item in items1" :key="item" class="border-b p-2">
        {{ item }}
      </li>
    </ul>
    <ul v-for="(target, index) in targets" :key="index" :ref="el => target.target.value = el" class="border p-4">
      <li v-for="item in target.items.value" :key="item" class="border-b p-2">
        {{ item }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
/* Your styles here */
</style>