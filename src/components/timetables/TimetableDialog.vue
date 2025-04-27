<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{{ timetable ? 'Edit Timetable' : 'Create Timetable' }}</DialogTitle>
        <DialogDescription>
          {{ timetable ? 'Update timetable details.' : 'Create a new timetable.' }}
        </DialogDescription>
      </DialogHeader>
      <form @submit.prevent="handleSubmit">
        <div class="grid gap-4 py-4">
          <!-- Name -->
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="name" class="text-right">Name</Label>
            <Input
              id="name"
              v-model="form.name"
              placeholder="Timetable name"
              class="col-span-3"
              :disabled="isLoading"
              required
            />
          </div>
          
          <!-- Status -->
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="status" class="text-right">Status</Label>
            <Select v-model="form.status" :disabled="isLoading">
              <SelectTrigger class="col-span-3">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WIP">WIP</SelectItem>
                <SelectItem value="PUBLISHED">Pending</SelectItem>
                <SelectItem value="HIDDEN">Hidden</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" @click="$emit('update:open', false)" :disabled="isLoading">
            Cancel
          </Button>
          <Button type="submit" :disabled="isLoading">
            <Loader2Icon v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
            {{ timetable ? 'Update' : 'Create' }}
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2Icon } from 'lucide-vue-next'
import { components } from 'schema'

type Timetable = components['schemas']['TT']
type TimetableRequest = components['schemas']['TTRequest']

// Props and emits
const props = defineProps<{
  open: boolean
  timetable: Timetable | null
  isLoading: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save': [timetable: TimetableRequest]
}>()

// Form state
const form = ref<TimetableRequest>({
  name: '',
  status: 'WIP',
  owner: 111407, // TODO: Replace with logged-in user ID
})

// Reset form when dialog opens or timetable changes
watch(
  () => [props.open, props.timetable],
  () => {
    if (props.open) {
      if (props.timetable) {
        form.value.name = props.timetable.name || ''
        form.value.status = props.timetable.status || 'WIP'
      } else {
        form.value.name = ''
        form.value.status = 'WIP'
      }
    }
  },
  { immediate: true }
)

// Submit form
const handleSubmit = () => {
  emit('save', {
    name: form.value.name,
    status: form.value.status,
    owner: form.value.owner,
  })
}
</script>
