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
import { client } from '@/lib/client'
import { useConstraintStore } from '@/store/constraints'
import { Building, Infinity, CalendarDays } from 'lucide-vue-next'
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'

const person = 98116

const constraintStore = useConstraintStore()

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

const backendResponse = ref<any>(null)
const isNewConstraint = ref(false)
const isUpdating = ref(false)

watch(backendResponse, async (newValue, oldValue) => {
  // Ignore initial setting of the value or if we're in the middle of an update
  if (!oldValue || !newValue || isUpdating.value) return

  console.log("Backend response changed:", newValue)

  try {
    if (isNewConstraint.value) {
      // Create a new constraint with the nested structure
      const result = await constraintStore.createConstraint({
        type: newValue.type,
        strength: newValue.strength,
        data: newValue.data,
        nested_children: newValue.nested_children
      })

      if (result) {
        isUpdating.value = true
        // Refresh constraints and get the updated nested version
        backendResponse.value = await constraintStore.getPersonConstraints(person)
        isNewConstraint.value = false
        isUpdating.value = false
        console.log("Created new constraint successfully")
      }
    } else if (newValue.id) {
      isUpdating.value = true

      // Use the store's updateConstraint function instead of direct PUT
      const updated = await constraintStore.updateConstraint(newValue.id, {
        type: newValue.type,
        strength: newValue.strength,
        data: newValue.data,
        nested_children: newValue.nested_children
      })

      if (updated) {
        console.log("Updated constraint successfully")
        // Refresh to get the latest data
        await constraintStore.fetchConstraints()
        backendResponse.value = await constraintStore.getPersonConstraints(person)
      }

      isUpdating.value = false
    }
  } catch (error) {
    console.error("Error saving constraint:", error)
    isUpdating.value = false
  }
}, { deep: true })

const selectedConstraintData = computed({
  get: () => {
    if (!selectedConstraint.value || !backendResponse.value?.nested_children?.[0]) return []

    const type = selectedConstraint.value.id.toUpperCase()

    // Find the operation node for this constraint type
    const operationNode = backendResponse.value.nested_children[0].nested_children.find(
      node => node.type === 'OPERATION' &&
        node.nested_children?.some(child => child.type === type)
    )

    // Return the constraints of this type from the operation node
    return operationNode?.nested_children?.filter(child => child.type === type) || []
  },
  set: (newConstraints) => {
    if (!selectedConstraint.value || !backendResponse.value?.nested_children?.[0]) return

    const type = selectedConstraint.value.id.toUpperCase()

    // Find the operation node for this constraint type
    let operationNode = backendResponse.value.nested_children[0].nested_children.find(
      node => node.type === 'OPERATION' &&
        node.nested_children?.some(child => child.type === type)
    )

    if (operationNode) {
      // Filter out constraints of other types (keep them)
      const otherConstraints = operationNode.nested_children.filter(child => child.type !== type)

      // Update nested_children with other constraints and new constraints
      operationNode.nested_children = [...otherConstraints, ...newConstraints]
    } else {
      // Create a new operation node for this constraint type
      const newOperationNode = {
        type: "OPERATION",
        strength: "STRONG",
        data: {
          operator: "AND"
        },
        children: [],
        owner: null,
        parent: backendResponse.value.nested_children[0].id,
        nested_children: newConstraints
      }

      // Add the new operation node
      backendResponse.value.nested_children[0].nested_children.push(newOperationNode)
    }
  }
})


onMounted(async () => {
  // Get nested constraints for this person
  const personConstraints = await constraintStore.getPersonConstraints(person)

  if (personConstraints.id) {
    // We found existing constraints
    backendResponse.value = personConstraints
  } else {
    // No constraints found, this is a default structure
    backendResponse.value = personConstraints
    isNewConstraint.value = true
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