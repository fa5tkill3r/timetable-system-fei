<script setup lang="ts">
  // No imports needed
</script>

<template>
  <div class="flex h-screen min-h-screen flex-col">
    <!-- Auth content - full height, no header -->
    <div class="flex flex-1 overflow-hidden">
      <slot></slot>
    </div>
  </div>
</template>
