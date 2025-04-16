import { defineStore } from 'pinia'
import { ref, watchEffect } from 'vue'
import { client } from '../lib/client'
import { useSchemaStore } from './schemas'
import { components } from 'schema'

type TTEvent = components['schemas']['TTEvent']
type TTEventRequest = components['schemas']['TTEventRequest']

export const useTimetableEventStore = defineStore('timetableEvents', () => {
  const schemaStore = useSchemaStore()
  const events = ref<TTEvent[]>([])
  const selectedEvent = ref<TTEvent | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchEvents = async (timetableId?: number) => {
    if (!schemaStore.activeSchema?.id) {
      events.value = []
      return []
    }
    
    isLoading.value = true
    error.value = null
    try {
      const response = await client.GET('/api/ttevent/', {
        params: {
          header: schemaStore.termHeader,
          query: {
            "max-level": 2,
            tt: timetableId
          }
        }
      })
      
      if (response.data) {
        events.value = response.data
        return response.data
      } else {
        error.value = 'Failed to fetch timetable events'
        events.value = []
        return []
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      events.value = []
      return []
    } finally {
      isLoading.value = false
    }
  }

  const getEvent = async (id: number) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await client.GET('/api/ttevent/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader
        }
      })
      
      if (response.data) {
        selectedEvent.value = response.data
        return response.data
      } else {
        error.value = 'Failed to fetch timetable event'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return null
    } finally {
      isLoading.value = false
    }
  }

  const createEvent = async (event: TTEventRequest) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await client.POST('/api/ttevent/', {
        params: {
          header: schemaStore.termHeader,
        },
        body: event,
      })
      if (response.data) {
        if (events.value.length > 0 && typeof event.tt === 'number') {
          await fetchEvents(event.tt)
        }
        return response.data
      } else {
        error.value = 'Failed to create timetable event'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return null
    } finally {
      isLoading.value = false
    }
  }

  const updateEvent = async (id: number, eventData: Partial<TTEventRequest>) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await client.PATCH('/api/ttevent/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader,
        },
        body: eventData
      })
      if (response.data) {
        const index = events.value.findIndex(e => e.id === id)
        if (index !== -1) {
          events.value[index] = { ...events.value[index], ...eventData, id }
        }
        return response.data
      } else {
        error.value = 'Failed to update timetable event'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return null
    } finally {
      isLoading.value = false
    }
  }

  const deleteEvent = async (id: number, timetableId?: number) => {
    isLoading.value = true
    error.value = null
    try {
      const { response } = await client.DELETE('/api/ttevent/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader,
        }
      })
      if (response.status === 204) {
        events.value = events.value.filter(e => e.id !== id)
        
        if (timetableId) {
          await fetchEvents(timetableId)
        }
        
        return true
      } else {
        error.value = 'Failed to delete timetable event'
        return false
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return false
    } finally {
      isLoading.value = false
    }
  }

  const generateTimetableEvents = async (timetable: { id: number, name: string }, subjectGroupName: string, ttProgram: string) => {
    isLoading.value = true
    error.value = null
    try {
      // TODO: Backend needs to be updated to accept timetable ID instead of name
      const response = await client.GET('/api/ttecontroller/generate-tte-events/', {
        params: {
          header: schemaStore.termHeader,
          query: {
            tt_name: timetable.name, 
            subjectgroup_name: subjectGroupName,
            tt_program: ttProgram
          }
        }
      })
      
      if (response.data) {
        // Refresh the events list after generation
        await fetchEvents(timetable.id)
        return { success: true, data: response.data }
      } else {
        error.value = 'Failed to generate timetable events'
        return { success: false, error: 'No data returned from server' }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  const clearSelection = () => {
    selectedEvent.value = null
  }

  watchEffect(() => {
    if (!schemaStore.activeSchema?.id) {
      events.value = []
      clearSelection()
    }
  })

  return {
    events,
    selectedEvent,
    isLoading,
    error,
    fetchEvents,
    getEvent,
    createEvent,
    updateEvent,
    deleteEvent,
    clearSelection,
    generateTimetableEvents
  }
})
