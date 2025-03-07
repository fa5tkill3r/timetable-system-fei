<template>
  <div class="container py-6 space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-semibold">Schema Management</h1>
      <Button @click="openNewSchemaDialog">Create New Schema</Button>
    </div>

    <!-- Schema listing -->
    <div class="border rounded-lg shadow-sm bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Term</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead class="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="loading">
            <TableCell colspan="5" class="text-center py-4">
              <div class="flex justify-center items-center">
                <div class="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
                Loading schemas...
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-else-if="schemas.length === 0">
            <TableCell colspan="5" class="text-center py-4 text-muted-foreground">
              No schemas found. Create your first schema.
            </TableCell>
          </TableRow>
          <TableRow v-for="schema in schemas" :key="schema.id">
            <TableCell>{{ schema.term }}</TableCell>
            <TableCell>{{ formatDate(schema.start_date) }}</TableCell>
            <TableCell>{{ formatDate(schema.end_date) }}</TableCell>
            <TableCell>
              <Badge :variant="schema.is_active ? 'default' : 'outline'">
                {{ schema.is_active ? 'Active' : 'Inactive' }}
              </Badge>
            </TableCell>
            <TableCell class="text-right">
              <div class="flex justify-end space-x-2">
                <Button variant="outline" size="sm" @click="editSchema(schema)">
                  <PencilIcon class="h-4 w-4" />
                  <span class="sr-only">Edit</span>
                </Button>
                <Button variant="outline" size="sm" @click="confirmDeleteSchema(schema)">
                  <TrashIcon class="h-4 w-4" />
                  <span class="sr-only">Delete</span>
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Dialogs -->
    <NewSchemaDialog
      :open="isNewSchemaDialogOpen"
      :terms="terms"
      :schema="newSchema"
      :term-id="selectedTermId"
      @update:open="isNewSchemaDialogOpen = $event"
      @update:term-id="selectedTermId = $event"
      @create="handleCreateSchema"
    />

    <EditSchemaDialog
      :open="isEditSchemaDialogOpen"
      :schema="editingSchema"
      @update:open="isEditSchemaDialogOpen = $event"
      @update="handleUpdateSchema"
    />

    <DeleteSchemaDialog
      :open="isDeleteDialogOpen"
      :schema="schemaToDelete"
      @update:open="isDeleteDialogOpen = $event"
      @delete="handleDeleteSchema"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { format, parseISO } from 'date-fns'
  import { PencilIcon, TrashIcon } from 'lucide-vue-next'
  import type { components } from '@/../schema'
  import { client } from '@/lib/client'
  import { Button } from '@/components/ui/button'
  import { Badge } from '@/components/ui/badge'
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
  import NewSchemaDialog from '@/components/schemas/NewSchemaDialog.vue'
  import EditSchemaDialog from '@/components/schemas/EditSchemaDialog.vue'
  import DeleteSchemaDialog from '@/components/schemas/DeleteSchemaDialog.vue'

  type Schema = components['schemas']['schema'];
  type SchemaRequest = components['schemas']['schemaRequest'];
  type Term = components['schemas']['PaginatedAISObdobieList'];


  // State
  const schemas = ref<Schema[] | undefined>([])
  const terms = ref<Term[]>([])
  const loading = ref(true)
  const isNewSchemaDialogOpen = ref(false)
  const isEditSchemaDialogOpen = ref(false)
  const isDeleteDialogOpen = ref(false)

  const selectedTermId = ref<number | null>(null)
  const newSchema = ref<SchemaRequest>({
    term: '',
    end_date: '',
    start_date: '',
    is_active: false,
  })

  const editingSchema = ref<Schema>({
    id: 0,
    term: '',
    start_date: '',
    end_date: '',
    is_active: false,
  })
  const schemaToDelete = ref<Schema | null>(null)

  // Methods
  function formatDate(dateString: string | null | undefined) {
    if (!dateString) return '-'
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy')
    } catch (e) {
      console.error('Date parsing error:', e)
      return dateString
    }
  }

  async function fetchSchemas() {
    loading.value = true
    try {
      const { data } = await client.GET('/api/schemas/')
      schemas.value = data
    } catch (err) {
      console.error('Error fetching schemas:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchTerms() {
    try {
      const { data } = await client.GET('/api/imports_exports/fei/terms/', {
        params: { query: { limit: 20 } },
      })

      if (data && Array.isArray(data.results)) {
        terms.value = data.results!
      }
    } catch (err) {
      console.error('Error fetching terms:', err)
    }
  }

  function openNewSchemaDialog() {
    newSchema.value = {
      term: '',
      end_date: '',
      start_date: '',
      is_active: false,
    }
    selectedTermId.value = null
    isNewSchemaDialogOpen.value = true
  }

  async function handleCreateSchema(schema: SchemaRequest) {
    try {
      await client.POST('/api/schemas/', {
        body: schema
      })

      isNewSchemaDialogOpen.value = false
      await fetchSchemas()
    } catch (err) {
      console.error('Error creating schema:', err)
    }
  }

  function editSchema(schema: Schema) {
    editingSchema.value = { ...schema }
    isEditSchemaDialogOpen.value = true
  }

  async function handleUpdateSchema(schema: Schema) {
    console.log(schema)
    try {
      await client.PUT(`/api/schemas/{id}/`, {
        params: {
          path: {
            id: schema.id!,
          },
        },
        body: schema,
      })

      isEditSchemaDialogOpen.value = false
      await fetchSchemas()
    } catch (err) {
      console.error('Error updating schema:', err)
    }
  }

  function confirmDeleteSchema(schema: Schema) {
    schemaToDelete.value = schema
    isDeleteDialogOpen.value = true
  }

  async function handleDeleteSchema(schema: Schema) {
    try {
      await client.DELETE(`/api/schemas/{id}/`, {
        params: {
          path: {
            id: schema.id!,
          },
        }
      })

      isDeleteDialogOpen.value = false
      await fetchSchemas()
    } catch (err) {
      console.error('Error deleting schema:', err)
    }
  }

  // Lifecycle
  onMounted(() => {
    fetchSchemas()
    fetchTerms()
  })
</script>