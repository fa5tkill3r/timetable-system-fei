<script setup lang="ts">
  import { Building, Users, Clock, AlertTriangle } from 'lucide-vue-next'

  const props = defineProps({
    conflicts: {
      type: Array as () => string[],
      required: true,
    },
  })
</script>

<template>
  <div class="z-50 flex items-start justify-start gap-1">
    <div
      v-for="(conflict, index) in conflicts"
      :key="index"
    >
      <Building
        v-if="conflict === 'room'"
        class="h-5 w-5 rounded-full border border-red-600 bg-white bg-opacity-90 p-0.5 text-red-600 shadow-md"
      />
      <Users
        v-else-if="conflict === 'teacher'"
        class="h-5 w-5 rounded-full border border-blue-600 bg-white bg-opacity-90 p-0.5 text-blue-600 shadow-md"
      />
      <Clock
        v-else-if="conflict === 'time'"
        class="h-5 w-5 rounded-full border border-green-600 bg-white bg-opacity-90 p-0.5 text-green-600 shadow-md"
      />
      <AlertTriangle
        v-else
        class="h-5 w-5 rounded-full border border-yellow-600 bg-white bg-opacity-90 p-0.5 text-yellow-600 shadow-md"
      />
    </div>
  </div>
</template>
