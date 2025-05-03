<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{{ room ? 'Edit Room' : 'Create Room' }}</DialogTitle>
        <DialogDescription>
          {{ room ? 'Update room details.' : 'Add a new room to the building.' }}
        </DialogDescription>
      </DialogHeader>
      <form @submit.prevent="handleSubmit">
        <div class="grid gap-4 py-4">
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="name" class="text-right">Name</Label>
            <Input
              id="name"
              v-model="form.name"
              placeholder="Room name"
              class="col-span-3"
              :disabled="isLoading"
              required
            />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="capacity" class="text-right">Capacity</Label>
            <Input
              id="capacity"
              v-model.number="form.capacity"
              type="number"
              min="0"
              placeholder="Room capacity"
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
          <Button type="submit" :disabled="isLoading">
            <Loader2Icon v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
            {{ room ? 'Update' : 'Create' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2Icon } from 'lucide-vue-next'
import { components } from '@/types/schema'

type Room = components['schemas']['Room']
type RoomRequest = components['schemas']['RoomRequest']

// Props and emits
const props = defineProps<{
  open: boolean
  room: Room | null
  buildingId: number | null
  isLoading: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save': [room: RoomRequest]
}>()

// Form state
const form = ref({
  name: '',
  capacity: 0,
})

// Reset form when dialog opens or room changes
watch(
  () => [props.open, props.room],
  () => {
    if (props.open) {
      if (props.room) {
        form.value.name = props.room.name
        form.value.capacity = props.room.capacity
      } else {
        form.value.name = ''
        form.value.capacity = 0
      }
    }
  },
  { immediate: true }
)

// Submit form
const handleSubmit = () => {
  if (!props.buildingId) return

  emit('save', {
    name: form.value.name,
    capacity: form.value.capacity,
    building: props.buildingId,
  })
}
</script>
