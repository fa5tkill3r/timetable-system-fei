<script setup lang="ts">
  import { Button } from '@/components/ui/button'
  import {
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
  } from '@/components/ui/form'
  import { toast } from '@/components/ui/toast'
  import { toTypedSchema } from '@vee-validate/zod'
  import { useForm } from 'vee-validate'
  import { h, PropType } from 'vue'
  import { z } from 'zod'

  import {
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
  } from '@/components/ui/command'
  import {
    TagsInput,
    TagsInputInput,
    TagsInputItem,
    TagsInputItemDelete,
    TagsInputItemText,
  } from '@/components/ui/tags-input'
  import {
    ComboboxAnchor,
    ComboboxContent,
    ComboboxInput,
    ComboboxPortal,
    ComboboxRoot,
  } from 'radix-vue'
  import { computed, ref } from 'vue'
  import { Room } from '@/types.ts'

  const props = defineProps({
    rooms: {
      type: Object as PropType<Room[]>,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
    searchPlaceholder: {
      type: String,
      default: 'Search options...',
    },
  })

  const formSchema = toTypedSchema(
    z.object({
      fruits: z.array(z.string()).min(1).max(3),
    }),
  )

  const modelValue = ref<string[]>([])
  const open = ref(false)
  const searchTerm = ref('')

  const { handleSubmit } = useForm({
    validationSchema: formSchema,
    initialValues: {
      fruits: ['Apple', 'Banana'],
    },
  })

  const onSubmit = handleSubmit((values) => {
    toast({
      title: 'You submitted the following values:',
      description: h(
        'pre',
        { class: 'mt-2 w-[340px] rounded-md bg-slate-950 p-4' },
        h('code', { class: 'text-white' }, JSON.stringify(values, null, 2)),
      ),
    })
  })

  const filteredRooms = computed(() =>
    props.rooms.filter((i) => !modelValue.value.includes(i.name)),
  )
</script>

<template>
  <FormField v-slot="{ value }" name="fruits">
    <FormItem>
      <FormLabel>Miesnosti</FormLabel>
      <FormControl>
        <TagsInput class="px-0 gap-0" :model-value="modelValue">
          <div class="flex gap-2 flex-wrap items-center px-3">
            <TagsInputItem v-for="item in modelValue" :key="item" :value="item">
              <TagsInputItemText />
              <TagsInputItemDelete />
            </TagsInputItem>
          </div>

          <ComboboxRoot
            v-model="modelValue"
            v-model:open="open"
            v-model:search-term="searchTerm"
            @click="open = true"
            class="w-full"
          >
            <ComboboxAnchor as-child>
              <ComboboxInput placeholder="Miestnosti..." as-child>
                <TagsInputInput
                  class="w-full px-3"
                  :class="modelValue.length > 0 ? 'mt-2' : ''"
                  @keydown.enter.prevent
                />
              </ComboboxInput>
            </ComboboxAnchor>

            <ComboboxPortal>
              <ComboboxContent>
                <CommandList
                  position="popper"
                  class="z-50 w-[--radix-popper-anchor-width] rounded-md mt-2 border bg-popover text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
                >
                  <CommandEmpty />
                  <CommandGroup>
                    <CommandItem
                      v-for="room in filteredRooms"
                      :key="room.value"
                      :value="room.name"
                      @select.prevent="
                        (ev) => {
                          if (typeof ev.detail.value === 'string') {
                            searchTerm = ''
                            modelValue.push(ev.detail.value)
                          }

                          if (filteredRooms.length === 0) {
                            open = false
                          }
                        }
                      "
                    >
                      {{ room.name }}
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </ComboboxContent>
            </ComboboxPortal>
          </ComboboxRoot>
        </TagsInput>
      </FormControl>
      <FormDescription> </FormDescription>
      <FormMessage />
    </FormItem>
  </FormField>
</template>

<style scoped></style>
