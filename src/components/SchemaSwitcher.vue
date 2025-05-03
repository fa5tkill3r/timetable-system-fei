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
  import { cn } from '@/lib/utils'
  import { ArrowDownUp, Check, CirclePlus } from 'lucide-vue-next'
  import { ref, onMounted, computed } from 'vue'
  import { useSchemaStore } from '@/store/schemas'
  import { components } from '@/types/schema'

  type Schema = components['schemas']['schema']

  const schemaStore = useSchemaStore()
  
  const open = ref(false)
  const showNewSchemaDialog = ref(false)
  const selectedType = ref<'timetable' | 'term'>('timetable')
  const newSchemaName = ref('')
  
  const selectedSchema = computed(() => schemaStore.activeSchema)

  // Group schemas by year
  const schemasByYear = computed(() => {
    if (!schemaStore.schemas.length) return []
    
    const groupedSchemas: Record<string, Schema[]> = {}
    schemaStore.schemas.forEach((schema) => {
      // Extract year from schema - assuming year field exists or extract from version
      const year = schema.start_date && schema.end_date 
        ? `${new Date(schema.start_date).getFullYear()}/${new Date(schema.end_date).getFullYear().toString().slice(-2)}`
        : 'Unknown'
      
      if (!groupedSchemas[year]) {
        groupedSchemas[year] = []
      }
      groupedSchemas[year].push(schema)
    })
    
    return Object.entries(groupedSchemas).map(([year, items]) => ({
      label: year,
      schemas: items
    }))
  })
  
  async function createNewSchema() {
    // API call to create a new schema would go here
    // This is a placeholder for when the API is available
    showNewSchemaDialog.value = false
    newSchemaName.value = ''
    
    // Refresh schemas after creating a new one
    await schemaStore.fetchSchemas()
  }
  
  function selectSchema(schema: Schema) {
    if (schema.id) {
      schemaStore.setActiveSchema(schema.id.toString())
      open.value = false
    }
  }
</script>

<template>
  <Dialog v-model:open="showNewSchemaDialog">
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
          :filter-function="((list: any[], term: string) =>
            list.filter((i: any) => (i as Schema).human_name?.toLowerCase()?.includes(term))
          )"
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
              <DialogTrigger as-child>
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
              </DialogTrigger>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create schema</DialogTitle>
        <DialogDescription>
          Create a new schema for timetable or term.
        </DialogDescription>
      </DialogHeader>
      <div>
        <div class="space-y-4 py-2 pb-4">
          <div class="space-y-2">
            <Label for="name">Schema name</Label>
            <Input id="name" v-model="newSchemaName" placeholder="LS v1" />
          </div>
          <div class="space-y-2">
            <Label for="type">Schema Type</Label>
            <Select v-model="selectedType">
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="timetable">
                  <span class="font-medium">Timetable</span> -
                  <span class="text-muted-foreground">
                    Standard timetable
                  </span>
                </SelectItem>
                <SelectItem value="term">
                  <span class="font-medium">Terms</span> -
                  <span class="text-muted-foreground">
                    Timetable for terms
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="showNewSchemaDialog = false">
          Cancel
        </Button>
        <Button type="submit" @click="createNewSchema">
          Create
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
