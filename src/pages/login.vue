<script setup lang="ts">
// https://github.com/unovue/shadcn-vue/tree/dev/apps/www/src/examples/authentication
import { ref } from 'vue'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoaderCircle } from 'lucide-vue-next'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'vue-router'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'

definePage({
  meta: {
    public: true,
    notAuthOnly: true
  }
})

const email = ref('')
const password = ref('')
const isLoading = ref(false)
const authStore = useAuthStore()
const router = useRouter()

async function onSubmit(event: Event) {
  event.preventDefault()
  isLoading.value = true

  setTimeout(() => {
    authStore.login(email.value, password.value)
    isLoading.value = false
    router.push('/')
  }, 2000)
}

function initiateGoogleLogin() {
  isLoading.value = true

  authStore.initiateGoogleLogin()
}
</script>

<template>
  <div class="md:hidden">
    <img alt="Authentication" width="1280" height="1214" class="block" :src="'/examples/authentication-light.png'"
      :class="{ 'dark:hidden': true }" />
    <img alt="Authentication" width="1280" height="1214" class="hidden dark:block"
      :src="'/examples/authentication-dark.png'" />
  </div>

  <div
    class="container relative hidden h-full flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
    <div class="absolute right-4 top-4 md:right-8 md:top-8 flex items-center gap-2">
      <LanguageSwitcher />
    </div>

    <div class="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
      <div class="absolute inset-0 bg-black" />

      <div class="relative z-20 flex flex-col items-center mt-[16vh]">
        <img src="/img/stu-fei.svg" alt="Elysa Logo" class="h-20 w-auto" />
        <h1 class="mt-6 text-[100px] font-bold tracking-tight">Elysa</h1>
        <p class="text-lg font-semibold">{{ $t('login.tmsTitle') }}</p>
      </div>

      <div class="relative z-20 mt-auto">
        <p class="px-8 text-center text-sm text-gray-400">
          {{ $t('login.copyright') }}
        </p>
      </div>
    </div>
    <div class="lg:p-8">
      <div class="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div class="flex flex-col space-y-2 text-center">
          <h1 class="text-2xl font-semibold tracking-tight">
            {{ $t('login.welcome') }}
          </h1>
          <p class="text-sm text-muted-foreground">
            {{ $t('login.subtitle') }}
          </p>
        </div>

        <div class="grid gap-6">
          <form @submit="onSubmit">
            <div class="grid gap-2">
              <div class="grid gap-1">
                <Label class="sr-only" for="email">
                  {{ $t('login.email') }}
                </Label>
                <Input id="email" v-model="email" placeholder="name@stuba.sk" type="email" auto-capitalize="none"
                  auto-complete="email" auto-correct="off" :disabled="isLoading" />
              </div>

              <div class="grid gap-1">
                <Label class="sr-only" for="password">
                  {{ $t('login.password') }}
                </Label>
                <Input id="password" v-model="password" placeholder="••••••••" type="password"
                  auto-complete="current-password" :disabled="isLoading" />
              </div>

              <Button :disabled="isLoading">
                <LoaderCircle v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
                {{ $t('login.loginButton') }}
              </Button>
            </div>
          </form>
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <span class="w-full border-t" />
            </div>
            <div class="relative flex justify-center text-xs uppercase">
              <span class="bg-background px-2 text-muted-foreground">
                {{ $t('login.orContinueWith') }}
              </span>
            </div>
          </div>
          <Button variant="outline" type="button" :disabled="isLoading" @click="initiateGoogleLogin">
            <LoaderCircle v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
            <img src="/img/stu-fei.svg" alt="Google Logo" class="pr-1 mr-2 h-7 w-auto bg-red-600" />
            {{ $t('login.aisLogin') }}
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>