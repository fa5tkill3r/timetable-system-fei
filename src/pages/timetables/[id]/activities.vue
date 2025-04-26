<script setup lang="ts">
import { ref, computed, onMounted, h, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useTimetableEventStore } from '@/store/timetableEvents'
import { useTimetableStore } from '@/store/timetables'
import { useSubjectStore } from '@/store/subjects'
import { useSubjectUserRoleStore } from '@/store/subjectUserRoles'
import { useTTEventTypeStore } from '@/store/ttEventTypes'
import { useToast } from '@/components/ui/toast/use-toast'
import { Button } from '@/components/ui/button'
import { PencilIcon, TrashIcon, ArrowUpDown, CalendarIcon, ChevronLeft, Clock, ZapIcon } from 'lucide-vue-next'
import DataTable from '@/components/common/DataTable.vue'
import { Checkbox } from '@/components/ui/checkbox'
import { type ColumnDef } from '@tanstack/vue-table'
import { components } from 'schema'
import TablePagination from '@/components/common/TablePagination.vue'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import ComboBoxFilter from '@/components/common/ComboBoxFilter.vue'
import ConfirmDeleteDialog from '@/components/dialogs/ConfirmDeleteDialog.vue'
import GenerateEventsDialog from '@/components/dialogs/GenerateEventsDialog.vue'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useSubjectGroupStore } from '@/store/subjectGroups'

type TTEvent = components['schemas']['TTEvent']
type TTEventType = components['schemas']['TTEventType']
type User = components['schemas']['User']
type Room = components['schemas']['Room']
type Subject = components['schemas']['Subject']


const route = useRoute('/timetables/[id]/activities')
const timetableId = Number(route.params.id)
const timetableEventStore = useTimetableEventStore()
const timetableStore = useTimetableStore()
const subjectStore = useSubjectStore()
const subjectUserRoleStore = useSubjectUserRoleStore()
const ttEventTypeStore = useTTEventTypeStore()
const { toast } = useToast()
const events = computed(() => timetableEventStore.events)
const searchTerm = ref('')
const pageIndex = ref(0)
const pageSize = ref(10)
const selectedRows = ref({})
const subjectGroupStore = useSubjectGroupStore()


const selectedRoomIds = ref<(string | number)[]>([])
const selectedSubjectIds = ref<(string | number)[]>([])
const selectedLecturerIds = ref<(string | number)[]>([])
const selectedDays = ref<(string | number)[]>([])
const selectedGroups = ref<(string | number)[]>([])
const selectedTypes = ref<(string | number)[]>([])
const selectedStatuses = ref<string[]>([])


const deleteDialogVisible = ref(false)
const dialogLoading = ref(false)
const deleteDialogTitle = ref('')
const deleteDialogDescription = ref('')
const itemToDelete = ref<number | null>(null)


const generateDialogVisible = ref(false)


const currentTimetable = computed(() =>
  timetableStore.timetables.find(t => t.id === timetableId)
)


const daysOfWeek = [
  { label: 'Monday', value: 'MON' },
  { label: 'Tuesday', value: 'TUE' },
  { label: 'Wednesday', value: 'WED' },
  { label: 'Thursday', value: 'THU' },
  { label: 'Friday', value: 'FRI' },
  { label: 'Saturday', value: 'SAT' },
  { label: 'Sunday', value: 'SUN' },
]


const getSubjectById = (subjectId: number) => {
  return subjectStore.subjects.find(subject => subject.id === subjectId)
}


const getLecturersForSubject = (subjectId: number) => {
  return subjectUserRoleStore.getLecturersForSubject(subjectId)
}


const formatLecturerNames = (subjectId: number) => {
  const lecturers = getLecturersForSubject(subjectId)
  if (!lecturers.length) return 'No lecturer assigned'

  return lecturers
    .map(lecturer => (lecturer.user as any as User)?.full_name || (lecturer.user as any as User)?.username || 'Unknown')
    .join(', ')
}


const getEventTypeById = (eventTypeId: number) => {
  return ttEventTypeStore.getEventTypeById(eventTypeId)
}


const getSubjectGroups = (subjectId: number) => {
  return subjectGroupStore.getGroupsBySubject(subjectId)
}


const formatGroupNames = (subjectId: number) => {
  const groups = getSubjectGroups(subjectId)
  if (!groups.length) return 'No group assigned'

  return groups
    .map(group => group.name)
    .join(', ')
}


const roomOptions = computed(() => {
  const roomsSet = new Set<number>()
  const options: { label: string, value: number }[] = []

  events.value.forEach(event => {
    if (event.room && !roomsSet.has(event.room)) {
      roomsSet.add(event.room)
      options.push({
        label: `Room ${event.room}`,
        value: event.room
      })
    }
  })

  return options
})


const subjectOptions = computed(() => {
  const subjectsSet = new Set<number>()
  const options: { label: string, value: number }[] = []

  events.value.forEach(event => {
    // Cast tta to any to avoid type issues
    const tta = event.tta as any
    if (tta?.subject && !subjectsSet.has(tta.subject)) {
      const subjectId = tta.subject
      subjectsSet.add(subjectId)

      const subject = getSubjectById(subjectId)
      options.push({
        label: subject ? subject.name : `Subject ${subjectId}`,
        value: subjectId
      })
    }
  })

  return options
})

const groupOptions = computed(() => {
  const groupsSet = new Set<string>()
  const options: { label: string, value: string }[] = []


  const subjectIds = new Set<number>()
  events.value.forEach(event => {
    if ((event.tta as any)?.subject) {
      subjectIds.add((event.tta as any).subject)
    }
  })


  subjectIds.forEach(subjectId => {
    const groups = subjectGroupStore.getGroupsBySubject(subjectId)
    groups.forEach(group => {
      if (group.name && !groupsSet.has(group.name)) {
        groupsSet.add(group.name)
        options.push({
          label: group.name,
          value: group.name
        })
      }
    })
  })

  return options
})


const typeOptions = computed(() => {
  return ttEventTypeStore.eventTypes.map((type: TTEventType) => ({
    label: type.name,
    value: type.id
  }))
})


const statusOptions = [
  { label: 'Placed', value: 'placed' },
  { label: 'Unplaced', value: 'unplaced' }
]


const lecturerOptions = computed(() => {
  const lecturers = subjectUserRoleStore.lecturers
  const uniqueLecturers = new Map()

  lecturers.forEach(lecturer => {
    const user = lecturer.user as any as User
    if (user?.id && !uniqueLecturers.has(user.id)) {
      uniqueLecturers.set(user.id, {
        label: user.full_name || user.username || `User ${user.id}`,
        value: user.id
      })
    }
  })

  return Array.from(uniqueLecturers.values())
})


const isFiltered = computed(() =>
  selectedRoomIds.value.length > 0 ||
  selectedSubjectIds.value.length > 0 ||
  selectedLecturerIds.value.length > 0 ||
  selectedDays.value.length > 0 ||
  selectedGroups.value.length > 0 ||
  selectedTypes.value.length > 0 ||
  selectedStatuses.value.length > 0 ||
  searchTerm.value.trim() !== ''
)


const filteredEvents = computed(() => {
  let result = [...events.value]


  if (searchTerm.value && searchTerm.value.trim() !== '') {
    const query = searchTerm.value.toLowerCase().trim()

    result = result.filter(event => {

      if (!event) return false


      if (!event.tta) return false

      const subjectId = (event.tta as any).subject
      if (!subjectId) return false

      const subject = getSubjectById(subjectId)


      const subjectName = subject?.name?.toLowerCase() || ''
      const subjectCode = subject?.code?.toLowerCase() || ''


      const lecturers = getLecturersForSubject(subjectId)
      const lecturerNames = lecturers.map(lecturer =>
        (lecturer.user as any as User)?.full_name?.toLowerCase() ||
        (lecturer.user as any as User)?.username?.toLowerCase() ||
        ''
      ).join(' ')


      const groups = getSubjectGroups(subjectId)
      const groupNames = groups.map(group => (group.name || '').toLowerCase()).join(' ')


      const foundInSubject = subjectName.indexOf(query) !== -1
      const foundInCode = subjectCode.indexOf(query) !== -1
      const foundInLecturer = lecturerNames.indexOf(query) !== -1
      const foundInGroup = groupNames.indexOf(query) !== -1

      return foundInSubject || foundInCode || foundInLecturer || foundInGroup
    })

  }


  if (selectedRoomIds.value.length > 0) {
    result = result.filter(event =>
      event.room && selectedRoomIds.value.includes(event.room)
    )
  }


  if (selectedSubjectIds.value.length > 0) {
    result = result.filter(event =>
      (event.tta as any)?.subject && selectedSubjectIds.value.includes((event.tta as any).subject)
    )
  }


  if (selectedLecturerIds.value.length > 0) {
    result = result.filter(event => {
      if (!(event.tta as any)?.subject) return false

      const lecturers = getLecturersForSubject((event.tta as any).subject)
      return lecturers.some(lecturer =>
        (lecturer.user as any as User)?.id && selectedLecturerIds.value.includes((lecturer.user as any as User).id!)
      )
    })
  }


  if (selectedDays.value.length > 0) {
    result = result.filter(event =>
      event.day_of_week && selectedDays.value.includes(event.day_of_week)
    )
  }


  if (selectedGroups.value.length > 0) {
    result = result.filter(event => {
      if (!(event.tta as any)?.subject) return false

      const groups = getSubjectGroups((event.tta as any).subject)
      return groups.some(group =>
        group.name && selectedGroups.value.includes(group.name)
      )
    })
  }


  if (selectedTypes.value.length > 0) {
    result = result.filter(event =>
      (event.tta as any)?.event_type && selectedTypes.value.includes((event.tta as any).event_type)
    )
  }


  if (selectedStatuses.value.length > 0) {
    result = result.filter(event => {
      const isPlaced = event.day_of_week && event.start_time && event.room

      if (selectedStatuses.value.includes('placed') && isPlaced) return true
      if (selectedStatuses.value.includes('unplaced') && !isPlaced) return true
      return false
    })
  }

  return result
})


function visualizeWeeksBitmask(bitmask: number) {

  const binaryString = bitmask.toString(2).padStart(12, '0');


  return Array.from(binaryString).map((bit, index) => {
    return bit === '1' ? '●' : '○';
  }).join('');
}


const initialColumnVisibility = ref({
  'subject_code': false,
  'day_of_week': false,
  'time': false,
  'room': false
})


const columns: ColumnDef<TTEvent>[] = [
  {
    id: 'select',
    header: ({ table }) => h(Checkbox, {
      'modelValue': table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
      'onUpdate:modelValue': (value: boolean) => table.toggleAllPageRowsSelected(!!value),
      'ariaLabel': 'Select all',
    }),
    cell: ({ row }) => h(Checkbox, {
      'modelValue': row.getIsSelected(),
      'onUpdate:modelValue': (value: boolean) => row.toggleSelected(!!value),
      'ariaLabel': 'Select row',
    }),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const event = row.original
      const isPlaced = event.day_of_week && event.start_time && event.room

      return h(Badge, {
        variant: isPlaced ? 'default' : 'secondary',
        class: isPlaced ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
      }, () => isPlaced ? 'Placed' : 'Unplaced')
    },
  },
  {
    accessorKey: 'tta.subject',
    header: 'Subject',
    cell: ({ row }) => {
      const ttaData = row.original.tta as any
      if (!ttaData) return 'No subject'

      const subjectId = ttaData.subject
      if (!subjectId) return 'No subject'

      const subject = getSubjectById(subjectId)
      return subject ? subject.name : `Subject ${subjectId}`
    },
  },
  {
    accessorKey: 'tta.subject',
    header: 'Code',
    id: 'subject_code',
    enableHiding: true,
    cell: ({ row }) => {
      const ttaData = row.original.tta as any
      if (!ttaData) return '—'

      const subjectId = ttaData.subject
      if (!subjectId) return '—'

      const subject = getSubjectById(subjectId)
      return subject ? subject.code : '—'
    },
  },
  {
    accessorKey: 'tta.subject',
    header: 'Group',
    id: 'subject_group',
    cell: ({ row }) => {
      const ttaData = row.original.tta as any
      if (!ttaData) return '—'

      const subjectId = ttaData.subject
      if (!subjectId) return '—'

      return formatGroupNames(subjectId)
    },
  },
  {
    accessorKey: 'tta.event_type',
    header: 'Type',
    cell: ({ row }) => {
      const ttaData = row.original.tta as any
      if (!ttaData?.event_type) return 'Not specified'

      const eventType = getEventTypeById(ttaData.event_type)
      return eventType ? eventType.name : `Type ${ttaData.event_type}`
    },
  },
  {
    accessorKey: 'staff',
    header: 'Lecturer',
    cell: ({ row }) => {
      const ttaData = row.original.tta as any
      if (!ttaData?.subject) return 'No lecturer'

      return formatLecturerNames(ttaData.subject)
    },
  },
  {
    accessorKey: 'duration',
    header: 'Duration',
    cell: ({ row }) => {
      const duration = row.getValue('duration')
      return duration ? `${duration} hours` : 'N/A'
    },
  },
  {
    accessorKey: 'day_of_week',
    header: 'Day',
    cell: ({ row }) => {
      const dayCode = row.getValue('day_of_week') as string
      if (!dayCode) return 'Not scheduled'
      const day = daysOfWeek.find(d => d.value === dayCode)?.label || dayCode
      return day
    },
  },
  {
    accessorKey: 'start_time',
    header: 'Time',
    id: 'time',
    cell: ({ row }) => {
      const startTime = row.getValue('start_time') as string
      if (!startTime) return 'Not scheduled'

      const endTime = row.original.end_time
      return `${startTime} - ${endTime || '?'}`
    },
  },
  {
    accessorKey: 'room',
    header: 'Room',
    cell: ({ row }) => {
      const roomId = row.getValue('room') as number
      return roomId ? `Room ${roomId}` : 'Not assigned'
    },
  },
  {
    accessorKey: 'weeks_bitmask',
    header: 'Weeks',
    cell: ({ row }) => {
      const bitmask = row.getValue('weeks_bitmask') as number
      if (!bitmask) return 'All weeks'


      return h('span', {
        class: 'font-mono',
        title: `Weeks bitmask: ${bitmask}`
      }, visualizeWeeksBitmask(bitmask))
    },
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const event = row.original

      return h('div', { class: 'flex justify-end space-x-2' }, [
        h(Button, {
          variant: 'outline',
          size: 'sm',
          onClick: () => editEvent(event),
        }, () => h(PencilIcon, { class: 'h-4 w-4' })),
        h(Button, {
          variant: 'outline',
          size: 'sm',
          onClick: () => confirmDeleteEvent(event),
        }, () => h(TrashIcon, { class: 'h-4 w-4' })),
      ])
    },
  },
]


const onPageChange = (page: number) => {
  pageIndex.value = page
}

const onSelectionChange = (selection: Record<string, boolean>) => {
  selectedRows.value = selection
}


function resetFilters() {
  selectedRoomIds.value = []
  selectedSubjectIds.value = []
  selectedLecturerIds.value = []
  selectedDays.value = []
  selectedGroups.value = []
  selectedTypes.value = []
  selectedStatuses.value = []
  searchTerm.value = ''
  pageIndex.value = 0
}


function editEvent(event: TTEvent) {

  toast({
    title: "Not implemented",
    description: "Event editing not implemented in this demo"
  })
}

function confirmDeleteEvent(event: TTEvent) {
  itemToDelete.value = event.id || null
  deleteDialogTitle.value = 'Delete Event'
  
  // Get subject name instead of using event.title
  const ttaData = event.tta as any
  const subjectId = ttaData?.subject
  const subject = subjectId ? getSubjectById(subjectId) : null
  const eventName = subject ? subject.name : 'this event'
  
  deleteDialogDescription.value = `Are you sure you want to delete "${eventName}"?`
  deleteDialogVisible.value = true
}


async function handleDelete() {
  if (!itemToDelete.value) return

  dialogLoading.value = true
  try {
    const success = await timetableEventStore.deleteEvent(itemToDelete.value, timetableId)

    if (success) {
      toast({ title: "Event deleted successfully" })
      deleteDialogVisible.value = false
    } else {
      toast({
        title: "Delete failed",
        description: "There was an error deleting the event.",
        variant: "destructive"
      })
    }
  } finally {
    dialogLoading.value = false
  }
}


function handleGenerateResult(result: { success: boolean, message: string }) {
  if (result.success) {
    toast({
      title: "Success",
      description: result.message
    })
  } else {
    toast({
      title: "Error",
      description: result.message,
      variant: "destructive"
    })
  }
}

onMounted(async () => {
  await timetableEventStore.fetchEvents(timetableId)
})
</script>

<template>
  <div class="flex-1 flex flex-col space-y-4 px-8 pt-6">
    <div class="flex items-center justify-between space-y-2">
      <div class="flex flex-col space-y-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink :href="'/timetables'">Timetables</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink :href="`/timetables/${timetableId}`">{{ currentTimetable?.name || 'Timetable' }}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Activities</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h2 class="text-3xl font-bold tracking-tight">
          {{ currentTimetable?.name || 'Timetable' }} Activities
        </h2>
      </div>
      <div class="flex items-center space-x-2">
        <Button>Add Activity</Button>
        <Button variant="outline" @click="generateDialogVisible = true">
          <ZapIcon class="mr-2 h-4 w-4" />
          Generate
        </Button>
      </div>
    </div>

    <!-- Filters -->
    <div class="space-y-2 p-2 border rounded-md bg-muted/40">
      <!-- Search input and first row of filters -->
      <div class="flex items-center space-x-2">
        <div class="relative">
          <Input placeholder="Search by subject, code or lecturer..." v-model="searchTerm"
            class="h-8 w-[300px] pr-16" />
          <div v-if="searchTerm.trim()"
            class="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
            {{ filteredEvents.length }} results
          </div>
        </div>

        <ComboBoxFilter title="Subject" :options="subjectOptions" v-model="selectedSubjectIds" />

        <ComboBoxFilter title="Group" :options="groupOptions" v-model="selectedGroups" />

        <ComboBoxFilter title="Type" :options="typeOptions" v-model="selectedTypes" />

        <ComboBoxFilter title="Status" :options="statusOptions" v-model="selectedStatuses" />

        <ComboBoxFilter title="Day" :options="daysOfWeek" v-model="selectedDays" />

        <ComboBoxFilter title="Room" :options="roomOptions" v-model="selectedRoomIds" />

        <ComboBoxFilter title="Lecturer" :options="lecturerOptions" v-model="selectedLecturerIds" />

        <Button v-if="isFiltered" variant="ghost" class="h-8 px-2 lg:px-3" @click="resetFilters">
          Reset all filters
          <TrashIcon class="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>

    <!-- Wrap DataTable in ScrollArea for proper scrolling -->
    <ScrollArea class="flex-1">
      <DataTable :data="filteredEvents" :columns="columns" :is-loading="timetableEventStore.isLoading"
        :page-index="pageIndex" :page-size="pageSize" :initialColumnVisibility="initialColumnVisibility"
        enable-selection enable-column-visibility @selection-change="onSelectionChange">
        <template #empty>
          <div class="text-center p-4">
            <p class="text-muted-foreground">No activities found</p>
            <Button variant="outline" class="mt-2">Create your first activity</Button>
          </div>
        </template>

        <template #selection-actions>
          <div class="space-x-2">
            <Button variant="outline" size="sm">
              Export Selected
            </Button>
            <Button variant="destructive" size="sm">
              Delete Selected
            </Button>
          </div>
        </template>

        <template #pagination="{ filteredCount, selectedCount }">
          <TablePagination :current-page="pageIndex" :page-size="pageSize" :total-count="filteredCount"
            :selected-count="selectedCount" @page-change="onPageChange" />
        </template>
      </DataTable>
    </ScrollArea>

    <!-- Dialogs -->
    <ConfirmDeleteDialog :open="deleteDialogVisible" :title="deleteDialogTitle" :description="deleteDialogDescription"
      :is-loading="dialogLoading" @update:open="deleteDialogVisible = $event" @confirm="handleDelete" />

    <GenerateEventsDialog :open="generateDialogVisible" :timetable="currentTimetable"
      :is-loading="timetableEventStore.isLoading" @update:open="generateDialogVisible = $event"
      @generate="handleGenerateResult" />
  </div>
</template>