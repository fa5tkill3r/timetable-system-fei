import { defineStore } from 'pinia'
import { ref, computed, watchEffect } from 'vue'
import { client } from '../lib/client'
import { useSchemaStore } from './schemas'
import { components } from 'schema'

type SubjectUserRole = components['schemas']['SubjectUserRole']
type Subject = components['schemas']['Subject']
type SubjectUserRoleRequest = components['schemas']['SubjectUserRoleRequest']

export const useSubjectUserRoleStore = defineStore('subjectUserRoles', () => {
  const schemaStore = useSchemaStore()
  const subjectUserRoles = ref<SubjectUserRole[]>([])
  const lecturers = ref<SubjectUserRole[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchSubjectUserRoles = async () => {
    if (!schemaStore.activeSchema?.id) {
      subjectUserRoles.value = []
      return []
    }

    isLoading.value = true
    error.value = null
    try {
      const response = await client.GET('/api/subject-user-roles/', {
        params: {
          header: schemaStore.termHeader,
        },
      })
      if (response.data) {
        subjectUserRoles.value = response.data.results
        return response.data
      } else {
        error.value = 'Failed to fetch subject user roles'
        subjectUserRoles.value = []
        return []
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      subjectUserRoles.value = []
      return []
    } finally {
      isLoading.value = false
    }
  }

  const fetchLecturers = async () => {
    if (!schemaStore.activeSchema?.id) {
      lecturers.value = []
      return []
    }

    isLoading.value = true
    error.value = null
    try {
      const response = await client.GET('/api/subject-user-roles/', {
        params: {
          header: schemaStore.termHeader,
          query: {
            'max-level': 2,
            'role_id__in': [1,3] // Prednasajuci a cviciaci
          }
        },
      })
      if (response.data) {
        lecturers.value = response.data.results
        return response.data
      } else {
        error.value = 'Failed to fetch lecturers'
        lecturers.value = []
        return []
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      lecturers.value = []
      return []
    } finally {
      isLoading.value = false
    }
  }

  const getLecturersForSubject = (subjectId: number) => {
    return lecturers.value.filter(
      lecturer => (lecturer.subject as any as Subject)?.id === subjectId
    )
  }

  const createSubjectUserRole = async (subjectUserRole: SubjectUserRoleRequest) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await client.POST('/api/subject-user-roles/', {
        params: {
          header: schemaStore.termHeader,
        },
        body: subjectUserRole,
      })
      if (response.data) {
        subjectUserRoles.value.push(response.data)
        if (subjectUserRole.role === 1) {
          await fetchLecturers()
        }
        return response.data
      } else {
        error.value = 'Failed to create subject user role'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return null
    } finally {
      isLoading.value = false
    }
  }

  const updateSubjectUserRole = async (id: number, subjectUserRole: Partial<SubjectUserRoleRequest>) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await client.PATCH('/api/subject-user-roles/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader,
        },
        body: subjectUserRole,
      })
      if (response.data) {
        const index = subjectUserRoles.value.findIndex(sur => sur.id === id)
        if (index !== -1) {
          subjectUserRoles.value[index] = { ...subjectUserRoles.value[index], ...subjectUserRole, id }
        }
        if (subjectUserRole.role === 1 || subjectUserRoles.value[index]?.role?.id === 1) {
          await fetchLecturers()
        }
        return response.data
      } else {
        error.value = 'Failed to update subject user role'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return null
    } finally {
      isLoading.value = false
    }
  }

  const deleteSubjectUserRole = async (id: number) => {
    isLoading.value = true
    error.value = null
    try {
      const { response } = await client.DELETE('/api/subject-user-roles/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader,
        },
      })
      if (response.status === 204) {
        const deletedItem = subjectUserRoles.value.find(sur => sur.id === id)
        
        subjectUserRoles.value = subjectUserRoles.value.filter(sur => sur.id !== id)
        
        if (deletedItem?.role?.id === 1) {
          await fetchLecturers()
        }
        
        return true
      } else {
        error.value = 'Failed to delete subject user role'
        return false
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return false
    } finally {
      isLoading.value = false
    }
  }

  watchEffect(() => {
    if (schemaStore.activeSchema?.id) {
      fetchLecturers()
    } else {
      lecturers.value = []
      subjectUserRoles.value = []
    }
  })

  return {
    subjectUserRoles,
    lecturers,
    isLoading,
    error,
    fetchSubjectUserRoles,
    fetchLecturers,
    getLecturersForSubject,
    createSubjectUserRole,
    updateSubjectUserRole,
    deleteSubjectUserRole,
  }
})
