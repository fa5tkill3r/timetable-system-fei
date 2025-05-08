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
import { components } from '@/types/schema'
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

type BackendConstraintType = components['schemas']['Constraint']


export interface ConstraintData {
  id: number | null
  type: 'ROOT' | 'OPERATION' | 'TIMERANGE'// | 'DAILYLIMIT' | 'ROOM'
  strength: 'STRONG' | 'MEDIUM' | 'WEAK'
  data: any
  nested_children?: ConstraintData[]
  parent: ConstraintData | null
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

const backendResponse = ref<ConstraintData | null>(null)
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
  set: async (newConstraints) => {
    if (!selectedConstraint.value || !backendResponse.value?.nested_children?.[0]) return

    // Don't trigger updates while we're already processing changes
    if (isUpdating.value) return

    isUpdating.value = true
    const type = selectedConstraint.value.id.toUpperCase()

    try {
      // Find the operation node for this constraint type
      let operationNode = backendResponse.value.nested_children[0].nested_children.find(
        node => node.type === 'OPERATION' &&
          node.nested_children?.some(child => child.type === type)
      )

      if (operationNode) {
        // Get existing constraints of this type
        const existingConstraints = operationNode.nested_children.filter(child => child.type === type)

        // Map of existing constraints by ID
        const existingMap = new Map(
          existingConstraints.filter(c => c.id).map(c => [c.id, c])
        )

        // Map of new constraints by ID
        const newMap = new Map(
          newConstraints.filter(c => c.id).map(c => [c.id, c])
        )

        // 1. Identify constraints to delete (in existing but not in new)
        const toDelete = existingConstraints.filter(c =>
          c.id && !newMap.has(c.id)
        )

        // 2. Identify constraints to update (in both existing and new)
        const toUpdate = newConstraints.filter(c =>
          c.id && existingMap.has(c.id)
        )

        // 3. Identify constraints to create (in new but without IDs)
        const toCreate = newConstraints.filter(c => !c.id)

        // Process deletions
        for (const constraint of toDelete) {
          if (constraint.id) {
            await constraintStore.deleteConstraint(constraint.id)
          }
        }

        // Process updates
        for (const constraint of toUpdate) {
          if (constraint.id) {
            await constraintStore.updateConstraint(constraint.id, {
              type: constraint.type,
              strength: constraint.strength,
              data: constraint.data,
              nested_children: []
            })
          }
        }

        // Process creations
        for (const constraint of toCreate) {
          await constraintStore.createConstraint({
            type: constraint.type,
            strength: constraint.strength,
            data: constraint.data,
            parent: operationNode.id,
            nested_children: []
          })
        }
      } else if (newConstraints.length > 0) {
        // We need to create a new operation node and then add constraints to it
        const newOperationNode = await constraintStore.createConstraint({
          type: "OPERATION",
          strength: "STRONG",
          data: { operator: "AND" },
          parent: backendResponse.value.nested_children[0].id,
          nested_children: []
        })

        if (newOperationNode?.id) {
          // Now create all the new constraints under this operation node
          for (const constraint of newConstraints) {
            await constraintStore.createConstraint({
              type: constraint.type,
              strength: constraint.strength,
              data: constraint.data,
              parent: newOperationNode.id,
              nested_children: []
            })
          }
        }
      }

      // After all operations, refresh the data
      await constraintStore.fetchConstraints()
      backendResponse.value = await constraintStore.getPersonConstraints(person)

    } catch (error) {
      console.error("Error processing constraint changes:", error)
    } finally {
      isUpdating.value = false
    }
  }
})

watch(selectedConstraintData, (newValue) => {
  console.log("Selected constraint data changed:", newValue)

}, { deep: true })



onMounted(async () => {
  const personConstraints = await constraintStore.getPersonConstraints(person)

  if (personConstraints) {
    console.log("Fetched person constraints successfully")
    backendResponse.value = personConstraints
  } else {
    console.error("Failed to fetch person constraints")
    return
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