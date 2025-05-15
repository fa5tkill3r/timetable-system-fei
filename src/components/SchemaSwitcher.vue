<script setup lang="ts">
  import { Button } from '@/components/ui/button'
  import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
  } from '@/components/ui/command'
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from '@/components/ui/dialog'

  import { Input } from '@/components/ui/input'
  import { Label } from '@/components/ui/label'
  import {
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from '@/components/ui/popover'

  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select'

  import { toast, useToast } from '@/components/ui/toast/use-toast'

  import { cn } from '@/lib/utils'
  import { ArrowDownUp, Check, CirclePlus } from 'lucide-vue-next'
  import { ref, onMounted, computed } from 'vue'
  import { useSchemaStore } from '@/store/schemas'
  import { components } from '@/types/schema'
  import SchemaDialog from '@/components/schemas/SchemaDialog.vue'
  import { result } from 'lodash'

  type Schema = components['schemas']['schema']
  type SchemaRequest = components['schemas']['schemaRequest']

  const schemaStore = useSchemaStore()

  const open = ref(false)
  const showNewSchemaDialog = ref(false)
  const isCreatingSchema = ref(false)
  const selectedType = ref<'timetable' | 'term'>('timetable')
  const newSchemaName = ref('')

  const selectedSchema = computed(() => schemaStore.activeSchema)

  const schemasByYear = computed(() => {
    if (!schemaStore.schemas.length) return []

    const groupedSchemas: Record<string, Schema[]> = {}
    schemaStore.schemas.forEach((schema) => {
      const year =
        schema.start_date && schema.end_date
          ? `${new Date(schema.start_date).getFullYear()}/${new Date(schema.end_date).getFullYear().toString().slice(-2)}`
          : 'Unknown'

      if (!groupedSchemas[year]) {
        groupedSchemas[year] = []
      }
      groupedSchemas[year].push(schema)
    })

    return Object.entries(groupedSchemas).map(([year, items]) => ({
      label: year,
      schemas: items,
    }))
  })

  async function handleSaveSchema(schemaData: SchemaRequest, id?: number) {
    isCreatingSchema.value = true

    try {
      const result = await schemaStore.createSchema(schemaData)
      if (result) {
        toast({
          title: 'Schema created',
          description: `Schema "${schemaData.human_name}" has been created successfully.`,
        })
      }

      showNewSchemaDialog.value = false
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${id ? 'update' : 'create'} schema.`,
        variant: 'destructive',
      })
    } finally {
      isCreatingSchema.value = false
    }
  }

  async function createNewSchema() {
    showNewSchemaDialog.value = false
    newSchemaName.value = ''

    await schemaStore.fetchSchemas()
  }

  function selectSchema(schema: Schema) {
    if (schema.id) {
      schemaStore.setActiveSchema(schema.id)
      open.value = false
    }
  }
</script>

<template>
  <SchemaDialog
    v-model:open="showNewSchemaDialog"
    :isLoading="isCreatingSchema"
    @save="handleSaveSchema"
  />
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded="true"
        aria-label="Select a schema"
        :class="cn('w-[200px] justify-between', $attrs.class ?? '')"
      >
        {{ selectedSchema?.human_name || 'Select Schema' }}
        <ArrowDownUp class="ml-auto h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-[200px] p-0">
      <Command
        :filter-function="
          (list: any[], term: string) =>
            list.filter((i: any) =>
              (i as Schema).human_name?.toLowerCase()?.includes(term),
            )
        "
      >
        <CommandList>
          <CommandInput placeholder="Search schema..." />
          <CommandEmpty>No schema found.</CommandEmpty>
          <CommandGroup
            v-for="group in schemasByYear"
            :key="group.label"
            :heading="group.label"
          >
            <CommandItem
              v-for="schema in group.schemas"
              :key="schema.id"
              :value="schema"
              class="text-sm"
              @select="() => selectSchema(schema)"
            >
              {{ schema.human_name }}
              <Check
                :class="
                  cn(
                    'ml-auto h-4 w-4',
                    selectedSchema?.id === schema.id
                      ? 'opacity-100'
                      : 'opacity-0',
                  )
                "
              />
            </CommandItem>
          </CommandGroup>
        </CommandList>
        <CommandSeparator />
        <CommandList>
          <CommandGroup>
            <CommandItem
              value="create-schema"
              @select="
                () => {
                  open = false
                  showNewSchemaDialog = true
                }
              "
            >
              <CirclePlus class="mr-2 h-5 w-5" />
              New Schema
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</template>
