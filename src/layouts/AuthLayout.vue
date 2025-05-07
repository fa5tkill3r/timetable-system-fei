<script setup lang="ts">
// No imports needed
</script>

<template>
  <div class="flex flex-col min-h-screen h-screen">
    <!-- Auth content - full height, no header -->
    <div class="flex-1 flex overflow-hidden">
      <slot></slot>
    </div>
  </div>
</template>