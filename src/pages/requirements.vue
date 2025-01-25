<script setup lang="ts">
  import { ref } from 'vue'
  import { Button } from '@/components/ui/button'
  import { columns } from '@/components/ui/data-table/columns.ts'
  import { Requirement, RequirementType } from '@/types.ts'
  import DataTable from '@/components/ui/data-table/DataTable.vue'
  import CreateRequirement from '@/components/CreateRequirement.vue'

  const requirements = ref([
    {
      type: 'Osobná',
      createdAt: new Date(),
      subject: 'Analýza a zložitosť algoritmov',
    },
  ])

  const open = true
</script>

<template>
  <div class="container">
    <h1 class="text-2xl font-bold my-4">Požiadavky</h1>

    <div class="flex justify-end mb-4 mt-4">
      <CreateRequirement />
    </div>

    <div>
      <DataTable :columns="columns" :data="requirements" />
    </div>
  </div>
</template>

<style scoped></style>
