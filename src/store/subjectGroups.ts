import { defineStore } from 'pinia'
import { ref, computed, watchEffect } from 'vue'
import { client } from '../lib/client'
import { useSchemaStore } from './schemas'
import { components } from 'schema'

type SubjectGroup = components['schemas']['SubjectGroup']
type SubjectGroupRequest = components['schemas']['SubjectGroupRequest']

export const useSubjectGroupStore = defineStore('subjectGroups', () => {
  const schemaStore = useSchemaStore()
  const subjectGroups = ref<SubjectGroup[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Get all subject groups
  const fetchSubjectGroups = async () => {
    if (!schemaStore.activeSchema?.id) {
      subjectGroups.value = []
      return []
    }
    
    isLoading.value = true
    error.value = null
    try {
      const response = await client.GET('/api/subject-groups/', {
        params: {
          header: schemaStore.termHeader
        }
      })
      
      if (response.data) {
        subjectGroups.value = response.data
        return response.data
      } else {
        error.value = 'Failed to fetch subject groups'
        subjectGroups.value = []
        return []
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      subjectGroups.value = []
      return []
    } finally {
      isLoading.value = false
    }
  }

  // Create a subject group
  const createSubjectGroup = async (groupData: SubjectGroupRequest) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await client.POST('/api/subject-groups/', {
        params: {
          header: schemaStore.termHeader,
        },
        body: groupData,
      })
      if (response.data) {
        subjectGroups.value.push(response.data)
        return response.data
      } else {
        error.value = 'Failed to create subject group'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Update subject group
  const updateSubjectGroup = async (id: number, groupData: Partial<SubjectGroupRequest>) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await client.PATCH('/api/subject-groups/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader,
        },
        body: groupData
      })
      if (response.data) {
        const index = subjectGroups.value.findIndex(g => g.id === id)
        if (index !== -1) {
          subjectGroups.value[index] = { ...subjectGroups.value[index], ...groupData, id }
        }
        return response.data
      } else {
        error.value = 'Failed to update subject group'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Delete subject group
  const deleteSubjectGroup = async (id: number) => {
    isLoading.value = true
    error.value = null
    try {
      const { response } = await client.DELETE('/api/subject-groups/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader,
        }
      })
      if (response.status === 204) {
        subjectGroups.value = subjectGroups.value.filter(g => g.id !== id)
        return true
      } else {
        error.value = 'Failed to delete subject group'
        return false
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Get groups for a specific subject
  const getGroupsBySubject = (subjectId: number) => {
    return subjectGroups.value.filter(group => group.subject === subjectId)
  }

  // Auto-load subject groups when schema changes
  watchEffect(() => {
    if (schemaStore.activeSchema?.id) {
      fetchSubjectGroups()
    } else {
      subjectGroups.value = []
    }
  })

  return {
    subjectGroups,
    isLoading,
    error,
    fetchSubjectGroups,
    createSubjectGroup,
    updateSubjectGroup,
    deleteSubjectGroup,
    getGroupsBySubject
  }
})
