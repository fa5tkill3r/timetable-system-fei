<template>
  <div class="container py-6 space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-semibold">Schema Management</h1>
      <Button @click="isNewSchemaDialogOpen = true">Create New Schema</Button>
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
                <Button variant="outline" size="sm" @click="openImportDialog(schema)">
                  <ImportIcon class="h-4 w-4" />
                  <span class="sr-only">Import</span>
                </Button>
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
      @update:open="isNewSchemaDialogOpen = $event"
      @schema-created="handleSchemaCreated"
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

    <ImportDataToSchemaDialog 
      :open="isImportDialogOpen" 
      :schema="selectedSchemaForImport"
      @update:open="isImportDialogOpen = $event" 
      @success="handleImportSuccess" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { format, parseISO } from 'date-fns'
import { PencilIcon, TrashIcon, ImportIcon } from 'lucide-vue-next'
import type { components } from '@/../schema'
import { client } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast/use-toast'
import NewSchemaDialog from '@/components/schemas/NewSchemaDialog.vue'
import EditSchemaDialog from '@/components/schemas/EditSchemaDialog.vue'
import DeleteSchemaDialog from '@/components/schemas/DeleteSchemaDialog.vue'
import ImportDataToSchemaDialog from '@/components/schemas/ImportDataToSchemaDialog.vue'

type Schema = components['schemas']['schema'];
type SchemaRequest = components['schemas']['schemaRequest'];
type Term = components['schemas']['PaginatedAISObdobieList'];

const { toast } = useToast()

// State
const schemas = ref<Schema[]>([])
const terms = ref<Term[]>([])
const loading = ref(true)
const isNewSchemaDialogOpen = ref(false)
const isEditSchemaDialogOpen = ref(false)
const isDeleteDialogOpen = ref(false)
const isImportDialogOpen = ref(false)

const editingSchema = ref<Schema>({
  id: 0,
  term: '',
  start_date: '',
  end_date: '',
  is_active: false,
})
const schemaToDelete = ref<Schema | null>(null)
const selectedSchemaForImport = ref<Schema | null>(null)

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
    schemas.value = data || []
  } catch (err) {
    console.error('Error fetching schemas:', err)
    schemas.value = []
  } finally {
    loading.value = false
  }
}

async function fetchTerms() {
  try {
    const { data } = await client.GET('/api/imports_exports/fei/terms/', {
      params: {
        query: {
          ordering: '-year_start',
          year_start__gte: new Date().getFullYear() - 3,
          // limit: 20
        }
      },
    })

    if (data && Array.isArray(data)) {
      terms.value = data!
    }
  } catch (err) {
    console.error('Error fetching terms:', err)
  }
}

function handleSchemaCreated(schema: Schema) {
  toast({
    title: "Schema created",
    description: `Schema "${schema.term}" has been created successfully.`
  })
  fetchSchemas()
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
  try {
    await client.PUT(`/api/schemas/{id}/`, {
      params: {
        path: {
          id: schema.id!,
        },
      },
      body: schema,
    })

    toast({
      title: "Schema updated",
      description: `Schema "${schema.term}" has been updated successfully.`
    })
    
    isEditSchemaDialogOpen.value = false
    await fetchSchemas()
  } catch (err) {
    console.error('Error updating schema:', err)
    
    toast({
      title: "Update failed",
      description: "There was an error updating the schema.",
      variant: "destructive",
    })
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

    toast({
      title: "Schema deleted",
      description: `Schema "${schema.term}" has been deleted.`
    })
    
    isDeleteDialogOpen.value = false
    await fetchSchemas()
  } catch (err) {
    console.error('Error deleting schema:', err)
    
    toast({
      title: "Delete failed",
      description: "There was an error deleting the schema.",
      variant: "destructive",
    })
  }
}

function openImportDialog(schema: Schema) {
  selectedSchemaForImport.value = schema
  isImportDialogOpen.value = true
}

function handleImportSuccess() {
  toast({
    title: "Import successful",
    description: `Data has been imported to the schema "${selectedSchemaForImport.value?.term}".`
  })
}

// Lifecycle
onMounted(() => {
  fetchSchemas()
  fetchTerms()
})
</script>