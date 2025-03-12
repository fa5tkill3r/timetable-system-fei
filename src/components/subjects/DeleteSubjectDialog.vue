<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Delete Subject</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete subject "{{ subject?.name }}"? This action cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" @click="$emit('update:open', false)">Cancel</Button>
        <Button variant="destructive" @click="$emit('delete')" :disabled="isLoading">
          <span v-if="isLoading" class="mr-2">
            <div
              class="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full inline-block">
            </div>
          </span>
          Delete
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import type { components } from '@/../schema'

type Subject = components['schemas']['Subject']

defineProps<{
  open: boolean
  subject?: Subject | null
  isLoading?: boolean
}>()

defineEmits<{
  'update:open': [value: boolean]
  'delete': []
}>()
</script>
