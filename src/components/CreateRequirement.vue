<script setup lang="ts">
import {Button} from '@/components/ui/button'
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
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {ChevronsUpDown, Copy} from 'lucide-vue-next'
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form'
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
  StepperTrigger
} from '@/components/ui/stepper'
import {toast} from '@/components/ui/toast'
import {toTypedSchema} from '@vee-validate/zod'
import {Check, Circle, Dot} from 'lucide-vue-next'
import {h, ref} from 'vue'
import * as z from 'zod'
import RoomSelect from "@/components/requirements/RoomSelect.vue";
import {cn} from "@/lib/utils.ts";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList} from "@/components/ui/command";
import {useStore} from "@/store/store.ts";

const store = useStore()

const formSchema = [
  z.object({
    subject: z.number(),
  }),
  z.object({
    password: z.string().min(2).max(50),
    confirmPassword: z.string(),
  }).refine(
    (values) => {
      return values.password === values.confirmPassword
    },
    {
      message: 'Passwords must match!',
      path: ['confirmPassword'],
    },
  ),
  z.object({
    favoriteDrink: z.union([z.literal('coffee'), z.literal('tea'), z.literal('soda')]),
  }),
]

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

function onSubmit(values: any) {
  toast({
    title: 'You submitted the following values:',
    description: h('pre', {class: 'mt-2 w-[340px] rounded-md bg-slate-950 p-4'}, h('code', {class: 'text-white'}, JSON.stringify(values, null, 2))),
  })
}
</script>

<template>
  <Dialog v-model="open">
    <DialogTrigger as-child>
      <Button>
        Vytvoriť požiadavku
      </Button>
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
        as="" keep-values :validation-schema="toTypedSchema(formSchema[stepIndex - 1])"
      >
        <Stepper v-slot="{ isNextDisabled, isPrevDisabled, nextStep, prevStep }" v-model="stepIndex"
                 class="block w-full">
          <form
            @submit="(e) => {
          e.preventDefault()
          validate()

          if (stepIndex === steps.length && meta.valid) {
            onSubmit(values)
          }
        }"
          >
            <div class="flex w-full flex-start gap-2">
              <StepperItem
                v-for="step in steps"
                :key="step.step"
                v-slot="{ state }"
                class="relative flex w-full flex-col items-center justify-center"
                :step="step.step"
              >
                <StepperSeparator
                  v-if="step.step !== steps[steps.length - 1].step"
                  class="absolute left-[calc(50%+20px)] right-[calc(-50%+10px)] top-5 block h-0.5 shrink-0 rounded-full bg-muted group-data-[state=completed]:bg-primary"
                />

                <StepperTrigger as-child>
                  <Button
                    :variant="state === 'completed' || state === 'active' ? 'default' : 'outline'"
                    size="icon"
                    class="z-10 rounded-full shrink-0"
                    :class="[state === 'active' && 'ring-2 ring-ring ring-offset-2 ring-offset-background']"
                    :disabled="state !== 'completed' && !meta.valid"
                  >
                    <Check v-if="state === 'completed'" class="size-5"/>
                    <Circle v-if="state === 'active'"/>
                    <Dot v-if="state === 'inactive'"/>
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
                            :class="cn('justify-between', !values.subject && 'text-muted-foreground')"
                          >
                            {{
                              values.subject ? store.subjects.find(
                                (subject) => subject.id === values.subject,
                              )?.name : 'Vyberte predmet...'
                            }}
                            <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent class="w-[200px] p-0">
                        <Command>
                          <CommandInput placeholder="Vyhladať predmet..."/>
                          <CommandEmpty>Predmet nebol nájdený.</CommandEmpty>
                          <CommandList>
                            <CommandGroup>
                              <CommandItem
                                v-for="subject in store.subjects"
                                :key="subject.id"
                                :value="subject.name"
                                @select="() => {
                  setFieldValue('subject', subject.id)
                }"
                              >
                                <Check
                                  :class="cn('mr-2 h-4 w-4', subject.id === values.subject ? 'opacity-100' : 'opacity-0')"
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
                    <FormMessage/>
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

              <template v-if="stepIndex === 2">
                <FormField v-slot="{ componentField }" name="password">
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" v-bind="componentField"/>
                    </FormControl>
                    <FormMessage/>
                  </FormItem>
                </FormField>

                <FormField v-slot="{ componentField }" name="confirmPassword">
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" v-bind="componentField"/>
                    </FormControl>
                    <FormMessage/>
                  </FormItem>
                </FormField>
              </template>

              <template v-if="stepIndex === 3">
                <FormField v-slot="{ componentField }" name="favoriteDrink">
                  <FormItem>
                    <FormLabel>Drink</FormLabel>

                    <Select v-bind="componentField">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a drink"/>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="coffee">
                            Coffe
                          </SelectItem>
                          <SelectItem value="tea">
                            Tea
                          </SelectItem>
                          <SelectItem value="soda">
                            Soda
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage/>
                  </FormItem>
                </FormField>
              </template>
            </div>

            <div class="flex items-center justify-between mt-4">
              <Button :disabled="isPrevDisabled" variant="outline" size="sm" @click="prevStep()">
                Späť
              </Button>
              <div class="flex items-center gap-3">
                <Button v-if="stepIndex !== 3" :type="meta.valid ? 'button' : 'submit'" :disabled="isNextDisabled"
                        size="sm" @click="meta.valid && nextStep()">
                  Ďalej
                </Button>
                <Button
                  v-if="stepIndex === 3" size="sm" type="submit"
                >
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