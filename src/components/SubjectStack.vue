<script setup lang="ts">
  import { TimetableActivity } from '@/types.ts'
  import { useDragAndDrop } from '@formkit/drag-and-drop/vue'
  import { calculateBrightness } from '@/utils.ts'

  interface Props {
    initialItems: TimetableActivity[]
    isSource?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    initialItems: () => [],
    isSource: false,
  })

  const [target, items] = useDragAndDrop(props.initialItems, {
    accepts: () => true,
  })
</script>

<template>
  <div ref="target" class="border w-full grid grid-cols-12 gap-3">
    <div
      v-for="item in items"
      :key="item"
      class="text-black w-full h-16 text-center table"
      :style="`background-color: ${item.color}`"
    >
      <span
        class="table-cell align-middle"
        :style="`color: ${calculateBrightness(item.color) > 186 ? 'black' : 'white'}`"
        >{{ item.shortName }}</span
      >
    </div>
  </div>
</template>

<style scoped></style>
