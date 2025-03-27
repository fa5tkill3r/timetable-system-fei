import { defineStore } from 'pinia'
import { ref, watchEffect } from 'vue'
import { client } from '../lib/client'
import { useSchemaStore } from './schemas'
import { components } from 'schema'

type Timetable = components['schemas']['TT']
type TimetableRequest = components['schemas']['TTRequest']

export const useTimetableStore = defineStore('timetables', () => {
  const schemaStore = useSchemaStore()
  const timetables = ref<Timetable[]>([])
  const selectedTimetable = ref<Timetable | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Fetch all timetables
  const fetchTimetables = async () => {
    // Don't fetch if no active schema
    if (!schemaStore.activeSchema?.id) {
      timetables.value = []
      return []
    }
    
    isLoading.value = true
    error.value = null
    try {
      const response = await client.GET('/api/tt/', {
        params: {
          header: schemaStore.termHeader
        }
      })
      
      if (response.data) {
        timetables.value = response.data
        return response.data
      } else {
        error.value = 'Failed to fetch timetables'
        timetables.value = []
        return []
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      timetables.value = []
      return []
    } finally {
      isLoading.value = false
    }
  }

  // Get a specific timetable
  const getTimetable = async (id: number) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await client.GET('/api/tt/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader
        }
      })
      
      if (response.data) {
        selectedTimetable.value = response.data
        return response.data
      } else {
        error.value = 'Failed to fetch timetable'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Create a new timetable
  const createTimetable = async (timetable: TimetableRequest) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await client.POST('/api/tt/', {
        params: {
          header: schemaStore.termHeader,
        },
        body: timetable,
      })
      if (response.data) {
        await fetchTimetables()
        return response.data
      } else {
        error.value = 'Failed to create timetable'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Update existing timetable
  const updateTimetable = async (id: number, timetable: TimetableRequest) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await client.PUT('/api/tt/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader,
        },
        body: timetable
      })
      if (response.data) {
        await fetchTimetables()
        return response.data
      } else {
        error.value = 'Failed to update timetable'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Delete timetable
  const deleteTimetable = async (id: number) => {
    isLoading.value = true
    error.value = null
    try {
      const { response } = await client.DELETE('/api/tt/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader,
        }
      })
      if (response.status === 204) {
        timetables.value = timetables.value.filter(t => t.id !== id)
        return true
      } else {
        error.value = 'Failed to delete timetable'
        return false
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Clear selected items
  const clearSelections = () => {
    selectedTimetable.value = null
  }

  // Use watchEffect to automatically fetch timetables when active schema changes
  watchEffect(() => {
    if (schemaStore.activeSchema?.id) {
      fetchTimetables()
    } else {
      timetables.value = []
      clearSelections()
    }
  })

  return {
    timetables,
    selectedTimetable,
    isLoading,
    error,
    fetchTimetables,
    getTimetable,
    createTimetable,
    updateTimetable,
    deleteTimetable,
    clearSelections
  }
})
