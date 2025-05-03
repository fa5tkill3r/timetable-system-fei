import { defineStore } from 'pinia'
import { ref, watchEffect } from 'vue'
import { client } from '../lib/client'
import { useSchemaStore } from './schemas'
import { components } from '@/types/schema'

type Subject = components['schemas']['Subject']
type SubjectRequest = components['schemas']['SubjectRequest']

export const useSubjectStore = defineStore('subjects', () => {
  const schemaStore = useSchemaStore()
  const subjects = ref<Subject[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchSubjects = async () => {
    if (!schemaStore.activeSchema?.id) {
      subjects.value = []
      return
    }

    isLoading.value = true
    error.value = null
    try {
      const response = await client.GET('/api/subjects/', {
        params: {
          header: schemaStore.termHeader,
        },
      })
      if (response.data) {
        subjects.value = response.data.results
      } else {
        error.value = 'Failed to fetch subjects'
      }
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Unknown error occurred'
    } finally {
      isLoading.value = false
    }
  }

  // Use watchEffect to automatically fetch subjects when active schema changes
  // This also runs once initially to get the subjects for the current active schema
  watchEffect(() => {
    // This will re-execute whenever schemaStore.activeSchema?.id changes
    if (schemaStore.activeSchema?.id) {
      fetchSubjects()
    } else {
      // Clear subjects when no active schema
      subjects.value = []
    }
  })

  // Create a new subject
  const createSubject = async (subject: SubjectRequest) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await client.POST('/api/subjects/', {
        params: {
          header: schemaStore.termHeader,
        },
        body: subject,
      })
      if (response.data) {
        subjects.value.push(response.data)
        return response.data
      } else {
        error.value = 'Failed to create subject'
        return null
      }
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Unknown error occurred'
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Update existing subject
  const updateSubject = async (id: number, subject: SubjectRequest) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await client.PUT('/api/subjects/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader,
        },
        body: subject,
      })
      if (response.data) {
        const index = subjects.value.findIndex((s) => s.id === id)
        if (index !== -1) {
          subjects.value[index] = response.data
        }
        return response.data
      } else {
        error.value = 'Failed to update subject'
        return null
      }
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Unknown error occurred'
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Delete subject
  const deleteSubject = async (id: number) => {
    isLoading.value = true
    error.value = null
    try {
      const { response } = await client.DELETE('/api/subjects/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader,
        },
      })
      if (response.status === 204) {
        subjects.value = subjects.value.filter((s) => s.id !== id)
        return true
      } else {
        error.value = 'Failed to delete subject'
        return false
      }
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Unknown error occurred'
      return false
    } finally {
      isLoading.value = false
    }
  }

  return {
    subjects,
    isLoading,
    error,
    fetchSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
  }
})
