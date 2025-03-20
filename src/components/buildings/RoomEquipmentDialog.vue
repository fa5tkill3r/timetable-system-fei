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
              <Combobox v-model="selectedEquipment" by="id" :disabled="isLoading">
                <ComboboxAnchor as-child>
                  <ComboboxTrigger as-child>
                    <Button variant="outline" class="w-full justify-between" :disabled="isLoading">
                      {{ selectedEquipment?.name ?? 'Select equipment' }}
                      <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </ComboboxTrigger>
                </ComboboxAnchor>

                <ComboboxList>
                  <div class="relative w-full items-center">
                    <ComboboxInput class="pl-9 focus-visible:ring-0 border-0 border-b rounded-none h-10" 
                      placeholder="Search equipment..." />
                    <span class="absolute start-0 inset-y-0 flex items-center justify-center px-3">
                      <Search class="size-4 text-muted-foreground" />
                    </span>
                  </div>

                  <ComboboxEmpty>
                    No equipment found.
                  </ComboboxEmpty>

                  <ComboboxGroup>
                    <ComboboxItem
                      v-for="equipment in availableEquipment"
                      :key="equipment.id"
                      :value="equipment"
                    >
                      {{ equipment.name }}
                      <ComboboxItemIndicator>
                        <Check class="ml-auto h-4 w-4" />
                      </ComboboxItemIndicator>
                    </ComboboxItem>
                  </ComboboxGroup>
                </ComboboxList>
              </Combobox>
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
import { Check, ChevronsUpDown, Search } from 'lucide-vue-next'
import { 
  Combobox, 
  ComboboxAnchor, 
  ComboboxEmpty, 
  ComboboxGroup, 
  ComboboxInput, 
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList, 
  ComboboxTrigger 
} from '@/components/ui/combobox'
import { useEquipmentStore } from '@/store/equipment'
import { components } from 'schema'

type Equipment = components['schemas']['Equipment']
type RoomEquipment = components['schemas']['RoomEquipment']

// Props and emits
const props = defineProps<{
  open: boolean
  roomEquipment: RoomEquipment | null
  roomId: number
  roomName: string
  isLoading: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save': [roomEquipment: { 
    equipment_id: number 
    room_id: number
    count: number
  }]
}>()

// Equipment store
const equipmentStore = useEquipmentStore()
const availableEquipment = ref<Equipment[]>([])

// Form state
const form = ref({
  count: 1,
})

// Selected equipment
const selectedEquipment = ref<Equipment | null>(null)

// Fetch available equipment
onMounted(async () => {
  if (props.open && equipmentStore.equipment.length === 0) {
    await equipmentStore.fetchEquipment()
  }
  availableEquipment.value = equipmentStore.equipment
})

// Reset form when dialog opens or roomEquipment changes
watch(
  () => [props.open, props.roomEquipment],
  async () => {
    if (props.open) {
      // Ensure we have equipment data
      if (equipmentStore.equipment.length === 0) {
        await equipmentStore.fetchEquipment()
      }
      availableEquipment.value = equipmentStore.equipment
      
      if (props.roomEquipment) {
        form.value.count = props.roomEquipment.count
        // Find the equipment by ID
        selectedEquipment.value = equipmentStore.equipment.find(
          e => e.id === props.roomEquipment?.equipment_id
        ) || null
      } else {
        form.value.count = 1
        selectedEquipment.value = null
      }
    }
  },
  { immediate: true }
)

// Submit form
const handleSubmit = () => {
  if (!selectedEquipment.value) return
  
  emit('save', {
    equipment_id: selectedEquipment.value.id,
    room_id: props.roomId,
    count: form.value.count
  })
}
</script>
