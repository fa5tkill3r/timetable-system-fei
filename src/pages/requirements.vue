<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Building, Infinity, CalendarDays } from 'lucide-vue-next'
import { computed, defineAsyncComponent, ref, watch } from 'vue'

interface Constraint {
  id: any
  name: string
  icon: any,
  constraintType: string
}
const constraintComponentCache = new Map<string, ReturnType<typeof defineAsyncComponent>>()

function loadConstraintComponent(name: string) {
  if (!constraintComponentCache.has(name)) {
    constraintComponentCache.set(
      name,
      defineAsyncComponent(() =>
        import(`@/components/requirements/constrains/${name}Constraint.vue`)
      )
    )
  }
  return constraintComponentCache.get(name)!
}

const constraints = [
  {
    id: "TimeRange",
    name: "Time range",
    icon: CalendarDays,
  },
  {
    id: "DailyLimit",
    name: "Daily limit",
    icon: Infinity
  },
  {
    id: "Room",
    name: "Room",
    icon: Building
  }
] as Constraint[]
const selectedConstraint = ref<Constraint | null>(null)


const backendResponse = ref({
  "type": "ROOT",
  "strength": "STRONG",
  "data": {
    "target_type": "USER",
    "target_id": 98116
  },
  "nested_children": [
    {
      "type": "OPERATION",
      "strength": "STRONG",
      "data": {
        "operator": "AND"
      },
      "nested_children": [
        {
          "type": "TIMERANGE",
          "strength": "STRONG",
          "data": {
            "day_of_week": 0,
            "start_time": 0,
            "duration": 9
          }
        },
        {
          "type": "TIMERANGE",
          "strength": "STRONG",
          "data": {
            "day_of_week": 1,
            "start_time": 0,
            "duration": 9
          }
        }
      ]
    }
  ]
})


watch(backendResponse, (newValue) => {
  // console.log("Backend response updated:", JSON.stringify(newValue, null, 2))
}, { deep: true })



const selectedConstraintData = computed({
  get: () => {
    if (!selectedConstraint.value) return []
    const type = selectedConstraint.value.id.toUpperCase()
    return backendResponse.value.nested_children[0]?.nested_children.filter(
      child => child.type === type
    ) || []
  },
  set: (newConstraints) => {
    if (!selectedConstraint.value || !backendResponse.value.nested_children[0]) return
    const type = selectedConstraint.value.id.toUpperCase()

    // Filter out old constraints of this type
    const otherConstraints = backendResponse.value.nested_children[0].nested_children.filter(
      child => child.type !== type
    )

    // Replace with new constraints while keeping others
    backendResponse.value.nested_children[0].nested_children = [
      ...otherConstraints,
      ...newConstraints
    ]
  }
})

</script>

<template>
  <div class="flex gap-4">
    <div class="flex flex-col gap-4 p-4">
      <h1 class="text-2xl font-semibold">Requirements</h1>
      <Tabs default-value="account" class="w-[400px]">
        <TabsList class="grid w-full grid-cols-2">
          <TabsTrigger value="account">
            Myself
          </TabsTrigger>
          <TabsTrigger value="password">
            Subject
          </TabsTrigger>
        </TabsList>
        <TabsContent value="account">

        </TabsContent>
        <TabsContent value="password">

        </TabsContent>
      </Tabs>

      <Button v-for="constraint in constraints" :key="constraint.name"
        :variant="selectedConstraint?.name === constraint.name ? 'default' : 'outline'"
        @click="selectedConstraint = constraint" class="py-3 px-4 text-base w-full h-12">
        <component :is="constraint.icon" class="h-5 w-5 mr-3" />
        {{ constraint.name }}
      </Button>
    </div>
    <div class="flex-1 p-4 border-l border-gray-200">
      <div class="flex flex-col gap-4">
        <!-- <h2 class="text-xl font-semibold">Constraints</h2> -->

        <div class="p-4">
          <component v-if="selectedConstraint" v-model="selectedConstraintData"
            :is="loadConstraintComponent(selectedConstraint?.id)" />
        </div>
      </div>
    </div>
  </div>
</template>