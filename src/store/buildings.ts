import { defineStore } from 'pinia'
import { ref, watchEffect } from 'vue'
import { client } from '../lib/client'
import { useSchemaStore } from './schemas'
import { components } from 'schema'

type RoomEquipment = components['schemas']['RoomEquipment'] 
type RoomEquipmentRequest = components['schemas']['RoomEquipmentRequest'] 
type Room = components['schemas']['Room']
type RoomRequest = components['schemas']['RoomRequest']
type Building = components['schemas']['Building']
type BuildingRequest = components['schemas']['BuildingRequest']

export const useBuildingStore = defineStore('buildings', () => {
  const schemaStore = useSchemaStore()
  const buildings = ref<Building[]>([])
  const rooms = ref<Room[]>([])
  const roomEquipment = ref<RoomEquipment[]>([])
  const selectedBuilding = ref<Building | null>(null)
  const selectedRoom = ref<Room | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchBuildings = async () => {
    if (!schemaStore.activeSchema?.id) {
      buildings.value = []
      return []
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
        return []
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      buildings.value = []
      return []
    } finally {
      isLoading.value = false
    }
  }

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


  const fetchRoomEquipment = async (roomId: number) => {
    if (!schemaStore.activeSchema?.id) {
      roomEquipment.value = []
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
        roomEquipment.value = response.data
        return response.data
      } else {
        error.value = 'Failed to fetch equipment'
        roomEquipment.value = []
        return []
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      roomEquipment.value = []
      return []
    } finally {
      isLoading.value = false
    }
  }

  const createRoomEquipment = async (roomId: number, equipmentData: RoomEquipmentRequest) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await client.POST('/api/room-equipment/', {
        params: {
          header: schemaStore.termHeader,
        },
        body: equipmentData
      })
      if (response.data) {
        await fetchRoomEquipment(roomId)
        return response.data
      } else {
        error.value = 'Failed to add equipment to room'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return null
    } finally {
      isLoading.value = false
    }
  }

  const updateRoomEquipment = async (equipmentId: number, equipmentData: RoomEquipmentRequest) => {
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
        await fetchRoomEquipment(equipmentData.room)
        return response.data
      } else {
        error.value = 'Failed to update room equipment'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return null
    } finally {
      isLoading.value = false
    }
  }

  const deleteRoomEquipment = async (equipmentId: number, roomId: number) => {
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
        await fetchRoomEquipment(roomId)
        return true
      } else {
        error.value = 'Failed to delete room equipment'
        return false
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return false
    } finally {
      isLoading.value = false
    }
  }

  const clearSelections = () => {
    selectedBuilding.value = null
    selectedRoom.value = null
  }

  watchEffect(() => {
    if (schemaStore.activeSchema?.id) {
      fetchBuildings()
    } else {
      buildings.value = []
      rooms.value = []
      roomEquipment.value = []
      clearSelections()
    }
  })

  return {
    buildings,
    rooms,
    roomEquipment,
    selectedBuilding,
    selectedRoom,
    isLoading,
    error,
    fetchBuildings,
    getBuilding,
    fetchRooms,
    getRoom,
    fetchRoomEquipment,
    createBuilding,
    updateBuilding,
    deleteBuilding,
    createRoom,
    updateRoom,
    deleteRoom,
    createRoomEquipment,
    updateRoomEquipment,
    deleteRoomEquipment,
    clearSelections
  }
})
