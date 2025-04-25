import { defineStore } from 'pinia'
import { ref, computed, watchEffect } from 'vue'
import { client } from '../lib/client'
import { useSchemaStore } from './schemas'
import { components } from 'schema'

type RoomGroup = components['schemas']['RoomGroup']
type RoomGroupRequest = components['schemas']['RoomGroupRequest']

export const useRoomGroupStore = defineStore('roomGroups', () => {
  const schemaStore = useSchemaStore()
  const roomGroups = ref<RoomGroup[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchRoomGroups = async () => {
    if (!schemaStore.activeSchema?.id) {
      roomGroups.value = []
      return
    }

    isLoading.value = true
    error.value = null
    try {
      const response = await client.GET('/api/room-groups/', {
        params: {
          header: schemaStore.termHeader,
        },
      })
      if (response.data) {
        roomGroups.value = response.data.results
      } else {
        error.value = 'Failed to fetch room groups'
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
    } finally {
      isLoading.value = false
    }
  }

  watchEffect(() => {
    if (schemaStore.activeSchema?.id) {
      fetchRoomGroups()
    } else {
      roomGroups.value = []
    }
  })

  const createRoomGroup = async (roomGroup: RoomGroupRequest) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await client.POST('/api/room-groups/', {
        params: {
          header: schemaStore.termHeader,
        },
        body: roomGroup,
      })
      if (response.data) {
        roomGroups.value.push(response.data)
        return response.data
      } else {
        error.value = 'Failed to create room group'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return null
    } finally {
      isLoading.value = false
    }
  }

  const updateRoomGroup = async (id: number, roomGroup: RoomGroupRequest) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await client.PUT('/api/room-groups/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader,
        },
        body: roomGroup,
      })
      if (response.data) {
        const index = roomGroups.value.findIndex((rg) => rg.id === id)
        if (index !== -1) {
          roomGroups.value[index] = response.data
        }
        return response.data
      } else {
        error.value = 'Failed to update room group'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return null
    } finally {
      isLoading.value = false
    }
  }

  const deleteRoomGroup = async (id: number) => {
    isLoading.value = true
    error.value = null
    try {
      const { response } = await client.DELETE('/api/room-groups/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader,
        },
      })
      if (response.status === 204) {
        roomGroups.value = roomGroups.value.filter((rg) => rg.id !== id)
        return true
      } else {
        error.value = 'Failed to delete room group'
        return false
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return false
    } finally {
      isLoading.value = false
    }
  }

  const groupsByName = computed(() => {
    const groups: { [name: string]: RoomGroup[] } = {}
    roomGroups.value.forEach(group => {
      if (!groups[group.name]) {
        groups[group.name] = []
      }
      (groups[group.name] ??= []).push(group)
    })
    return groups
  })

  // Get unique group names
  const uniqueGroupNames = computed(() => {
    return Array.from(new Set(roomGroups.value.map(group => group.name)))
  })
  
  // Check if a room is in a specific group by name
  const isRoomInGroup = (roomId: number, groupName: string) => {
    return roomGroups.value.some(group => 
      group.name === groupName && group.room === roomId
    )
  }

  // Get all groups that a room belongs to
  const getRoomGroups = (roomId: number) => {
    return roomGroups.value.filter(group => group.room === roomId)
  }

  // Get all rooms that belong to a specific group name
  const getRoomsByGroupName = (groupName: string) => {
    return roomGroups.value
      .filter(group => group.name === groupName)
      .map(group => group.room)
  }

  // Group options for filtering (unique names with room counts)
  const groupOptions = computed(() => {
    const options: { label: string; value: string; count: number }[] = []
    
    Object.entries(groupsByName.value).forEach(([name, groups]) => {
      options.push({
        label: name,
        value: name, // Use name as value since that's what we filter by
        count: groups.length
      })
    })
    
    return options
  })

  return {
    roomGroups,
    isLoading,
    error,
    fetchRoomGroups,
    createRoomGroup,
    updateRoomGroup,
    deleteRoomGroup,
    isRoomInGroup,
    getRoomGroups,
    getRoomsByGroupName,
    uniqueGroupNames,
    groupOptions
  }
})
