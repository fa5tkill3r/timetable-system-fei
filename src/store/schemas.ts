import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { client } from '../lib/client'
import { components } from '@/types/schema'

type Schema = components['schemas']['schema']
type SchemaRequest = components['schemas']['schemaRequest']

export const useSchemaStore = defineStore('schemas', () => {
  const schemas = ref<Schema[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchSchemas = async () => {
    isLoading.value = true
    error.value = null
    try {
      const response = await client.GET('/api/schemas/', {})
      if (response.data) {
        schemas.value = response.data.results
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

  const createSchema = async (schemaData: SchemaRequest) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await client.POST('/api/schemas/', {
        body: schemaData,
      })
      if (response.data) {
        await fetchSchemas()
        return response.data
      }
      error.value = 'Failed to create schema'
      return null
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Unknown error occurred'
      return null
    } finally {
      isLoading.value = false
    }
  }

  const updateSchema = async (schemaId: number, schemaData: SchemaRequest) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await client.PUT('/api/schemas/{id}/', {
        params: {
          path: { id: schemaId },
        },
        body: schemaData,
      })
      if (response.data) {
        const index = schemas.value.findIndex((s) => s.id === schemaId)
        if (index !== -1) {
          schemas.value[index] = response.data
        }
        return response.data
      }
      error.value = 'Failed to update schema'
      return null
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Unknown error occurred'
      return null
    } finally {
      isLoading.value = false
    }
  }

  const deleteSchema = async (schemaId: number) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await client.DELETE('/api/schemas/{id}/', {
        params: {
          path: { id: schemaId },
        },
      })
      if (response.error) {
        error.value = 'Failed to delete schema'
        return false
      }
      schemas.value = schemas.value.filter((s) => s.id !== schemaId)
      return true
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Unknown error occurred'
      return false
    } finally {
      isLoading.value = false
    }
  }

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
        return false
      }

      schemas.value.forEach((schema) => {
        schema.is_active = schema.id === Number(schemaId)
      })
      return true
    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : 'Unknown error occurred while updating active schema'
      return false
    } finally {
      isLoading.value = false
    }
  }

  const activeSchema = computed<Schema | null>(
    () => schemas.value.find((schema) => schema.is_active) || null,
  )

  const termHeader = computed(() => {
    return activeSchema.value?.id
      ? { 'X-Term': String(activeSchema.value?.schema_name) }
      : { 'X-Term': '' }
  })

  fetchSchemas()

  return {
    schemas,
    activeSchema,
    termHeader,
    isLoading,
    error,
    fetchSchemas,
    createSchema,
    updateSchema,
    deleteSchema,
    setActiveSchema,
  }
})
