import { h } from 'vue'
import { Requirement } from '@/types.ts'
import { ColumnDef } from '@tanstack/vue-table'

export const columns: ColumnDef<Requirement>[] = [
  {
    accessorKey: 'type',
    header: () => h('div', 'Type'),
    cell: ({ row }) => h('div', row.getValue('type')),
  },
  {
    accessorKey: 'subject',
    header: () => h('div', 'Subject'),
    cell: ({ row }) => h('div', row.getValue('subject')),
  },
  {
    accessorKey: 'createdAt',
    header: () => h('div', { class: 'text-right' }, 'Created At'),
    cell: ({ row }) => {
      // format date
      console.log(row.getValue('createdAt'))
      const date = new Date(row.getValue('createdAt'))
      return h('div', { class: 'text-right' }, date.toLocaleDateString())
    },
  },
]
