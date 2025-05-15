<template>
  <div class="flex flex-wrap items-center justify-between gap-4 py-2">
    <div
      class="text-sm text-muted-foreground"
      v-if="selectedCount !== undefined"
    >
      {{ selectedCount }} of {{ totalCount }} row(s) selected.
    </div>
    <div
      v-else
      class="text-sm text-muted-foreground"
    >
      {{ totalCount }} row(s) total.
    </div>

    <Pagination
      v-slot="{ page }"
      :items-per-page="pageSize"
      :total="totalCount"
      :sibling-count="1"
      show-edges
      :default-page="currentPage + 1"
      @update:page="$emit('page-change', $event - 1)"
    >
      <PaginationList
        v-slot="{ items }"
        class="flex items-center gap-1"
      >
        <PaginationFirst />
        <PaginationPrev />

        <template v-for="(item, index) in items">
          <PaginationListItem
            v-if="item.type === 'page'"
            :key="index"
            :value="item.value"
            as-child
          >
            <Button
              class="h-10 w-10 p-0"
              :variant="item.value === page ? 'default' : 'outline'"
            >
              {{ item.value }}
            </Button>
          </PaginationListItem>
          <PaginationEllipsis
            v-else
            :key="item.type"
            :index="index"
          />
        </template>

        <PaginationNext />
        <PaginationLast />
      </PaginationList>
    </Pagination>
  </div>
</template>

<script setup lang="ts">
  import {
    Pagination,
    PaginationEllipsis,
    PaginationFirst,
    PaginationLast,
    PaginationList,
    PaginationListItem,
    PaginationNext,
    PaginationPrev,
  } from '@/components/ui/pagination'
  import { Button } from '@/components/ui/button'

  defineProps<{
    currentPage: number
    pageSize: number
    totalCount: number
    selectedCount?: number
  }>()

  defineEmits<{
    'page-change': [page: number]
  }>()
</script>
