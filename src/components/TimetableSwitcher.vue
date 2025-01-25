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
  import { ref } from 'vue'

  const groups = [
    {
      label: '2024',
      versions: [
        {
          label: 'ZS v1',
          value: '2024-zs-v1',
        },
      ],
    },
    {
      label: '2023',
      versions: [
        {
          label: 'ZS v1',
          value: '2023-zs-v1',
        },
        {
          label: 'Term v1',
          value: '2023-term-v1',
        },
      ],
    },
  ]

  type Version = (typeof groups)[number]['versions'][number]

  const open = ref(false)
  const showNewVersionDialog = ref(false)
  const selectedVersion = ref<Version>(groups[0].versions[0])
</script>

<template>
  <Dialog v-model:open="showNewVersionDialog">
    <Popover v-model:open="open">
      <PopoverTrigger as-child>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded="open"
          aria-label="Select a version"
          :class="cn('w-[200px] justify-between', $attrs.class ?? '')"
        >
          <!--          <Avatar class="mr-2 h-5 w-5">-->
          <!--            <AvatarImage-->
          <!--                :src="`https://avatar.vercel.sh/${selectedVersion.value}.png`"-->
          <!--                :alt="selectedVersion.label"-->
          <!--            />-->
          <!--            <AvatarFallback>SC</AvatarFallback>-->
          <!--          </Avatar>-->
          {{ selectedVersion.label }}
          <ArrowDownUp class="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-[200px] p-0">
        <Command
          :filter-function="
            (list, term) =>
              list.filter((i) => i.label?.toLowerCase()?.includes(term))
          "
        >
          <CommandList>
            <CommandInput placeholder="Search version..." />
            <CommandEmpty>No version found.</CommandEmpty>
            <CommandGroup
              v-for="group in groups"
              :key="group.label"
              :heading="group.label"
            >
              <CommandItem
                v-for="version in group.versions"
                :key="version.value"
                :value="version"
                class="text-sm"
                @select="
                  () => {
                    selectedVersion = version
                    open = false
                  }
                "
              >
                <!--                <Avatar class="mr-2 h-5 w-5">-->
                <!--                  <AvatarImage-->
                <!--                      :src="`https://avatar.vercel.sh/${version.value}.png`"-->
                <!--                      :alt="version.label"-->
                <!--                      class="grayscale"-->
                <!--                  />-->
                <!--                  <AvatarFallback>SC</AvatarFallback>-->
                <!--                </Avatar>-->
                {{ version.label }}
                <Check
                  :class="
                    cn(
                      'ml-auto h-4 w-4',
                      selectedVersion.value === version.value
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
                  value="create-version"
                  @select="
                    () => {
                      open = false
                      showNewVersionDialog = true
                    }
                  "
                >
                  <CirclePlus class="mr-2 h-5 w-5" />
                  New Version
                </CommandItem>
              </DialogTrigger>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create version</DialogTitle>
        <DialogDescription>
          Create a new version of timetable.
        </DialogDescription>
      </DialogHeader>
      <div>
        <div class="space-y-4 py-2 pb-4">
          <div class="space-y-2">
            <Label for="name">Version name</Label>
            <Input id="name" placeholder="LS v1" />
          </div>
          <div class="space-y-2">
            <Label for="plan">Timetable Type</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">
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
        <Button variant="outline" @click="showNewVersionDialog = false">
          Cancel
        </Button>
        <Button type="submit"> Continue </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
