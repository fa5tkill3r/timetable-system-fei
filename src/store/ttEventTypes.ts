import { defineStore } from 'pinia'
import { ref, watchEffect } from 'vue'
import { client } from '../lib/client'
import { useSchemaStore } from './schemas'
import { components } from '@/types/schema'

type TTEType = components['schemas']['TTEventType']
type TTETypeRequest = components['schemas']['TTEventTypeRequest']

export const useTTEventTypeStore = defineStore('ttEventTypes', () => {
  const schemaStore = useSchemaStore()
  const eventTypes = ref<TTEType[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Get all event types
  const fetchEventTypes = async () => {
    // Don't fetch if no active schema
    if (!schemaStore.activeSchema?.id) {
      eventTypes.value = []
      return []
    }

    isLoading.value = true
    error.value = null
    try {
      const response = await client.GET('/api/ttetype/', {
        params: {
          header: schemaStore.termHeader,
        },
      })
      if (response.data) {
        eventTypes.value = response.data.results
        return response.data.results
      } else {
        error.value = 'Failed to fetch event types'
        eventTypes.value = []
        return []
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      eventTypes.value = []
      return []
    } finally {
      isLoading.value = false
    }
  }

  // Create a new event type
  const createEventType = async (eventType: TTETypeRequest) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await client.POST('/api/ttetype/', {
        params: {
          header: schemaStore.termHeader,
        },
        body: eventType,
      })
      if (response.data) {
        eventTypes.value.push(response.data)
        return response.data
      } else {
        error.value = 'Failed to create event type'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Update existing event type
  const updateEventType = async (id: number, eventType: TTETypeRequest) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await client.PUT('/api/ttetype/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader,
        },
        body: eventType,
      })
      if (response.data) {
        const index = eventTypes.value.findIndex((t) => t.id === id)
        if (index !== -1) {
          eventTypes.value[index] = response.data
        }
        return response.data
      } else {
        error.value = 'Failed to update event type'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Delete event type
  const deleteEventType = async (id: number) => {
    isLoading.value = true
    error.value = null
    try {
      const { response } = await client.DELETE('/api/ttetype/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader,
        },
      })
      if (response.status === 204) {
        eventTypes.value = eventTypes.value.filter((t) => t.id !== id)
        return true
      } else {
        error.value = 'Failed to delete event type'
        return false
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Get event type by ID
  const getEventTypeById = (id: number) => {
    return eventTypes.value.find(type => type.id === id)
  }

  // Use watchEffect to automatically fetch event types when active schema changes
  watchEffect(() => {
    if (schemaStore.activeSchema?.id) {
      fetchEventTypes()
    } else {
      eventTypes.value = []
    }
  })

  return {
    eventTypes,
    isLoading,
    error,
    fetchEventTypes,
    createEventType,
    updateEventType,
    deleteEventType,
    getEventTypeById
  }
})
