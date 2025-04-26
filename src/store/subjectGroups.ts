import { defineStore } from 'pinia'
import { ref, computed, watchEffect } from 'vue'
import { client } from '../lib/client'
import { useSchemaStore } from './schemas'
import { components } from 'schema'

type SubjectGroup = components['schemas']['SubjectGroup']
type SubjectGroupCounts = components['schemas']['SubjectGroupCounts']
type SubjectGroupRequest = components['schemas']['SubjectGroupRequest']

export const useSubjectGroupStore = defineStore('subjectGroups', () => {
  const schemaStore = useSchemaStore()
  const subjectGroups = ref<SubjectGroup[]>([])
  const subjectGroupGroups = ref<SubjectGroupCounts[]>([])
  const isLoading = ref(false)
  const isLoadingGroups = ref(false)

  // Get all subject groups
  const fetchSubjectGroups = async () => {
    if (!schemaStore.activeSchema?.id) {
      subjectGroups.value = []
      return []
    }

    isLoading.value = true
    try {
      const response = await client.GET('/api/subject-groups/', {
        params: {
          header: schemaStore.termHeader,
        },
      })

      if (response.data) {
        subjectGroups.value = response.data.results
        return response.data.results
      } else {
        subjectGroups.value = []
        return []
      }
    } catch (err) {
      subjectGroups.value = []
      return []
    } finally {
      isLoading.value = false
    }
  }

  const fetchSubjectGroupGroups = async () => {
    if (!schemaStore.activeSchema?.id) {
      subjectGroupGroups.value = []
      return []
    }

    isLoadingGroups.value = true
    try {
      const response = await client.GET('/api/subject-groups/groups/', {
        params: {
          header: schemaStore.termHeader,
        },
      })

      if (response.data) {
        subjectGroupGroups.value = response.data.results
        return response.data
      } else {
        subjectGroupGroups.value = []
        return []
      }
    } catch (err) {
      subjectGroupGroups.value = []
      return []
    } finally {
      isLoadingGroups.value = false
    }
  }

  const createSubjectGroup = async (groupData: SubjectGroupRequest) => {
    isLoading.value = true
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
        return null
      }
    } catch (err) {
      return null
    } finally {
      isLoading.value = false
    }
  }

  const updateSubjectGroup = async (
    id: number,
    groupData: Partial<SubjectGroupRequest>,
  ) => {
    isLoading.value = true
    try {
      const response = await client.PATCH('/api/subject-groups/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader,
        },
        body: groupData,
      })
      if (response.data) {
        const index = subjectGroups.value.findIndex((g) => g.id === id)
        if (index !== -1) {
          subjectGroups.value[index] = {
            ...subjectGroups.value[index],
            ...groupData,
            id,
          } as SubjectGroup
        }
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

  const deleteSubjectGroup = async (id: number) => {
    isLoading.value = true
    try {
      const { response } = await client.DELETE('/api/subject-groups/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader,
        },
      })
      if (response.status === 204) {
        subjectGroups.value = subjectGroups.value.filter((g) => g.id !== id)
        return true
      } else {
        return false
      }
    } catch (err) {
      console.error(err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  const getGroupsBySubject = (subjectId: number) => {
    return subjectGroups.value.filter((group) => group.subject === subjectId)
  }

  watchEffect(() => {
    if (schemaStore.activeSchema?.id) {
      fetchSubjectGroups()
    } else {
      subjectGroups.value = []
    }
  })

  return {
    subjectGroups,
    subjectGroupGroups,
    isLoading,
    isLoadingGroups,
    fetchSubjectGroups,
    fetchSubjectGroupGroups,
    createSubjectGroup,
    updateSubjectGroup,
    deleteSubjectGroup,
    getGroupsBySubject,
  }
})
