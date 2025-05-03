<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{{ equipment ? 'Edit Equipment' : 'Add Equipment' }}</DialogTitle>
        <DialogDescription>
          {{ equipment ? 'Update equipment details.' : 'Add new equipment to the system.' }}
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
import { Loader2Icon } from 'lucide-vue-next'
import { components } from '@/types/schema'

type Equipment = components['schemas']['Equipment']

// Props and emits
const props = defineProps<{
  open: boolean
  equipment: Equipment | null
  isLoading: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save': [equipment: { name: string }]
}>()

// Form state
const form = ref({
  name: ''
})

// Reset form when dialog opens or equipment changes
watch(
  () => [props.open, props.equipment],
  () => {
    if (props.open) {
      if (props.equipment) {
        form.value.name = props.equipment.name
      } else {
        form.value.name = ''
      }
    }
  },
  { immediate: true }
)

// Submit form
const handleSubmit = () => {
  emit('save', {
    name: form.value.name
  })
}
</script>
