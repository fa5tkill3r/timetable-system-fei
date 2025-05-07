import { defineStore } from 'pinia'
import { ref, watchEffect } from 'vue'
import { client } from '../lib/client'
import { useSchemaStore } from './schemas'
import { components } from '@/types/schema'
import { ConstraintData } from '@/pages/requirements.vue'

type Constraint = components['schemas']['Constraint']
type ConstraintRequest = components['schemas']['ConstraintRequest']
type PatchedConstraintRequest =
  components['schemas']['PatchedConstraintRequest']

// Function to transform flat constraint array to nested structure
const transformToNested = (
  constraints: Constraint[],
  rootId: number,
): ConstraintData | null => {
  if (!constraints.length) return null

  const constraintMap = new Map<number, ConstraintData>()
  constraints.forEach((c) => {
    constraintMap.set(c.id, {
      ...c,
      nested_children: [],
      parent: null, // Initialize parent reference
    } as ConstraintData)
  })

  // Build the hierarchy
  constraints.forEach((c) => {
    if (c.children && c.children.length) {
      c.children.forEach((childId) => {
        const child = constraintMap.get(childId)
        if (child) {
          const parent = constraintMap.get(c.id!)
          if (parent) {
            parent.nested_children?.push(child)
            child.parent = parent // Set parent reference
          }
        }
      })
    }
  })

  return constraintMap.get(rootId) || null
}

// Default constraint structure for a new user

export const useConstraintStore = defineStore('constraints', () => {
  const schemaStore = useSchemaStore()
  const constraints = ref<Constraint[]>([])
  const selectedConstraint = ref<Constraint | null>(null)
  const isLoading = ref(false)

  const fetchConstraints = async () => {
    if (!schemaStore.activeSchema?.id) {
      constraints.value = []
      return []
    }

    isLoading.value = true
    try {
      const response = await client.GET('/api/constraints/', {
        params: {
          header: schemaStore.termHeader,
        },
      })

      if (response.data) {
        constraints.value = response.data.results
        return response.data.results
      } else {
        return []
      }
    } finally {
      isLoading.value = false
    }
  }

  const getConstraint = async (id: number) => {
    isLoading.value = true

    try {
      const response = await client.GET('/api/constraints/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader,
        },
      })

      if (response.data) {
        selectedConstraint.value = response.data
        return response.data
      } else {
        return null
      }
    } catch (err) {
      return null
    } finally {
      isLoading.value = false
    }
  }

  const createConstraint = async (constraint: ConstraintRequest) => {
    isLoading.value = true
    try {
      const response = await client.POST('/api/constraints/', {
        params: {
          header: schemaStore.termHeader,
        },
        body: constraint,
      })

      if (response.data) {
        constraints.value.push(response.data)
        return response.data
      } else {
        return null
      }
    } catch (err) {
      return null
    } finally {
      isLoading.value = false
    }
  }

  const updateConstraint = async (
    id: number,
    constraintData: PatchedConstraintRequest,
  ) => {
    isLoading.value = true
    try {
      const response = await client.PATCH('/api/constraints/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader,
        },
        body: constraintData,
      })
      if (response.data) {
        const index = constraints.value.findIndex((c) => c.id === id)
        if (index !== -1) {
          constraints.value[index] = {
            ...constraints.value[index],
            ...constraintData,
            id,
          } as Constraint
        }
        return response.data
      } else {
        return null
      }
    } finally {
      isLoading.value = false
    }
  }

  const deleteConstraint = async (id: number) => {
    isLoading.value = true
    try {
      const { response } = await client.DELETE('/api/constraints/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader,
        },
      })

      if (response.status === 204) {
        constraints.value = constraints.value.filter((c) => c.id !== id)

        return true
      } else {
        return false
      }
    } catch (err) {
      return false
    } finally {
      isLoading.value = false
    }
  }

  const clearSelection = () => {
    selectedConstraint.value = null
  }

  const createDefaultConstraint = async (userId: number) => {
    const defaultConstraint = {
      type: 'ROOT',
      strength: 'STRONG',
      data: {
        target_type: 'USER',
        target_id: userId,
      },
      nested_children: [
        {
          type: 'OPERATION',
          strength: 'STRONG',
          data: {
            operator: 'AND',
          },
          nested_children: [],
        },
      ],
    }

    const response = await createConstraint(
      defaultConstraint as ConstraintRequest,
    )

    return response as Constraint
  }

  // Get constraints for a specific person, converted to nested format
  const getPersonConstraints = async (
    personId: number,
  ): Promise<ConstraintData | null> => {
    await fetchConstraints()

    // Find the root constraint for this person
    let rootConstraint = constraints.value.find(
      (c) =>
        c.type === 'ROOT' &&
        c.data?.target_type === 'USER' &&
        c.data?.target_id === personId,
    )

    if (!rootConstraint) {
      rootConstraint = await createDefaultConstraint(personId)
    }

    // Transform to nested format
    const nestedConstraint = transformToNested(
      constraints.value,
      rootConstraint.id!,
    )

    return nestedConstraint
  }

  // Transform nested structure back to flat format for API updates
  const transformToFlat = (nestedConstraint: any) => {
    if (!nestedConstraint) return []

    const result: any[] = []

    // Process the constraint and its children recursively
    const processConstraint = (
      constraint: any,
      parentId: number | null = null,
    ) => {
      const { nested_children, ...rest } = constraint

      // Create a flattened version without nested_children
      const flatConstraint = {
        ...rest,
        parent: parentId,
        children: nested_children?.map((child: any) => child.id || 0) || [],
      }

      result.push(flatConstraint)

      // Process children
      if (nested_children && nested_children.length > 0) {
        nested_children.forEach((child: any) => {
          processConstraint(child, constraint.id)
        })
      }
    }

    processConstraint(nestedConstraint)
    return result
  }

  watchEffect(() => {
    if (!schemaStore.activeSchema?.id) {
      constraints.value = []
      clearSelection()
    }
  })

  return {
    constraints,
    selectedConstraint,
    isLoading,
    fetchConstraints,
    getConstraint,
    createConstraint,
    updateConstraint,
    deleteConstraint,
    clearSelection,
    getPersonConstraints,
    transformToFlat,
    createDefaultConstraint,
  }
})
