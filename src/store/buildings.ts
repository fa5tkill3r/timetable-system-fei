import { defineStore } from 'pinia'
import { ref, watchEffect } from 'vue'
import { client } from '../lib/client'
import { useSchemaStore } from './schemas'
import { components, operations } from '@/types/schema'

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
  const selectedBuilding = ref<Building | null>(null)
  const selectedRoom = ref<Room | null>(null)
  const isLoading = ref(false)

  const fetchBuildings = async (): Promise<Building[]> => {
    if (!schemaStore.activeSchema?.id) {
      buildings.value = []
      return []
    }
    
    isLoading.value = true
    try {
      const response = await client.GET('/api/buildings/', {
        params: {
          header: schemaStore.termHeader
        }
      })
      
      buildings.value = response.data?.results || []
      return buildings.value
    } catch (err) {
      buildings.value = []
      return []
    } finally {
      isLoading.value = false
    }
  }

  const getBuilding = async (id: number): Promise<Building | null> => {
    isLoading.value = true
    try {
      const response = await client.GET('/api/buildings/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader
        }
      })
      
      selectedBuilding.value = response.data || null
      return selectedBuilding.value
    } catch (err) {
      return null
    } finally {
      isLoading.value = false
    }
  }

  const createBuilding = async (building: BuildingRequest): Promise<Building | null> => {
    isLoading.value = true
    try {
      const response = await client.POST('/api/buildings/', {
        params: {
          header: schemaStore.termHeader,
        },
        body: building,
      })
      
      await fetchBuildings()
      return response.data || null
    } catch (err) {
      return null
    } finally {
      isLoading.value = false
    }
  }

  const updateBuilding = async (id: number, building: BuildingRequest): Promise<Building | null> => {
    isLoading.value = true
    try {
      const response = await client.PUT('/api/buildings/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader,
        },
        body: building
      })
      
      await fetchBuildings()
      return response.data || null
    } catch (err) {
      return null
    } finally {
      isLoading.value = false
    }
  }

  const deleteBuilding = async (id: number): Promise<boolean> => {
    isLoading.value = true
    try {
      const { response } = await client.DELETE('/api/buildings/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader,
        }
      })
      
      buildings.value = buildings.value.filter(b => b.id !== id)

      return true
    } catch (err) {
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const fetchRooms = async (buildingId?: number): Promise<Room[]> => {
    if (!schemaStore.activeSchema?.id) {
      rooms.value = []
      return []
    }
    
    isLoading.value = true
    try {
      const query: operations['rooms_list']['parameters']['query'] = {};
      if (buildingId !== undefined) {
        query.building = buildingId;
      }
      
      const response = await client.GET('/api/rooms/', {
        params: {
          header: schemaStore.termHeader,
          query
        }
      })
      
      rooms.value = response.data?.results || []
      return rooms.value
    } catch (err) {
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const getRoom = async (id: number): Promise<Room | null> => {
    isLoading.value = true
    try {
      const response = await client.GET('/api/rooms/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader
        }
      })
      
      selectedRoom.value = response.data || null
      return selectedRoom.value
    } catch (err) {
      return null
    } finally {
      isLoading.value = false
    }
  }

  const createRoom = async (room: RoomRequest): Promise<Room | null> => {
    isLoading.value = true
    try {
      const response = await client.POST('/api/rooms/', {
        params: {
          header: schemaStore.termHeader,
        },
        body: room
      })
      
      if (rooms.value.length > 0) {
        await fetchRooms(room.building ?? undefined)
      }
      return response.data || null
    } catch (err) {
      return null
    } finally {
      isLoading.value = false
    }
  }

  const updateRoom = async (roomId: number, room: RoomRequest): Promise<Room | null> => {
    isLoading.value = true
    try {
      const response = await client.PUT('/api/rooms/{id}/', {
        params: {
          path: { id: roomId },
          header: schemaStore.termHeader,
        },
        body: room
      })
      
      if (rooms.value.length > 0) {
        await fetchRooms(room.building ?? undefined)
      }
      return response.data || null
    } catch (err) {
      return null
    } finally {
      isLoading.value = false
    }
  }

  const deleteRoom = async (roomId: number, buildingId: number): Promise<boolean> => {
    isLoading.value = true
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
      }
      return false
    } catch (err) {
      return false
    } finally {
      isLoading.value = false
    }
  }

  const fetchRoomEquipment = async (roomId: number): Promise<RoomEquipment[]> => {
    if (!schemaStore.activeSchema?.id) {
      return []
    }
    
    isLoading.value = true
    try {
      const response = await client.GET('/api/room-equipment/', {
        params: {
          header: schemaStore.termHeader,
          query: { room: roomId }
        }
      })
      
      return response.data?.results || []
    } catch (err) {
      return []
    } finally {
      isLoading.value = false
    }
  }

  const fetchRoomEquipmentByEquipment = async (equipmentId: number): Promise<RoomEquipment[]> => {
    if (!schemaStore.activeSchema?.id) {
      return []
    }
    
    isLoading.value = true
    try {
      const response = await client.GET('/api/room-equipment/', {
        params: {
          header: schemaStore.termHeader,
          query: { equipment: equipmentId }
        }
      })
      
      return response.data?.results || []
    } catch (err) {
      return []
    } finally {
      isLoading.value = false
    }
  }

  const createRoomEquipment = async (roomId: number, equipmentData: RoomEquipmentRequest): Promise<RoomEquipment | null> => {
    isLoading.value = true
    try {
      const response = await client.POST('/api/room-equipment/', {
        params: {
          header: schemaStore.termHeader,
        },
        body: equipmentData
      })
      
      return response.data || null
    } catch (err) {
      return null
    } finally {
      isLoading.value = false
    }
  }

  const updateRoomEquipment = async (equipmentId: number, equipmentData: RoomEquipmentRequest): Promise<RoomEquipment | null> => {
    isLoading.value = true
    try {
      const response = await client.PUT('/api/room-equipment/{id}/', {
        params: {
          path: { id: equipmentId },
          header: schemaStore.termHeader,
        },
        body: equipmentData
      })
      
      return response.data || null
    } catch (err) {
      return null
    } finally {
      isLoading.value = false
    }
  }

  const deleteRoomEquipment = async (equipmentId: number, roomId: number): Promise<boolean> => {
    isLoading.value = true
    try {
      const { response } = await client.DELETE('/api/room-equipment/{id}/', {
        params: {
          path: { id: equipmentId },
          header: schemaStore.termHeader,
        }
      })
      
      return response.status === 204
    } catch (err) {
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
      clearSelections()
    }
  })

  return {
    buildings,
    rooms,
    selectedBuilding,
    selectedRoom,
    isLoading,
    fetchBuildings,
    getBuilding,
    fetchRooms,
    getRoom,
    fetchRoomEquipment,
    fetchRoomEquipmentByEquipment,
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
