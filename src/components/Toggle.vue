<script setup lang="ts">
  import {
    FormControl,
    FormDescription,
    FormItem,
    FormLabel,
  } from '@/components/ui/form'
  import { Switch } from '@/components/ui/switch'
</script>

<template>
  <FormField v-slot="{ value, handleChange }" name="marketing_emails">
    <FormItem
      class="flex flex-row items-center justify-between rounded-lg border p-4"
    >
      <div class="space-y-0.5">
        <FormLabel class="text-base"> Marketing emails </FormLabel>
        <FormDescription>
          Receive emails about new products, features, and more.
        </FormDescription>
      </div>
      <FormControl>
        <Switch :checked="value" @update:checked="handleChange" />
      </FormControl>
    </FormItem>
  </FormField>
</template>

<style scoped></style>
