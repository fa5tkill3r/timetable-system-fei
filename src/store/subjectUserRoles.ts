import { defineStore } from 'pinia'
import { ref, computed, watchEffect } from 'vue'
import { client } from '../lib/client'
import { useSchemaStore } from './schemas'
import { components } from '@/types/schema'

type SubjectUserRole = components['schemas']['SubjectUserRole']
type Subject = components['schemas']['Subject']
type SubjectUserRoleRequest = components['schemas']['SubjectUserRoleRequest']

interface Role {
  id: number
  display_name: string
  description: string
}

export const useSubjectUserRoleStore = defineStore('subjectUserRoles', () => {
  const schemaStore = useSchemaStore()
  const subjectUserRoles = ref<SubjectUserRole[]>([])
  const lecturers = ref<SubjectUserRole[]>([])
  const isLoading = ref(false)

  const fetchSubjectUserRoles = async () => {
    if (!schemaStore.activeSchema?.id) {
      subjectUserRoles.value = []
      return []
    }

    isLoading.value = true
    try {
      const response = await client.GET('/api/subject-user-roles/', {
        params: {
          header: schemaStore.termHeader,
        },
      })
      if (response.data) {
        subjectUserRoles.value = response.data.results
        return response.data.results
      } else {
        subjectUserRoles.value = []
        return []
      }
    } finally {
      isLoading.value = false
    }
  }

  const fetchLecturers = async () => {
    if (!schemaStore.activeSchema?.id) {
      lecturers.value = []
      return []
    }

    isLoading.value = true
    try {
      const response = await client.GET('/api/subject-user-roles/', {
        params: {
          header: schemaStore.termHeader,
          query: {
            'max-level': 2,
            'role_id__in': [1,3] // Prednasajuci a cviciaci
          }
        },
      })
      if (response.data) {
        lecturers.value = response.data.results
        return response.data.results
      } else {
        lecturers.value = []
        return []
      }
    } finally {
      isLoading.value = false
    }
  }

  const getLecturersForSubject = (subjectId: number) => {
    return lecturers.value.filter(
      lecturer => (lecturer.subject as any as Subject)?.id === subjectId
    )
  }

  const createSubjectUserRole = async (subjectUserRole: SubjectUserRoleRequest) => {
    isLoading.value = true
    try {
      const response = await client.POST('/api/subject-user-roles/', {
        params: {
          header: schemaStore.termHeader,
        },
        body: subjectUserRole,
      })
      if (response.data) {
        subjectUserRoles.value.push(response.data)
        if (subjectUserRole.role === 1) {
          await fetchLecturers()
        }
        return response.data
      } else {
        return null
      }
    } finally {
      isLoading.value = false
    }
  }

  const updateSubjectUserRole = async (id: number, subjectUserRole: Partial<SubjectUserRoleRequest>) => {
    isLoading.value = true
    try {
      const response = await client.PATCH('/api/subject-user-roles/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader,
        },
        body: subjectUserRole,
      })
      if (response.data) {
        await fetchLecturers()
      } else {
        return null
      }
    } finally {
      isLoading.value = false
    }
  }

  const deleteSubjectUserRole = async (id: number) => {
    isLoading.value = true
    try {
      const { response } = await client.DELETE('/api/subject-user-roles/{id}/', {
        params: {
          path: { id },
          header: schemaStore.termHeader,
        },
      })
      if (response.status === 204) {
        await fetchLecturers()
        
        return true
      } else {
        return false
      }
    } finally {
      isLoading.value = false
    }
  }

  watchEffect(() => {
    if (schemaStore.activeSchema?.id) {
      fetchLecturers()
    } else {
      lecturers.value = []
      subjectUserRoles.value = []
    }
  })

  return {
    subjectUserRoles,
    lecturers,
    isLoading,
    fetchSubjectUserRoles,
    fetchLecturers,
    getLecturersForSubject,
    createSubjectUserRole,
    updateSubjectUserRole,
    deleteSubjectUserRole,
  }
})
