import { defineStore } from 'pinia'
import { ref, watchEffect } from 'vue'
import { client } from '../lib/client'
import { useSchemaStore } from './schemas'
import { components } from 'schema'

// Define types from schema components
type Equipment = components['schemas']['Equipment']
type Room = components['schemas']['Room']
type Building = components['schemas']['Building']
type EquipmentRequest = components['schemas']['EquipmentRequest']
type RoomRequest = components['schemas']['RoomRequest']
type BuildingRequest = components['schemas']['BuildingRequest']

export const useBuildingStore = defineStore('buildings', () => {
  const schemaStore = useSchemaStore()
  const buildings = ref<Building[]>([])
  const rooms = ref<Room[]>([])
  const equipment = ref<Equipment[]>([])
  const selectedBuilding = ref<Building | null>(null)
  const selectedRoom = ref<Room | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Fetch all buildings
  const fetchBuildings = async () => {
    // Don't fetch if no active schema
    if (!schemaStore.activeSchema?.id) {
      buildings.value = []
      return
    }
    
    isLoading.value = true
    error.value = null
    try {
      const response = await client.GET('/api/buildings/', {
        params: {
          header: schemaStore.termHeader
        }
      })
      
      if (response.data) {
        buildings.value = response.data
        return response.data
      } else {
        error.value = 'Failed to fetch buildings'
        buildings.value = []
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      buildings.value = []
    } finally {
      isLoading.value = false
    }
  }

  // Get a specific building
  const getBuilding = async (id: number) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await client.GET('/api/buildings/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader
        }
      })
      
      if (response.data) {
        selectedBuilding.value = response.data
        return response.data
      } else {
        error.value = 'Failed to fetch building'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Fetch rooms for a building
  const fetchRooms = async (buildingId: number) => {
    if (!schemaStore.activeSchema?.id) {
      rooms.value = []
      return []
    }
    
    isLoading.value = true
    error.value = null
    
    try {
      const response = await client.GET('/api/rooms/', {
        params: {
          header: schemaStore.termHeader,
          query: { building: buildingId }
        }
      })
      
      if (response.data) {
        rooms.value = response.data
        return response.data
      } else {
        error.value = 'Failed to fetch rooms'
        rooms.value = []
        return []
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      rooms.value = []
      return []
    } finally {
      isLoading.value = false
    }
  }

  // Get a specific room
  const getRoom = async (id: number) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await client.GET('/api/rooms/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader
        }
      })
      
      if (response.data) {
        selectedRoom.value = response.data
        return response.data
      } else {
        error.value = 'Failed to fetch room'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Fetch equipment for a room
  const fetchEquipment = async (roomId: number) => {
    if (!schemaStore.activeSchema?.id) {
      equipment.value = []
      return []
    }
    
    isLoading.value = true
    error.value = null
    
    try {
      const response = await client.GET('/api/room-equipment/', {
        params: {
          header: schemaStore.termHeader,
          query: { room: roomId }
        }
      })
      
      if (response.data) {
        equipment.value = response.data
        return response.data
      } else {
        error.value = 'Failed to fetch equipment'
        equipment.value = []
        return []
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      equipment.value = []
      return []
    } finally {
      isLoading.value = false
    }
  }

  // Create a new building
  const createBuilding = async (building: BuildingRequest) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await client.POST('/api/buildings/', {
        params: {
          header: schemaStore.termHeader,
        },
        body: building,
      })
      if (response.data) {
        await fetchBuildings()
        return response.data
      } else {
        error.value = 'Failed to create building'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Update existing building
  const updateBuilding = async (id: number, building: BuildingRequest) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await client.PUT('/api/buildings/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader,
        },
        body: building
      })
      if (response.data) {
        await fetchBuildings()
        return response.data
      } else {
        error.value = 'Failed to update building'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Delete building
  const deleteBuilding = async (id: number) => {
    isLoading.value = true
    error.value = null
    try {
      const { response } = await client.DELETE('/api/buildings/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader,
        }
      })
      if (response.status === 204) {
        buildings.value = buildings.value.filter(b => b.id !== id)
        return true
      } else {
        error.value = 'Failed to delete building'
        return false
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Create a room in a building
  const createRoom = async (room: RoomRequest) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await client.POST('/api/rooms/', {
        params: {
          header: schemaStore.termHeader,
        },
        body: room
      })
      if (response.data) {
        if (rooms.value.length > 0) {
          await fetchRooms(room.building)
        }
        return response.data
      } else {
        error.value = 'Failed to create room'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Update room
  const updateRoom = async (roomId: number, room: RoomRequest) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await client.PUT('/api/rooms/{id}/', {
        params: {
          path: { id: roomId },
          header: schemaStore.termHeader,
        },
        body: room
      })
      if (response.data) {
        if (rooms.value.length > 0) {
          await fetchRooms(room.building)
        }
        return response.data
      } else {
        error.value = 'Failed to update room'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Delete room
  const deleteRoom = async (roomId: number, buildingId: number) => {
    isLoading.value = true
    error.value = null
    try {
      const { response } = await client.DELETE('/api/rooms/{id}/', {
        params: {
          path: { id: roomId },
          header: schemaStore.termHeader,
        }
      })
      if (response.status === 204) {
        if (rooms.value.length > 0) {
          await fetchRooms(buildingId)
        }
        return true
      } else {
        error.value = 'Failed to delete room'
        return false
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Equipment operations
  const createEquipment = async (roomId: number, equipmentData: EquipmentRequest) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await client.POST('/api/room-equipment/', {
        params: {
          header: schemaStore.termHeader,
        },
        body: {
          ...equipmentData,
          room_id: roomId
        }
      })
      if (response.data) {
        if (equipment.value.length > 0) {
          await fetchEquipment(roomId)
        }
        return response.data
      } else {
        error.value = 'Failed to create equipment'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return null
    } finally {
      isLoading.value = false
    }
  }

  const updateEquipment = async (equipmentId: number, equipmentData: EquipmentRequest) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await client.PUT('/api/room-equipment/{id}/', {
        params: {
          path: { id: equipmentId },
          header: schemaStore.termHeader,
        },
        body: equipmentData
      })
      if (response.data) {
        if (equipment.value.length > 0) {
          await fetchEquipment(equipmentData.room_id)
        }
        return response.data
      } else {
        error.value = 'Failed to update equipment'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return null
    } finally {
      isLoading.value = false
    }
  }

  const deleteEquipment = async (equipmentId: number, roomId: number) => {
    isLoading.value = true
    error.value = null
    try {
      const { response } = await client.DELETE('/api/room-equipment/{id}/', {
        params: {
          path: { id: equipmentId },
          header: schemaStore.termHeader,
        }
      })
      if (response.status === 204) {
        if (equipment.value.length > 0) {
          await fetchEquipment(roomId)
        }
        return true
      } else {
        error.value = 'Failed to delete equipment'
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
    selectedBuilding.value = null
    selectedRoom.value = null
  }

  // Use watchEffect to automatically fetch buildings when active schema changes
  watchEffect(() => {
    if (schemaStore.activeSchema?.id) {
      fetchBuildings()
    } else {
      buildings.value = []
      rooms.value = []
      equipment.value = []
      clearSelections()
    }
  })

  return {
    buildings,
    rooms,
    equipment,
    selectedBuilding,
    selectedRoom,
    isLoading,
    error,
    fetchBuildings,
    getBuilding,
    fetchRooms,
    getRoom,
    fetchEquipment,
    createBuilding,
    updateBuilding,
    deleteBuilding,
    createRoom,
    updateRoom,
    deleteRoom,
    createEquipment,
    updateEquipment,
    deleteEquipment,
    clearSelections
  }
})
