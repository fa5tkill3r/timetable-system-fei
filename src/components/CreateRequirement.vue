<script setup lang="ts">
  import { Button } from '@/components/ui/button'
  import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from '@/components/ui/dialog'
  import { Input } from '@/components/ui/input'
  import { Label } from '@/components/ui/label'
  import { ChevronsUpDown, Copy } from 'lucide-vue-next'
  import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
  } from '@/components/ui/form'
  import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select'
  import {
    Stepper,
    StepperDescription,
    StepperItem,
    StepperSeparator,
    StepperTitle,
    StepperTrigger,
  } from '@/components/ui/stepper'
  import { toast } from '@/components/ui/toast'
  import { toTypedSchema } from '@vee-validate/zod'
  import { Check, Circle, Dot } from 'lucide-vue-next'
  import { h, ref } from 'vue'
  import * as z from 'zod'
  import RoomInput from '@/components/RoomInput.vue'
  import { cn } from '@/lib/utils.ts'
  import {
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from '@/components/ui/popover'
  import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
  } from '@/components/ui/command'
  import { useStore } from '@/store/store.ts'
  import MultiSelect from '@/components/MultiSelect.vue'
  import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
  } from '@/components/ui/collapsible'
  import ComboBox from '@/components/common/ComboBox.vue'
  import { Switch } from '@/components/ui/switch'
  import { Textarea } from '@/components/ui/textarea'

  const store = useStore()

  const specialRequirements = [
    {
      id: 1,
      name: 'Cvičenie po prednáške',
      code: 'exercise_after_lecture',
      conflictsWith: ['exercise_immediately_after_lecture'],
    },
    {
      id: 2,
      name: 'Cvičenie ihneď po prednáške',
      code: 'exercise_immediately_after_lecture',
      conflictsWith: [
        'exercise_after_lecture',
        'lecture_and_exercise_on_different_days',
      ],
    },
    {
      id: 3,
      name: 'Prednáška a cvičenie v iný deň',
      code: 'lecture_and_exercise_on_different_days',
      conflictsWith: ['exercise_immediately_after_lecture'],
    },
    {
      id: 4,
      name: 'Prednáška a cvičenie v jednom bloku',
      code: 'lecture_and_exercise_in_one_block',
    },
  ]
  const specialRequirementsSchema = specialRequirements.reduce(
    (schema, requirement) => {
      schema[requirement.code] = z.boolean().optional()
      return schema
    },
    {},
  )

  const formSchema = [
    z.object({
      subject: z.number(),
    }),
    z.object({}),
    z.object(specialRequirementsSchema),
    z.object({
      favoriteDrink: z.union([
        z.literal('coffee'),
        z.literal('tea'),
        z.literal('soda'),
      ]),
    }),
  ]

  console.log(specialRequirementsSchema)

  const stepIndex = ref(1)
  const steps = [
    {
      step: 1,
      title: 'Predmet',
      description: 'Predmet pre ktorý požiadavka platí',
    },
    {
      step: 2,
      title: 'Časy',
      description: 'Vaše časové požiadavky pre predmet',
    },
    {
      step: 3,
      title: 'Miestnosti',
      description: 'Vyberte si miestnosti pre predmet alebo požiadavky pre ňu.',
    },
    {
      step: 4,
      title: 'Špeciálne požiadavky',
      description: 'Špeciálne požiadavky pre predmet',
    },
  ]

  const restrictRoomsOption = ref(false)
  const restrictRooms = ref(false)

  function onSubmit(values: any) {
    toast({
      title: 'You submitted the following values:',
      description: h(
        'pre',
        { class: 'mt-2 w-[340px] rounded-md bg-slate-950 p-4' },
        h('code', { class: 'text-white' }, JSON.stringify(values, null, 2)),
      ),
    })
  }
</script>

<template>
  <Dialog v-model="open">
    <DialogTrigger as-child>
      <Button> Vytvoriť požiadavku </Button>
    </DialogTrigger>
    <DialogContent class="max-w-fit">
      <DialogHeader>
        <DialogTitle>Vytvoriť požiadavku</DialogTitle>
        <DialogDescription>
          Vytvorte novú požiadavku pre predmet.
        </DialogDescription>
      </DialogHeader>
      <Form
        v-slot="{ meta, values, validate, setFieldValue }"
        as=""
        keep-values
        :validation-schema="toTypedSchema(formSchema[stepIndex - 1])"
      >
        <Stepper
          v-slot="{ isNextDisabled, isPrevDisabled, nextStep, prevStep }"
          v-model="stepIndex"
          class="block w-full"
        >
          <form
            @submit="
              (e) => {
                e.preventDefault()
                validate()

                if (stepIndex === steps.length && meta.valid) {
                  onSubmit(values)
                }
              }
            "
          >
            <div class="flex w-full flex-start gap-2">
              <StepperItem
                v-for="step in steps"
                :key="step.step"
                v-slot="{ state }"
                class="relative flex w-full flex-col"
                :step="step.step"
              >
                <StepperSeparator
                  v-if="step.step !== steps[steps.length - 1].step"
                  class="absolute left-[calc(50%+20px)] right-[calc(-50%+10px)] top-5 block h-0.5 shrink-0 rounded-full bg-muted group-data-[state=completed]:bg-primary"
                />

                <StepperTrigger as-child>
                  <Button
                    :variant="
                      state === 'completed' || state === 'active'
                        ? 'default'
                        : 'outline'
                    "
                    size="icon"
                    class="z-10 rounded-full shrink-0"
                    :class="[
                      state === 'active' &&
                        'ring-2 ring-ring ring-offset-2 ring-offset-background',
                    ]"
                    :disabled="state !== 'completed' && !meta.valid"
                  >
                    <Check v-if="state === 'completed'" class="size-5" />
                    <Circle v-if="state === 'active'" />
                    <Dot v-if="state === 'inactive'" />
                  </Button>
                </StepperTrigger>

                <div class="mt-5 flex flex-col items-center text-center">
                  <StepperTitle
                    :class="[state === 'active' && 'text-primary']"
                    class="text-sm font-semibold transition lg:text-base"
                  >
                    {{ step.title }}
                  </StepperTitle>
                  <StepperDescription
                    :class="[state === 'active' && 'text-primary']"
                    class="sr-only text-xs text-muted-foreground transition md:not-sr-only lg:text-sm"
                  >
                    {{ step.description }}
                  </StepperDescription>
                </div>
              </StepperItem>
            </div>

            <div class="flex flex-col gap-4 mt-4">
              <template v-if="stepIndex === 1">
                <FormField name="subject" class="flex justify-center">
                  <FormItem class="flex flex-col">
                    <FormLabel>Predmet</FormLabel>
                    <Popover>
                      <PopoverTrigger as-child>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            :class="
                              cn(
                                'justify-between',
                                !values.subject && 'text-muted-foreground',
                              )
                            "
                          >
                            {{
                              values.subject
                                ? store.subjects.find(
                                    (subject) => subject.id === values.subject,
                                  )?.name
                                : 'Vyberte predmet...'
                            }}
                            <ChevronsUpDown
                              class="ml-2 h-4 w-4 shrink-0 opacity-50"
                            />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent
                        class="w-[var(--radix-popover-trigger-width)] p-0"
                      >
                        <Command>
                          <CommandInput placeholder="Vyhladať predmet..." />
                          <CommandEmpty>Predmet nebol nájdený.</CommandEmpty>
                          <CommandList>
                            <CommandGroup>
                              <CommandItem
                                v-for="subject in store.subjects"
                                :key="subject.id"
                                :value="subject.name"
                                @select="
                                  () => {
                                    setFieldValue('subject', subject.id)
                                  }
                                "
                              >
                                <Check
                                  :class="
                                    cn(
                                      'mr-2 h-4 w-4',
                                      subject.id === values.subject
                                        ? 'opacity-100'
                                        : 'opacity-0',
                                    )
                                  "
                                />
                                {{ subject.name }}
                              </CommandItem>
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Predmet pre ktorý budete vytvárať požiadavku.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                </FormField>
                <!--                <FormField v-slot="{ componentField }" name="fullName">-->
                <!--                  <FormItem>-->
                <!--                    <FormLabel>Full Name</FormLabel>-->
                <!--                    <FormControl>-->
                <!--                      <Input type="text" v-bind="componentField"/>-->
                <!--                    </FormControl>-->
                <!--                    <FormMessage/>-->
                <!--                  </FormItem>-->
                <!--                </FormField>-->

                <!--                <FormField v-slot="{ componentField }" name="email">-->
                <!--                  <FormItem>-->
                <!--                    <FormLabel>Email</FormLabel>-->
                <!--                    <FormControl>-->
                <!--                      <Input type="email" v-bind="componentField"/>-->
                <!--                    </FormControl>-->
                <!--                    <FormMessage/>-->
                <!--                  </FormItem>-->
                <!--                </FormField>-->
              </template>

              <template v-if="stepIndex === 3">
                <FormField v-slot="{ componentField }" name="capacity">
                  <FormItem>
                    <FormLabel>Kapacita študentov</FormLabel>
                    <FormControl>
                      <Input type="number" v-bind="componentField" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>

                <ComboBox
                  :options="store.roomTypes"
                  class="flex justify-center"
                  title="Typ miestnosti"
                  search-placeholder="Vyhľadať typ miestnosti..."
                />

                <Collapsible>
                  <CollapsibleTrigger
                    class="text-primary font-semibold cursor-pointer mb-2"
                  >
                    <div class="flex items-center gap-2">
                      <ChevronsUpDown class="h-4 w-4" />
                      <span>Vybavenie miestnosti</span>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div class="flex flex-wrap gap-x-4 gap-y-2 justify-start">
                      <div
                        v-for="equipment in store.equipments"
                        :key="equipment.id"
                      >
                        <MultiSelect :item="equipment" />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Switch
                  v-model:checked="restrictRoomsOption"
                  class="mb-4"
                  label="Show Room Input"
                />
                <div v-if="restrictRoomsOption">
                  <RoomInput :rooms="store.rooms" />
                </div>
              </template>

              <template v-if="stepIndex === 4">
                <FormField
                  v-for="requirement in specialRequirements"
                  v-slot="{ value, handleChange }"
                  :key="requirement.id"
                  :name="requirement.code"
                >
                  <FormItem class="flex flex-row items-center justify-between">
                    <div class="space-y-0.5">
                      <FormLabel class="text-base">
                        {{ requirement.name }}
                      </FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        :checked="value"
                        @update:checked="
                          (checked) => {
                            handleChange(checked)
                            if (checked) {
                              requirement.conflictsWith?.forEach((conflict) => {
                                setFieldValue(conflict, false)
                              })
                            }
                          }
                        "
                      />
                    </FormControl>
                  </FormItem>
                </FormField>

                <FormField name="customRequirement" class="flex justify-center">
                  <FormItem class="flex flex-col">
                    <FormLabel class="text-base"
                      >Špeciálna požiadavka</FormLabel
                    >
                    <FormControl>
                      <Textarea
                        placeholder="Špeciálna požiadavka..."
                        class="resize-none"
                        v-bind="componentField"
                      />
                    </FormControl>
                    <FormDescription>
                      Ak máte špeciálnu požiadavku, zadajte ju sem.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                </FormField>
              </template>
            </div>

            <div class="flex items-center justify-between mt-4">
              <Button
                :disabled="isPrevDisabled"
                variant="outline"
                size="sm"
                @click="prevStep()"
              >
                Späť
              </Button>
              <div class="flex items-center gap-3">
                <Button
                  v-if="stepIndex !== 4"
                  :type="meta.valid ? 'button' : 'submit'"
                  :disabled="isNextDisabled"
                  size="sm"
                  @click="meta.valid && nextStep()"
                >
                  Ďalej
                </Button>
                <Button v-if="stepIndex === 4" size="sm" type="submit">
                  Vytvoriť požiadavku
                </Button>
              </div>
            </div>
          </form>
        </Stepper>
      </Form>
    </DialogContent>
  </Dialog>
</template>
