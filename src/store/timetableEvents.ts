import { defineStore } from 'pinia'
import { ref, watch, watchEffect } from 'vue'
import { client } from '../lib/client'
import { useSchemaStore } from './schemas'
import { components } from '@/types/schema'

type TTEvent = components['schemas']['TTEvent']
type TTActivity = components['schemas']['TTActivity']
type TTEventRequest = components['schemas']['TTEventRequest']
type TTActivityRequest = components['schemas']['TTActivityRequest']
export type TTEventRequestExtended = Omit<TTEventRequest, 'tta'> & {
  tta: number | TTActivityRequest
}
export type TTEventExtended = Omit<TTEventRequest, 'tta'> & {
  tta: number | TTActivity
}

export const useTimetableEventStore = defineStore(
  'timetableEvents',
  () => {
    const schemaStore = useSchemaStore()
    const events = ref<TTEvent[]>([])
    const selectedEvent = ref<TTEvent | null>(null)
    const isLoading = ref(false)

    const fetchEvents = async (timetableId?: number) => {
      if (!schemaStore.activeSchema?.id) {
        events.value = []
        return []
      }

      isLoading.value = true
      try {
        const response = await client.GET('/api/ttevent/', {
          params: {
            header: schemaStore.termHeader,
            query: {
              'max-level': 2,
              tt: timetableId,
            },
          },
        })

        if (response.data) {
          events.value = response.data.results
          return response.data.results
        } else {
          return []
        }
      } finally {
        isLoading.value = false
      }
    }

    const getEvent = async (id: number) => {
      isLoading.value = true

      try {
        const response = await client.GET('/api/ttevent/{id}/', {
          params: {
            path: { id },
            header: schemaStore.termHeader,
          },
        })

        if (response.data) {
          selectedEvent.value = response.data
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

    const createEvent = async (event: TTEventRequestExtended) => {
      isLoading.value = true
      try {
        if (typeof event.tta !== 'number') {
          const activityResponse = await client.POST('/api/ttactivity/', {
            params: {
              header: schemaStore.termHeader,
            },
            body: event.tta,
          })

          if (!activityResponse.data) {
            return null
          }

          event = {
            ...event,
            tta: activityResponse.data.id!,
          }
        }

        const response = await client.POST('/api/ttevent/', {
          params: {
            header: schemaStore.termHeader,
          },
          body: event as TTEventRequest,
        })

        if (response.data) {
          if (events.value.length > 0 && typeof event.tt === 'number') {
            await fetchEvents(event.tt)
          }
          return response.data
        } else {
          return null
        }
      } catch (err) {
        console.error('Error creating event:', err)
        return null
      } finally {
        isLoading.value = false
      }
    }

    const updateEvent = async (
      id: number,
      eventData: Partial<TTEventExtended>,
    ) => {
      isLoading.value = true
      try {
        if (eventData.tta && typeof eventData.tta !== 'number') {
          await client.PATCH('/api/ttactivity/{id}/', {
            params: {
              path: { id: eventData.tta.id as number },
              header: schemaStore.termHeader,
            },
            body: eventData.tta,
          })

          eventData.tta = eventData.tta.id
          eventData.tt = eventData.tt
        }

        const response = await client.PATCH('/api/ttevent/{id}/', {
          params: {
            path: { id },
            header: schemaStore.termHeader,
          },
          body: eventData as Partial<TTEventRequest>,
        })
        if (response.data) {
          const index = events.value.findIndex((e) => e.id === id)
          if (index !== -1) {
            events.value[index] = {
              ...events.value[index],
              ...eventData,
              id,
            } as TTEvent
          }
          return response.data
        } else {
          return null
        }
      } finally {
        isLoading.value = false
      }
    }

    const deleteEvent = async (id: number, timetableId?: number) => {
      isLoading.value = true
      try {
        const { response } = await client.DELETE('/api/ttevent/{id}/', {
          params: {
            path: { id },
            header: schemaStore.termHeader,
          },
        })
        if (response.status === 204) {
          events.value = events.value.filter((e) => e.id !== id)

          if (timetableId) {
            await fetchEvents(timetableId)
          }

          return true
        } else {
          return false
        }
      } finally {
        isLoading.value = false
      }
    }

    const generateTimetableEvents = async (
      timetableId: number,
      subjectGroupName: string,
    ) => {
      isLoading.value = true
      try {
        const response = await client.GET(
          '/api/ttecontroller/generate-tte-events/',
          {
            params: {
              header: schemaStore.termHeader,
              query: {
                tt_id: String(timetableId),
                subjectgroup_name: subjectGroupName,
              },
            },
          },
        )

        if (response.data) {
          await fetchEvents(timetableId)
          return { success: true, data: response.data }
        } else {
          return { success: false, error: 'No data returned from server' }
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error occurred'
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
      fetchEvents,
      getEvent,
      createEvent,
      updateEvent,
      deleteEvent,
      clearSelection,
      generateTimetableEvents,
    }
  },
  {
    share: {
      enable: true,
      initialize: true,
    },
  },
)
