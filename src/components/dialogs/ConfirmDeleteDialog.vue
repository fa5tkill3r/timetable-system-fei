<template>
  <Dialog
    :open="open"
    @update:open="$emit('update:open', $event)"
  >
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>{{ description }}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          @click="$emit('update:open', false)"
          :disabled="isLoading"
          >Cancel</Button
        >
        <Button
          type="button"
          variant="destructive"
          @click="$emit('confirm')"
          :disabled="isLoading"
        >
          <Loader2Icon
            v-if="isLoading"
            class="mr-2 h-4 w-4 animate-spin"
          />
          Delete
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
  } from '@/components/ui/dialog'
  import { Button } from '@/components/ui/button'
  import { Loader2Icon } from 'lucide-vue-next'

  defineProps<{
    open: boolean
    title: string
    description: string
    isLoading: boolean
  }>()

  defineEmits<{
    'update:open': [value: boolean]
    confirm: []
  }>()
</script>
