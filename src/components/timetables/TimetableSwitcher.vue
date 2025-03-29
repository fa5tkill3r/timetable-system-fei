<template>
  <div class="flex gap-2 items-center">
    <span class="text-sm font-medium">Timetable:</span>
    
    <!-- Timetable Selector Dropdown -->
    <Popover v-model:open="open">
      <PopoverTrigger as-child>
        <Button
          variant="outline"
          role="combobox"
          :aria-expanded="open"
          class="min-w-[200px] justify-between border border-input"
        >
          {{ selectedName || "Select timetable..." }}
          <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-[300px] p-0">
        <div class="relative">
          <!-- Search input without using Command component's built-in search -->
          <div class="flex items-center border-b px-3">
            <Search class="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              class="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Search timetables..."
              v-model="searchQuery"
            />
          </div>
          
          <Command>
            <div class="py-2 empty:hidden">
              <!-- Empty state handling -->
              <div v-if="filteredTimetables.length === 0" class="py-6 text-center text-sm text-muted-foreground">
                {{ timetables.length === 0 ? 'No timetables available.' : 'No matching timetables found.' }}
              </div>
              
              <!-- Filtered timetables list -->
              <CommandGroup v-else>
                <CommandItem
                  v-for="timetable in filteredTimetables"
                  :key="timetable.id"
                  :value="String(timetable.id)"
                  @select="() => selectTimetable(timetable)"
                >
                  <Check
                    :class="cn(
                      'mr-2 h-4 w-4',
                      selectedId === timetable.id ? 'opacity-100' : 'opacity-0'
                    )"
                  />
                  <div class="flex flex-col w-full">
                    <div class="font-medium">{{ timetable.name }}</div>
                    <div class="text-xs text-muted-foreground flex gap-2">
                      <span v-if="timetable.owner">By: {{ timetable.owner }}</span>
                      <span v-if="timetable.program">{{ timetable.program }}</span>
                      <Badge 
                        size="sm"
                        :variant="timetable.status === 'published' ? 'success' : 
                                timetable.status === 'draft' ? 'secondary' : 'warning'"
                        class="ml-auto"
                      >{{ timetable.status }}</Badge>
                    </div>
                  </div>
                </CommandItem>
              </CommandGroup>
            </div>
          </Command>
        </div>
      </PopoverContent>
    </Popover>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { cn } from '@/lib/utils'
import { Check, ChevronsUpDown, Search } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

// Define props and emits
const props = defineProps<{
  timetables: Array<any>
  selectedId: number | null
  selectedName: string
}>()

const emit = defineEmits<{
  'select': [value: number]
}>()

// Local state for popover and search
const open = ref(false)
const searchQuery = ref('')

// Filter timetables based on search query
const filteredTimetables = computed(() => {
  if (!searchQuery.value.trim()) {
    return props.timetables;
  }
  
  const query = searchQuery.value.trim().toLowerCase();
  
  return props.timetables.filter(timetable => {
    if (!timetable) return false;
    
    const nameMatch = timetable.name && 
      String(timetable.name).toLowerCase().includes(query);
    
    const ownerMatch = timetable.owner && 
      String(timetable.owner).toLowerCase().includes(query);
    
    const programMatch = timetable.program && 
      String(timetable.program).toLowerCase().includes(query);
    
    return nameMatch || ownerMatch || programMatch;
  });
})

// Method to handle timetable selection
function selectTimetable(timetable: any) {
  emit('select', timetable.id)
  open.value = false
  searchQuery.value = '' // Clear search on selection
}

// Reset search when popup opens/closes
watch(() => open.value, (isOpen) => {
  if (!isOpen) {
    // Small delay to prevent seeing the reset while closing
    setTimeout(() => {
      searchQuery.value = ''
    }, 100)
  }
})
</script>
