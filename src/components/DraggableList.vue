<script setup lang="ts">
import { ref } from 'vue';
import { useDragAndDrop } from "@formkit/drag-and-drop/vue";

interface Props {
  initialItems: string[];
  isSource?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isSource: false
});

const [target, items] = useDragAndDrop(props.initialItems, {
  accepts: () => true,
});

defineExpose({ items });
</script>

<template>

</template>

<style scoped>

</style>