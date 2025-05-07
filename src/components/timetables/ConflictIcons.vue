<script setup lang="ts">
import { Building, Users, Clock, AlertTriangle } from 'lucide-vue-next';

const props = defineProps({
  conflicts: {
    type: Array as () => string[],
    required: true
  }
});
</script>

<template>
  <div class="flex gap-1 items-start justify-start z-50">
    <div v-for="(conflict, index) in conflicts" :key="index">
      <Building v-if="conflict === 'room'"
        class="h-5 w-5 text-red-600 shadow-md bg-white bg-opacity-90 rounded-full p-0.5 border border-red-600" />
      <Users v-else-if="conflict === 'teacher'"
        class="h-5 w-5 text-blue-600 shadow-md bg-white bg-opacity-90 rounded-full p-0.5 border border-blue-600" />
      <Clock v-else-if="conflict === 'time'"
        class="h-5 w-5 text-green-600 shadow-md bg-white bg-opacity-90 rounded-full p-0.5 border border-green-600" />
      <AlertTriangle v-else
        class="h-5 w-5 text-yellow-600 shadow-md bg-white bg-opacity-90 rounded-full p-0.5 border border-yellow-600" />
    </div>
  </div>
</template>
