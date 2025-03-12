<template>
  <div class="container py-6 space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-semibold">Schema Management</h1>
      <Button @click="openCreateDialog()">Create New Schema</Button>
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
          <TableRow v-if="schemaStore.isLoading">
            <TableCell colspan="5" class="text-center py-4">
              <div class="flex justify-center items-center">
                <div class="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
                Loading schemas...
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-else-if="schemaStore.schemas.length === 0">
            <TableCell colspan="5" class="text-center py-4 text-muted-foreground">
              No schemas found. Create your first schema.
            </TableCell>
          </TableRow>
          <TableRow v-for="schema in schemaStore.schemas" :key="schema.id">
            <TableCell>{{ schema.human_name }}</TableCell>
            <TableCell>{{ formatDate(schema.start_date) }}</TableCell>
            <TableCell>{{ formatDate(schema.end_date) }}</TableCell>
            <TableCell>
              <Badge :variant="schema.is_active ? 'default' : 'outline'">
                {{ schema.is_active ? 'Active' : 'Inactive' }}
              </Badge>
            </TableCell>
            <TableCell class="text-right">
              <div class="flex justify-end space-x-2">
                <Button variant="outline" size="sm" @click="setActiveSchema(schema)"
                  :disabled="schema.is_active">
                  <CheckIcon class="h-4 w-4" />
                  <span class="sr-only">Set Active</span>
                </Button>
                <Button variant="outline" size="sm" @click="openImportDialog(schema)">
                  <ImportIcon class="h-4 w-4" />
                  <span class="sr-only">Import</span>
                </Button>
                <Button variant="outline" size="sm" @click="openEditDialog(schema)">
                  <PencilIcon class="h-4 w-4" />
                  <span class="sr-only">Edit</span>
                </Button>
                <Button variant="outline" size="sm" @click="confirmDelete(schema)">
                  <TrashIcon class="h-4 w-4" />
                  <span class="sr-only">Delete</span>
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Schema Dialog Component -->
    <SchemaDialog 
      :open="dialogVisible" 
      :schema="selectedSchema"
      :is-loading="dialogLoading"
      @update:open="dialogVisible = $event"
      @save="saveSchema"
    />

    <!-- Delete Dialog Component -->
    <DeleteSchemaDialog
      :open="deleteDialog"
      :schema="schemaToDelete"
      :is-loading="deleteLoading" 
      @update:open="deleteDialog = $event"
      @delete="deleteSchema"
    />

    <!-- Import Dialog -->
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
import { PencilIcon, TrashIcon, ImportIcon, CheckIcon } from 'lucide-vue-next'
import type { components } from '@/../schema'
import { client } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast/use-toast'
import SchemaDialog from '@/components/schemas/SchemaDialog.vue'
import DeleteSchemaDialog from '@/components/schemas/DeleteSchemaDialog.vue'
import ImportDataToSchemaDialog from '@/components/schemas/ImportDataToSchemaDialog.vue'
import { useSchemaStore } from '@/store/schemas'

type Schema = components['schemas']['schema'];
type SchemaRequest = components['schemas']['schemaRequest'];
type Term = components['schemas']['PaginatedAISObdobieList'];

const { toast } = useToast()
const schemaStore = useSchemaStore()

// State
const terms = ref<Term[]>([])
const dialogVisible = ref(false)
const dialogLoading = ref(false)
const deleteDialog = ref(false)
const deleteLoading = ref(false)
const isImportDialogOpen = ref(false)

const selectedSchema = ref<Schema | null>(null)
const selectedSchemaForImport = ref<Schema | undefined>(undefined)
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

async function fetchTerms() {
  try {
    const { data } = await client.GET('/api/imports_exports/fei/terms/', {
      params: {
        query: {
          ordering: '-year_start',
          year_start__gte: (new Date().getFullYear() - 3).toString(),
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

// Open create dialog
function openCreateDialog() {
  selectedSchema.value = null
  dialogVisible.value = true
}

// Open edit dialog for a schema
function openEditDialog(schemaData: Schema) {
  selectedSchema.value = { ...schemaData }
  dialogVisible.value = true
}

// Save schema (create or update)
async function saveSchema(schemaData: SchemaRequest, id?: number) {
  dialogLoading.value = true

  try {
    if (id) {
      // Update existing schema
      const result = await schemaStore.updateSchema(id, schemaData)
      if (result) {
        toast({
          title: "Schema updated",
          description: `Schema "${schemaData.human_name}" has been updated successfully.`
        })
      }
    } else {
      // Create new schema
      const result = await schemaStore.createSchema(schemaData)
      if (result) {
        toast({
          title: "Schema created",
          description: `Schema "${schemaData.human_name}" has been created successfully.`
        })
      }
    }

    // Close dialog on success
    dialogVisible.value = false
  } catch (error) {
    toast({
      title: "Error",
      description: `Failed to ${id ? 'update' : 'create'} schema.`,
      variant: "destructive"
    })
  } finally {
    dialogLoading.value = false
  }
}

function confirmDelete(schema: Schema) {
  schemaToDelete.value = schema
  deleteDialog.value = true
}

async function deleteSchema() {
  if (!schemaToDelete.value?.id) return

  deleteLoading.value = true
  try {
    const success = await schemaStore.deleteSchema(schemaToDelete.value.id)
    if (success) {
      toast({
        title: "Schema deleted",
        description: `Schema "${schemaToDelete.value.human_name}" has been deleted.`
      })
      deleteDialog.value = false
    } else {
      toast({
        title: "Delete failed",
        description: "There was an error deleting the schema.",
        variant: "destructive",
      })
    }
  } finally {
    deleteLoading.value = false
  }
}

async function setActiveSchema(schemaData: Schema) {
  if (!schemaData.id) return
  
  try {
    const success = await schemaStore.setActiveSchema(schemaData.id.toString())
    if (success) {
      toast({
        title: "Schema activated",
        description: `Schema "${schemaData.human_name}" is now active.`
      })
    } else {
      toast({
        title: "Activation failed",
        description: "There was an error activating the schema.",
        variant: "destructive",
      })
    }
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to activate schema.",
      variant: "destructive"
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
    description: `Data has been imported to the schema "${selectedSchemaForImport.value?.human_name}".`
  })
}

// Lifecycle
onMounted(() => {
  fetchTerms()
})
</script>