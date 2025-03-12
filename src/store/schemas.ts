import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { client } from '../lib/client'
import { components } from 'schema'

type Schema = components['schemas']['schema']

export const useSchemaStore = defineStore('schemas', () => {
  const schemas = ref<Schema[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Get all available schemas
  const fetchSchemas = async () => {
    isLoading.value = true
    error.value = null
    try {
      const response = await client.GET('/api/schemas/', {})
      if (response.data) {
        schemas.value = response.data
      } else {
        error.value = 'Failed to fetch schemas'
      }
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Unknown error occurred'
    } finally {
      isLoading.value = false
    }
  }

  // Set active schema
  const setActiveSchema = async (schemaId: string) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await client.POST('/api/schemas/{id}/activate/', {
        params: {
          path: { id: Number(schemaId) },
        },
      })

      if (response.error) {
        error.value = 'Failed to update active schema on the server'
        return
      }

      schemas.value.forEach((schema) => {
        schema.is_active = schema.id === Number(schemaId)
      })
    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : 'Unknown error occurred while updating active schema'
    } finally {
      isLoading.value = false
    }
  }

  // Get active schema object
  const activeSchema = computed<Schema | null>(
    () => schemas.value.find((schema) => schema.is_active) || null,
  )


  // Initialize store - load active schema from localStorage
  const initialize = () => {
    fetchSchemas()
  }

  return {
    schemas,
    activeSchema,
    isLoading,
    error,
    fetchSchemas,
    setActiveSchema,
    initialize,
  }
})
