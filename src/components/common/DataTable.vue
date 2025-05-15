<template>
  <div class="space-y-4">
    <!-- Search and filters -->
    <div class="flex items-center gap-2">
      <Input
        v-if="enableSearch"
        class="max-w-sm"
        :placeholder="searchPlaceholder"
        :model-value="searchTerm"
        @update:model-value="$emit('searchChange', $event.toString())"
      />
      <slot name="toolbar"></slot>
      <DropdownMenu v-if="enableColumnVisibility">
        <DropdownMenuTrigger as-child>
          <Button
            variant="outline"
            class="ml-auto"
          >
            Columns <ChevronDown class="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuCheckboxItem
            v-for="column in table
              .getAllColumns()
              .filter((column) => column.getCanHide())"
            :key="column.id"
            class="capitalize"
            :checked="column.getIsVisible()"
            @select="column.toggleVisibility()"
          >
            {{ column.id }}
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <!-- Loading State -->
    <div
      v-if="isLoading && !table.getRowModel().rows.length"
      class="flex justify-center py-8"
    >
      <div
        class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
      ></div>
    </div>

    <!-- Table -->
    <div
      v-else
      class="rounded-md border"
    >
      <Table>
        <TableHeader>
          <TableRow
            v-for="headerGroup in table.getHeaderGroups()"
            :key="headerGroup.id"
          >
            <TableHead
              v-for="header in headerGroup.headers"
              :key="header.id"
            >
              <FlexRender
                v-if="!header.isPlaceholder"
                :render="header.column.columnDef.header"
                :props="header.getContext()"
              />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="table.getRowModel().rows?.length">
            <TableRow
              v-for="row in table.getRowModel().rows"
              :key="row.id"
              :data-state="row.getIsSelected() && 'selected'"
              @click="onRowClick(row)"
            >
              <TableCell
                v-for="cell in row.getVisibleCells()"
                :key="cell.id"
              >
                <FlexRender
                  :render="cell.column.columnDef.cell"
                  :props="cell.getContext()"
                />
              </TableCell>
            </TableRow>
          </template>
          <TableRow v-else>
            <TableCell
              :colspan="columns.length"
              class="h-24 text-center"
            >
              <slot name="empty"> No results found. </slot>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Selection Actions -->
    <div
      v-if="enableSelection && table.getSelectedRowModel().rows.length > 0"
      class="flex items-center justify-between rounded-md border bg-muted/40 p-4"
    >
      <div class="text-sm">
        <span class="font-medium">{{
          table.getSelectedRowModel().rows.length
        }}</span>
        row(s) selected.
      </div>
      <slot name="selection-actions"></slot>
    </div>

    <!-- Pagination -->
    <slot
      name="pagination"
      :filtered-count="table.getFilteredRowModel().rows.length"
      :selected-count="table.getFilteredSelectedRowModel().rows.length"
    >
    </slot>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { Input } from '@/components/ui/input'
  import { Button } from '@/components/ui/button'
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '@/components/ui/table'
  import { ChevronDown } from 'lucide-vue-next'
  import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu'
  import {
    FlexRender,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    useVueTable,
    type ColumnDef,
    type SortingState,
    type ColumnFiltersState,
    type VisibilityState,
    type Row,
  } from '@tanstack/vue-table'
  import { valueUpdater } from '@/lib/utils'

  const props = defineProps<{
    data: any[]
    columns: ColumnDef<any>[]
    isLoading?: boolean
    pageIndex?: number
    pageSize?: number
    searchTerm?: string
    initialColumnVisibility?: VisibilityState

    enableSearch?: boolean
    enableSelection?: boolean
    enablePagination?: boolean
    enableColumnVisibility?: boolean
    enableRowClick?: boolean
    searchPlaceholder?: string
  }>()

  const emit = defineEmits<{
    'update:pageIndex': [index: number]
    'update:pageSize': [size: number]
    searchChange: [term: string]
    rowClick: [row: any]
    selectionChange: [selectedRows: Record<string, boolean>]
  }>()

  const sorting = ref<SortingState>([])
  const columnFilters = ref<ColumnFiltersState>([])
  const columnVisibility = ref<VisibilityState>(
    props.initialColumnVisibility || {},
  )
  const rowSelection = ref<Record<string, boolean>>({})

  const table = useVueTable({
    get data() {
      return props.data
    },
    columns: props.columns,
    state: {
      get sorting() {
        return sorting.value
      },
      get columnFilters() {
        return columnFilters.value
      },
      get columnVisibility() {
        return columnVisibility.value
      },
      get rowSelection() {
        return rowSelection.value
      },
      get pagination() {
        return {
          pageIndex: props.pageIndex || 0,
          pageSize: props.pageSize || 10,
        }
      },
      get globalFilter() {
        return props.searchTerm
      },
    },
    onSortingChange: (updaterOrValue) => valueUpdater(updaterOrValue, sorting),
    onColumnFiltersChange: (updaterOrValue) =>
      valueUpdater(updaterOrValue, columnFilters),
    onColumnVisibilityChange: (updaterOrValue) => {
      valueUpdater(updaterOrValue, columnVisibility)
    },
    onRowSelectionChange: (updaterOrValue) => {
      valueUpdater(updaterOrValue, rowSelection)
      emit('selectionChange', rowSelection.value)
    },
    enableRowSelection: props.enableSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
  })

  function onRowClick(row: Row<any>) {
    if (props.enableRowClick) {
      emit('rowClick', row.original)
    }
  }

  watch(
    () => props.pageIndex,
    (newValue) => {
      if (newValue !== undefined) {
        table.setPageIndex(newValue)
      }
    },
    { immediate: true },
  )

  watch(
    () => props.pageSize,
    (newValue) => {
      if (newValue) {
        table.setPageSize(newValue)
      }
    },
    { immediate: true },
  )

  defineExpose({
    table,
  })
</script>
