<template>
  <Dialog
    :open="open"
    @update:open="$emit('update:open', $event)"
  >
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{{
          building ? 'Edit Building' : 'Create Building'
        }}</DialogTitle>
        <DialogDescription>
          {{
            building
              ? 'Update building details.'
              : 'Add a new building to the system.'
          }}
        </DialogDescription>
      </DialogHeader>
      <form @submit.prevent="handleSubmit">
        <div class="grid gap-4 py-4">
          <div class="grid grid-cols-4 items-center gap-4">
            <Label
              for="name"
              class="text-right"
              >Name</Label
            >
            <Input
              id="name"
              v-model="form.name"
              placeholder="Building name"
              class="col-span-3"
              :disabled="isLoading"
              required
            />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label
              for="abbrev"
              class="text-right"
              >Abbreviation</Label
            >
            <Input
              id="abbrev"
              v-model="form.abbrev"
              placeholder="Building code (e.g., FIT)"
              class="col-span-3"
              :disabled="isLoading"
              required
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            @click="$emit('update:open', false)"
            :disabled="isLoading"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            :disabled="isLoading"
          >
            <Loader2Icon
              v-if="isLoading"
              class="mr-2 h-4 w-4 animate-spin"
            />
            {{ building ? 'Update' : 'Create' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
  import { ref, watch } from 'vue'
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
  } from '@/components/ui/dialog'
  import { Button } from '@/components/ui/button'
  import { Input } from '@/components/ui/input'
  import { Label } from '@/components/ui/label'
  import { Loader2Icon } from 'lucide-vue-next'
  import { components } from '@/types/schema'

  type Building = components['schemas']['Building']

  const props = defineProps<{
    open: boolean
    building: Building | null
    isLoading: boolean
  }>()

  const emit = defineEmits<{
    'update:open': [value: boolean]
    save: [building: { name: string; abbrev: string }]
  }>()

  const form = ref({
    name: '',
    abbrev: '',
  })

  watch(
    () => [props.open, props.building],
    () => {
      if (props.open) {
        if (props.building) {
          form.value.name = props.building.name
          form.value.abbrev = props.building.abbrev
        } else {
          form.value.name = ''
          form.value.abbrev = ''
        }
      }
    },
    { immediate: true },
  )

  const handleSubmit = () => {
    emit('save', {
      name: form.value.name,
      abbrev: form.value.abbrev,
    })
  }
</script>
