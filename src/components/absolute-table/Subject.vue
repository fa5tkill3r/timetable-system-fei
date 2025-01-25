<script setup lang="ts">
  import { computed } from 'vue'

  const props = defineProps<{
    subject: {
      id: number
      name: string
      color: string
      duration: number
    }
    slotHeight: number
  }>()

  const subjectStyle = computed(() => ({
    position: 'absolute',
    top: `${props.subject.start * props.slotHeight}px`,
    height: `${props.subject.duration * props.slotHeight}px`,
    width: 'calc(20% - 10px)', // 20% pre 5 dní - 10px medzera
    backgroundColor: '#cce5ff',
    border: '1px solid #007bff',
    padding: '5px',
    borderRadius: '5px',
    cursor: 'grab',
    left: `calc(${(props.subject.id % 5) * 20}% + 5px)`, // Príklad polohy dňa
  }))
</script>

<template>
  <div
    class="subject"
    :style="subjectStyle"
    draggable="true"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
  >
    {{ subject.name }}
  </div>
</template>

<style scoped>
  .subject {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
</style>
