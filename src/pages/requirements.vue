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
  import { useSubjectStore } from '@/store/subjects'
  import { useAuthStore } from '@/store/auth'
  import { useI18n } from 'vue-i18n'
  import ComboBox from '@/components/common/ComboBox.vue'
  import { components } from '@/types/schema'
  import { set } from 'lodash'
  import { Building, Infinity, CalendarDays } from 'lucide-vue-next'
  import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'

  const { t } = useI18n()
  const target = ref<number | null>(null)
  const activeTab = ref('user')

  const constraintStore = useConstraintStore()
  const subjectStore = useSubjectStore()
  const authStore = useAuthStore()

  interface Constraint {
    id: any
    name: string
    icon: any
    constraintType: string
  }

  export interface ConstraintData {
    id: number | null
    type: 'ROOT' | 'OPERATION' | 'TIMERANGE' // | 'DAILYLIMIT' | 'ROOM'
    strength: 'STRONG' | 'MEDIUM' | 'WEAK'
    data: any
    nested_children?: ConstraintData[]
    parent: ConstraintData | null
  }

  const constraintComponentCache = new Map<
    string,
    ReturnType<typeof defineAsyncComponent>
  >()

  function loadConstraintComponent(name: string) {
    if (!constraintComponentCache.has(name)) {
      constraintComponentCache.set(
        name,
        defineAsyncComponent(
          () =>
            import(
              `@/components/requirements/constrains/${name}Constraint.vue`
            ),
        ),
      )
    }
    return constraintComponentCache.get(name)!
  }

  const constraints = [
    {
      id: 'TimeRange',
      name: 'timeRange',
      icon: CalendarDays,
    },
    {
      id: 'DailyLimit',
      name: 'dailyLimit',
      icon: Infinity,
    },
    {
      id: 'Room',
      name: 'room',
      icon: Building,
    },
  ] as Constraint[]
  const selectedConstraint = ref<Constraint | null>(null)

  const backendResponse = ref<ConstraintData | null>(null)
  const isNewConstraint = ref(false)
  const isUpdating = ref(false)

  watch(
    backendResponse,
    async (newValue, oldValue) => {
      // Ignore initial setting of the value or if we're in the middle of an update
      if (!oldValue || !newValue || isUpdating.value || newValue === oldValue)
        return

      console.log('Backend response changed:', newValue)

      try {
        // Set flag at the beginning of operations
        isUpdating.value = true

        if (isNewConstraint.value) {
          // Create a new constraint with the nested structure
          const result = await constraintStore.createConstraint({
            type: newValue.type,
            strength: newValue.strength,
            data: newValue.data,
            nested_children: newValue.nested_children,
          })

          if (result) {
            backendResponse.value = await constraintStore.getTargetConstraints(
              target.value!,
            )
            isNewConstraint.value = false
            console.log('Created new constraint successfully')
          }
        } else if (newValue.id) {
          if (newValue.type === 'ROOT') {
            // For ROOT, only update if there are actual data changes
            const hasChanged =
              JSON.stringify(oldValue.data) !== JSON.stringify(newValue.data) ||
              oldValue.strength !== newValue.strength
            if (!hasChanged) {
              console.log('Skipping unnecessary ROOT update')
              return
            }
          }

          // Use the store's updateConstraint function instead of direct PUT
          const updated = await constraintStore.updateConstraint(newValue.id, {
            type: newValue.type,
            strength: newValue.strength,
            data: newValue.data,
          })

          if (updated) {
            console.log('Updated constraint successfully')
          }
        }
      } catch (error) {
        console.error('Error saving constraint:', error)
      } finally {
        // Ensure flag is always reset
        isUpdating.value = false
      }
    },
    { deep: true },
  )

  const selectedConstraintData = computed({
    get: () => {
      if (
        !selectedConstraint.value ||
        !backendResponse.value?.nested_children?.[0]
      )
        return []

      const type = selectedConstraint.value.id.toUpperCase()

      // Find the operation node for this constraint type
      const operationNode =
        backendResponse.value.nested_children[0].nested_children!.find(
          (node) =>
            node.type === 'OPERATION' &&
            node.nested_children?.some((child) => child.type === type),
        )

      // Return the constraints of this type from the operation node
      return (
        operationNode?.nested_children?.filter(
          (child) => child.type === type,
        ) || []
      )
    },
    set: async (newConstraints) => {
      if (
        !selectedConstraint.value ||
        !backendResponse.value?.nested_children?.[0]
      )
        return

      // Don't trigger updates while we're already processing changes
      if (isUpdating.value) return

      isUpdating.value = true
      const type = selectedConstraint.value.id.toUpperCase()

      try {
        // Find the operation node for this constraint type
        let operationNode =
          backendResponse.value.nested_children[0].nested_children!.find(
            (node) =>
              node.type === 'OPERATION' &&
              node.nested_children?.some((child) => child.type === type),
          )

        if (operationNode) {
          // Get existing constraints of this type
          const existingConstraints = operationNode.nested_children!.filter(
            (child) => child.type === type,
          )

          // Map of existing constraints by ID
          const existingMap = new Map(
            existingConstraints.filter((c) => c.id).map((c) => [c.id, c]),
          )

          // Map of new constraints by ID
          const newMap = new Map(
            newConstraints.filter((c) => c.id).map((c) => [c.id, c]),
          )

          // 1. Identify constraints to delete (in existing but not in new)
          const toDelete = existingConstraints.filter(
            (c) => c.id && !newMap.has(c.id),
          )

          // 2. Identify constraints to update (in both existing and new)
          const toUpdate = []

          for (const constraint of newConstraints) {
            if (!constraint.id || !existingMap.has(constraint.id)) continue

            // Get the existing constraint with the same ID
            const existingConstraint = existingMap.get(constraint.id)

            // Compare the constraint data to see if it's actually changed
            const hasChanged =
              JSON.stringify(existingConstraint!.data) !==
                JSON.stringify(constraint.data) ||
              existingConstraint!.strength !== constraint.strength

            // Only add to toUpdate if the constraint has actually changed
            if (hasChanged) {
              toUpdate.push(constraint)
            }
          }

          // 3. Identify constraints to create (in new but without IDs)
          const toCreate = newConstraints.filter((c) => !c.id)

          console.log(
            `Processing: ${toDelete.length} deletes, ${toUpdate.length} updates, ${toCreate.length} creates`,
          )

          // Process deletions
          for (const constraint of toDelete) {
            if (constraint.id) {
              await constraintStore.deleteConstraint(constraint.id)
            }
          }

          // Process updates (only the ones that actually changed)
          for (const constraint of toUpdate) {
            if (constraint.id) {
              await constraintStore.updateConstraint(constraint.id, {
                type: constraint.type,
                strength: constraint.strength,
                data: constraint.data,
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
              nested_children: undefined,
            })
          }
        } else if (newConstraints.length > 0) {
          // We need to create a new operation node and then add constraints to it
          const newOperationNode = await constraintStore.createConstraint({
            type: 'OPERATION',
            strength: 'STRONG',
            data: { operator: 'AND' },
            parent: backendResponse.value.nested_children[0].id,
            nested_children: undefined,
          })

          if (newOperationNode?.id) {
            // Now create all the new constraints under this operation node
            for (const constraint of newConstraints) {
              await constraintStore.createConstraint({
                type: constraint.type,
                strength: constraint.strength,
                data: constraint.data,
                parent: newOperationNode.id,
                nested_children: undefined,
              })
            }
          }
        }

        backendResponse.value = await constraintStore.getTargetConstraints(
          target.value!,
        )
      } catch (error) {
        console.error('Error processing constraint changes:', error)
      } finally {
        isUpdating.value = false
      }
    },
  })

  watch(
    selectedConstraintData,
    (newValue) => {
      console.log('Selected constraint data changed:', newValue)
    },
    { deep: true },
  )

  watch(
    activeTab,
    async (newTab) => {
      if (newTab === 'user') {
        if (authStore.isAuthenticated) {
          target.value = Number(authStore.userId)

          try {
            const targetConstraints =
              await constraintStore.getTargetConstraints(target.value)
            if (targetConstraints) {
              backendResponse.value = targetConstraints
            } else {
              console.error('Failed to fetch user constraints')
              backendResponse.value = null
            }
          } catch (error) {
            console.error('Error fetching user constraints:', error)
          }
        } else {
          target.value = null
          backendResponse.value = null
        }
      } else {
        target.value = null
        backendResponse.value = null
      }

      selectedConstraint.value = null
    },
    { immediate: true },
  )

  onMounted(async () => {
    if (activeTab.value === 'user' && authStore.isAuthenticated) {
      target.value = Number(authStore.userId)
    }

    if (target.value) {
      const targetConstraints = await constraintStore.getTargetConstraints(
        target.value,
      )
      if (targetConstraints) {
        console.log('Fetched target constraints successfully')
        backendResponse.value = targetConstraints
      } else {
        console.error('Failed to fetch target constraints')
      }
    }
  })
</script>

<template>
  <div class="flex gap-4">
    <div class="flex flex-col gap-4 p-4">
      <h1 class="text-2xl font-semibold">
        {{ $t('navigation.requirements') }}
      </h1>
      <Tabs
        v-model="activeTab"
        default-value="user"
        class="w-[400px]"
      >
        <TabsList class="grid w-full grid-cols-2">
          <TabsTrigger value="user">
            {{ $t('requirements.myRequirements') }}
          </TabsTrigger>
          <TabsTrigger value="subject">
            {{ $t('requirements.subject') }}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="user">
          <div class="py-4">
            <p class="text-sm text-muted-foreground">
              {{ $t('requirements.personalScheduleInfo') }}
            </p>
            <div
              v-if="authStore.isAuthenticated"
              class="mt-2 rounded-md bg-muted p-2"
            >
              <p class="font-medium">
                {{ authStore.user?.name || $t('user.defaultName') }}
              </p>
              <p class="text-xs text-muted-foreground">
                {{ authStore.user?.email }}
              </p>
            </div>
            <p
              v-else
              class="text-sm text-destructive"
            >
              {{ $t('requirements.loginPrompt') }}
            </p>
          </div>
        </TabsContent>
        <TabsContent value="subject">
          <div class="py-4">
            <ComboBox
              v-model:selection="target"
              :options="
                subjectStore.subjects.map((subject) => ({
                  id: subject.id,
                  name: subject.code + ' - ' + subject.name,
                }))
              "
              :loading="subjectStore.isLoading"
              :title="$t('requirements.selectSubject')"
              :description="$t('requirements.selectSubjectDescription')"
              :search-placeholder="$t('requirements.searchSubjects')"
            />
          </div>
        </TabsContent>
      </Tabs>

      <Button
        v-for="constraint in constraints"
        :key="constraint.name"
        :variant="
          selectedConstraint?.name === constraint.name ? 'default' : 'outline'
        "
        @click="selectedConstraint = constraint"
        class="h-12 w-full px-4 py-3 text-base"
        :disabled="target === null"
      >
        <component
          :is="constraint.icon"
          class="mr-3 h-5 w-5"
        />
        {{ $t(`requirements.constraints.${constraint.name}`) }}
      </Button>
    </div>
    <div class="flex-1 border-l border-gray-200 p-4">
      <div class="flex flex-col gap-4">
        <div class="p-4">
          <component
            v-if="selectedConstraint"
            v-model="selectedConstraintData"
            :is-updating="isUpdating"
            :is="loadConstraintComponent(selectedConstraint?.id)"
          />
          <div
            v-else
            class="flex h-full min-h-[400px] flex-col items-center justify-center"
          >
            <h1 class="text-center text-2xl font-medium text-muted-foreground">
              {{ $t('requirements.selectConstraintPrompt') }}
            </h1>
            <p class="mt-2 text-center text-muted-foreground">
              {{ $t('requirements.selectConstraintDescription') }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
