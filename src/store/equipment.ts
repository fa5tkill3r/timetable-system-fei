import { defineStore } from 'pinia'
import { ref, watchEffect } from 'vue'
import { client } from '../lib/client'
import { useSchemaStore } from './schemas'
import { components } from '@/types/schema'

type Equipment = components['schemas']['Equipment']
type EquipmentRequest = { name: string }

export const useEquipmentStore = defineStore('equipment', () => {
  const schemaStore = useSchemaStore()
  const equipment = ref<Equipment[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchEquipment = async () => {
    if (!schemaStore.activeSchema?.id) {
      equipment.value = []
      return []
    }

    isLoading.value = true
    error.value = null
    try {
      const response = await client.GET('/api/equipment/', {
        params: {
          header: schemaStore.termHeader,
        },
      })
      if (response.data) {
        equipment.value = response.data.results
        return response.data.results
      } else {
        error.value = 'Failed to fetch equipment'
        equipment.value = []
        return []
      }
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Unknown error occurred'
      equipment.value = []
      return []
    } finally {
      isLoading.value = false
    }
  }

  const createEquipment = async (equipmentData: EquipmentRequest) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await client.POST('/api/equipment/', {
        params: {
          header: schemaStore.termHeader,
        },
        body: equipmentData,
      })
      if (response.data) {
        await fetchEquipment()
        return response.data
      } else {
        error.value = 'Failed to create equipment'
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

  const updateEquipment = async (
    id: number,
    equipmentData: EquipmentRequest,
  ) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await client.PUT('/api/equipment/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader,
        },
        body: equipmentData,
      })
      if (response.data) {
        await fetchEquipment()
        return response.data
      } else {
        error.value = 'Failed to update equipment'
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

  const deleteEquipment = async (id: number) => {
    isLoading.value = true
    error.value = null
    try {
      const { response } = await client.DELETE('/api/equipment/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader,
        },
      })
      if (response.status === 204) {
        await fetchEquipment()
        return true
      } else {
        error.value = 'Failed to delete equipment'
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

  watchEffect(() => {
    if (schemaStore.activeSchema?.id) {
      fetchEquipment()
    } else {
      equipment.value = []
    }
  })

  return {
    equipment,
    isLoading,
    error,
    fetchEquipment,
    createEquipment,
    updateEquipment,
    deleteEquipment,
  }
})
