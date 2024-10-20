<script setup lang="ts">
import { ref } from 'vue';
import { useDragAndDrop } from "@formkit/drag-and-drop/vue";

interface Props {
  initialItems: string[];
  isSource?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  initialItems: () => [],
  isSource: false,
});


const [target, items] = useDragAndDrop(props.initialItems, {
  accepts: () => true,
});

defineExpose({ items });
</script>

<template>
  <ul ref="target" class="border p-4">
    <li v-for="item in items" :key="item" class="border-b p-2">
      {{ item }}
    </li>
  </ul>
</template>

<style scoped>

</style>