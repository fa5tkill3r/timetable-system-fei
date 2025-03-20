<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{{ equipment ? 'Edit Equipment' : 'Add Equipment' }}</DialogTitle>
        <DialogDescription>
          {{ equipment ? 'Update equipment details.' : 'Add new equipment to the room.' }}
        </DialogDescription>
      </DialogHeader>
      <form @submit.prevent="handleSubmit">
        <div class="grid gap-4 py-4">
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="name" class="text-right">Name</Label>
            <Input
              id="name"
              v-model="form.name"
              placeholder="Equipment name"
              class="col-span-3"
              :disabled="isLoading"
              required
            />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="type" class="text-right">Type</Label>
            <Select v-model="form.type" :disabled="isLoading" required>
              <SelectTrigger class="col-span-3">
                <SelectValue placeholder="Select equipment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="computer">Computer</SelectItem>
                <SelectItem value="projector">Projector</SelectItem>
                <SelectItem value="whiteboard">Whiteboard</SelectItem>
                <SelectItem value="furniture">Furniture</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
          <Button type="submit" :disabled="isLoading">
            <Loader2Icon v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
            {{ equipment ? 'Update' : 'Create' }}
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2Icon } from 'lucide-vue-next'
import { components } from 'schema'

type Equipment = components['schemas']['Equipment']

// Props and emits
const props = defineProps<{
  open: boolean
  equipment: Equipment | null
  roomId: number | null
  isLoading: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save': [equipment: { 
    name: string 
    type: string
    count: number
    room_id: number
  }]
}>()

// Form state
const form = ref({
  name: '',
  type: 'computer',
  count: 1,
})

// Reset form when dialog opens or equipment changes
watch(
  () => [props.open, props.equipment],
  () => {
    if (props.open) {
      if (props.equipment) {
        form.value.name = props.equipment.name
        form.value.type = props.equipment.type
        form.value.count = props.equipment.count
      } else {
        form.value.name = ''
        form.value.type = 'computer'
        form.value.count = 1
      }
    }
  },
  { immediate: true }
)

// Submit form
const handleSubmit = () => {
  if (!props.roomId) return
  
  emit('save', {
    name: form.value.name,
    type: form.value.type,
    count: form.value.count,
    room_id: props.roomId
  })
}
</script>
