<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import { useDragAndDrop } from "@formkit/drag-and-drop/vue";
import {TimetableActivity} from "@/types.ts";
import {calculateBrightness} from "@/utils.ts";

interface Props {
  initialItems: TimetableActivity[];
  isSource?: boolean;
  day: string;
}

const emit = defineEmits<{
  'items-added': [items: TimetableActivity[]],
  'items-removed': [items: TimetableActivity[]],
  'add-row': [day: string],
}>();

const props = withDefaults(defineProps<Props>(), {
  initialItems: () => [],
  isSource: false,
});


const [target, items] = useDragAndDrop(props.initialItems, {
  accepts: () => {
    if (items.value.length < 1) {

      return true;
    }

    emit('add-row', props.day);
    return false;
  },
  handleDragend: (event) => {
    console.log(event);
  },

});



const colSpan = computed(() => items.value.reduce((acc, item) => acc + item.duration, 0));

defineExpose({ items });

// Watch for changes in the items array
watch(items, (newItems, oldItems) => {
  const addedItems = newItems.filter(item => !oldItems.includes(item));
  const removedItems = oldItems.filter(item => !newItems.includes(item));

  if (addedItems.length > 0) {
    emit('items-added', addedItems);
  }

  if (removedItems.length > 0) {
    emit('items-removed', removedItems);
  }
}, { deep: true });
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