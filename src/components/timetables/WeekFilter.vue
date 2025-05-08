<script setup lang="ts">
import { Calendar } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ref, computed } from 'vue'




const filterWeeksBitmask = ref(parseInt('111111111111', 2))
const exactWeekMatch = ref(false)

const filterWeekBits = computed(() => {
  const binaryString = (filterWeeksBitmask.value || 0)
    .toString(2)
    .padStart(12, '0')
  return binaryString.split('').map((bit) => bit === '1')
})


const isFilterOddWeeksPattern = computed(() => {
  const oddWeeksMask = parseInt('101010101010', 2)
  return filterWeeksBitmask.value === oddWeeksMask
})

const isFilterEvenWeeksPattern = computed(() => {
  const evenWeeksMask = parseInt('010101010101', 2)
  return filterWeeksBitmask.value === evenWeeksMask
})

const isFilterAllWeeksPattern = computed(() => {
  const allWeeksMask = parseInt('111111111111', 2)
  return filterWeeksBitmask.value === allWeeksMask
})

function toggleFilterWeek(index: number) {
  const bitArray = filterWeekBits.value.slice()
  bitArray[index] = !bitArray[index]
  filterWeeksBitmask.value = parseInt(
    bitArray.map((bit) => (bit ? '1' : '0')).join(''),
    2,
  )
}

function selectOddWeeks() {
  filterWeeksBitmask.value = parseInt('101010101010', 2)
}

function selectEvenWeeks() {
  filterWeeksBitmask.value = parseInt('010101010101', 2)
}

function selectAllWeeks() {
  if (!isFilterAllWeeksPattern.value) {
    filterWeeksBitmask.value = parseInt('111111111111', 2)
  } else {
    filterWeeksBitmask.value = parseInt('000000000000', 2)
  }
}

defineExpose({
  filterWeeksBitmask,
  exactWeekMatch,
})

</script>

<template>
  <div class="border-b bg-muted/20 px-2 py-1">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <h4 class="flex items-center text-sm font-medium">
          <Calendar class="mr-1 h-4 w-4" /> {{ $t('timetable.editor.weekFilter') }}
        </h4>
        <div class="flex gap-1">
          <Button size="sm" :variant="isFilterOddWeeksPattern ? 'default' : 'secondary'
            " class="h-7 text-xs" @click="selectOddWeeks">
            A
          </Button>
          <Button size="sm" :variant="isFilterEvenWeeksPattern ? 'default' : 'secondary'
            " class="h-7 text-xs" @click="selectEvenWeeks">
            B
          </Button>
          <Button size="sm" :variant="isFilterAllWeeksPattern ? 'default' : 'secondary'
            " class="h-7 text-xs" @click="selectAllWeeks">
            {{ $t('timetable.editor.allWeeks') }}
          </Button>
        </div>
      </div>

      <div class="flex justify-center gap-1">
        <button v-for="(active, index) in filterWeekBits" :key="index" @click="toggleFilterWeek(index)"
          class="flex h-6 w-6 items-center justify-center rounded-full border text-xs" :class="active
            ? 'bg-primary text-primary-foreground'
            : 'bg-background text-muted-foreground'
            ">
          {{ index + 1 }}
        </button>
      </div>

      <div class="flex items-center gap-2">
        <div class="ml-4 flex items-center gap-2">
          <label class="text-sm font-medium">{{ $t('timetable.editor.exactMatch') }}</label>
          <Switch v-model:checked="exactWeekMatch" />
        </div>
      </div>
    </div>
  </div>
</template>
