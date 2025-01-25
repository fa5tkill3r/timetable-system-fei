<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { Button } from '@/components/ui/button'
  import { Input } from '@/components/ui/input'
  import { cn } from '@/lib/utils'

  const props = defineProps<{
    item: Object
  }>()

  const isToggled = ref(false)
  const customCount = ref<number>(1)

  const isInputFocused = ref(false)

  const toggleButton = () => {
    if (isInputFocused.value) {
      return
    }
    if (isToggled.value) {
      customCount.value = 1
    }
    isToggled.value = !isToggled.value
  }

  const increment = (event: Event) => {
    event.stopPropagation()

    if (customCount.value === '' || isNaN(Number(customCount.value))) {
      customCount.value = 1
    } else {
      customCount.value = Number(customCount.value) + 1
    }
  }

  const decrement = (event: Event) => {
    event.stopPropagation()

    if (customCount.value === '' || isNaN(Number(customCount.value))) {
      customCount.value = 0
    } else if (Number(customCount.value) > 1) {
      customCount.value = Number(customCount.value) - 1
    }
  }

  const sanitizeInput = (event: Event) => {
    const target = event.target as HTMLInputElement
    let value = target.value
    if (isNaN(Number(value))) {
      value = '1'
    } else if (Number(value) < 0) {
      value = '1'
    }
    customCount.value = Number(value)
  }
</script>

<template>
  <Button
    @click="toggleButton"
    :class="
      cn(
        'w-fit flex items-center justify-between h-14',
        isToggled && 'bg-green-500 text-white hover:bg-green-600',
      )
    "
    variant="outline"
  >
    <template v-if="isToggled">
      <span class="mr-2">{{ item.name }}</span>
      <div class="flex items-center space-x-2">
        <Button
          @click="decrement"
          variant="secondary"
          size="sm"
          class="h-10 w-6 p-0"
        >
          -
        </Button>
        <Input
          v-model="customCount"
          type="text"
          placeholder="0"
          class="h-10 w-12 text-center p-0 text-black"
          @click.stop
          @input="sanitizeInput"
          @focus="isInputFocused = true"
          @blur="isInputFocused = false"
        />
        <Button
          @click="increment"
          variant="secondary"
          size="sm"
          class="h-10 w-6 p-0"
        >
          +
        </Button>
      </div>
    </template>
    <template v-else>
      <span>{{ item.name }}</span>
    </template>
  </Button>
</template>
