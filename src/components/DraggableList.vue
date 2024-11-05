<script setup lang="ts">
import {computed, ref} from 'vue';
import { useDragAndDrop } from "@formkit/drag-and-drop/vue";
import {TimetableActivity} from "@/types.ts";

interface Props {
  initialItems: TimetableActivity[];
  isSource?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  initialItems: () => [],
  isSource: false,
});


const [target, items] = useDragAndDrop(props.initialItems, {
  accepts: () => true,
});

function calculateBrightness(color: string): number {
  const rgb = parseInt(color.slice(1), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
const colSpan = computed(() => items.value.reduce((acc, item) => acc + item.duration, 0));

defineExpose({ items });
</script>

<template>
  <td class="w-32" :colspan="colSpan">
    <div ref="target" class="border w-full h-16 flex flex-col justify-center items-center">
      <div v-for="item in items" :key="item" class="text-black w-full h-full text-center table" :style="`background-color: ${item.color}`">
      <span
        class="table-cell align-middle"
        :style="`color: ${calculateBrightness(item.color) > 186 ? 'black' : 'white'}`"
      >{{ item.shortName }}</span>
      </div>
    </div>
  </td>
</template>

<style scoped>

</style>