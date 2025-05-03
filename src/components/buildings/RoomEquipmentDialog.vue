<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{{ roomEquipment ? 'Edit Room Equipment' : 'Add Equipment to Room' }}</DialogTitle>
        <DialogDescription>
          {{ roomEquipment ? 'Update room equipment details.' : 'Add equipment to this room.' }}
        </DialogDescription>
      </DialogHeader>
      <form @submit.prevent="handleSubmit">
        <div class="grid gap-4 py-4">
          <!-- Room (read-only) -->
          <div class="grid grid-cols-4 items-center gap-4">
            <Label class="text-right">Room</Label>
            <div class="col-span-3 text-sm px-3 py-2 rounded-md border bg-muted/50">
              {{ roomName }}
            </div>
          </div>
          
          <!-- Equipment Selection -->
          <div class="grid grid-cols-4 items-center gap-4">
            <Label class="text-right">Equipment</Label>
            <div class="col-span-3">
              <Popover v-model:open="commandOpen">
                <PopoverTrigger as-child>
                  <Button
                    variant="outline"
                    role="combobox"
                    :aria-expanded="commandOpen"
                    class="w-full justify-between"
                    :disabled="isLoading"
                  >
                    {{ selectedEquipment ? selectedEquipment.name : 'Select equipment...' }}
                    <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent class="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search equipment..." />
                    <CommandEmpty>No equipment found.</CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        <CommandItem
                          v-for="equipment in availableEquipment"
                          :key="equipment.id"
                          :value="equipment.name"
                          @select="onEquipmentSelect(equipment)"
                        >
                          <Check
                            :class="cn(
                              'mr-2 h-4 w-4',
                              selectedEquipment?.id === equipment.id ? 'opacity-100' : 'opacity-0',
                            )"
                          />
                          {{ equipment.name }}
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <!-- Count/Quantity -->
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="count" class="text-right">Count</Label>
            <Input
              id="count"
              v-model.number="form.count"
              type="number"
              min="1"
              placeholder="Count"
              class="col-span-3"
              :disabled="isLoading"
              required
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" @click="$emit('update:open', false)" :disabled="isLoading">
            Cancel
          </Button>
          <Button type="submit" :disabled="isLoading || !selectedEquipment">
            <Loader2Icon v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
            {{ roomEquipment ? 'Update' : 'Add to Room' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2Icon } from 'lucide-vue-next'
import { Check, ChevronsUpDown } from 'lucide-vue-next'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useEquipmentStore } from '@/store/equipment'
import { components } from '@/types/schema'

type Equipment = components['schemas']['Equipment']
type RoomEquipmentRequest = components['schemas']['RoomEquipment']

// Props and emits
const props = defineProps<{
  open: boolean
  roomEquipment: RoomEquipmentRequest | null
  roomId: number
  roomName: string
  isLoading: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save': [roomEquipment: RoomEquipmentRequest]
}>()

const equipmentStore = useEquipmentStore()
const availableEquipment = ref<Equipment[]>([])

const form = ref({
  count: 1,
})

const commandOpen = ref(false)
const selectedEquipment = ref<Equipment | null>(null)

function onEquipmentSelect(equipment: Equipment) {
  selectedEquipment.value = equipment
  commandOpen.value = false
}

onMounted(async () => {
  if (props.open && equipmentStore.equipment.length === 0) {
    await equipmentStore.fetchEquipment()
  }
  availableEquipment.value = equipmentStore.equipment
})

watch(
  () => [props.open, props.roomEquipment],
  async () => {
    if (props.open) {
      if (equipmentStore.equipment.length === 0) {
        await equipmentStore.fetchEquipment()
      }
      availableEquipment.value = equipmentStore.equipment
      
      if (props.roomEquipment) {
        form.value.count = props.roomEquipment.count

        selectedEquipment.value = availableEquipment.value.find(
          e => e.id === props.roomEquipment?.equipment
        ) || null
      } else {
        form.value.count = 1
        selectedEquipment.value = null
      }
    }
  },
  { immediate: true }
)

const handleSubmit = () => {
  if (!selectedEquipment.value) return
  
  emit('save', {
    equipment: selectedEquipment.value.id!,
    room: props.roomId,
    count: form.value.count
  })
}
</script>
