<script setup lang="ts">
  import Navigation from '@/components/Navigation.vue'
  import SchemaSwitcher from '@/components/SchemaSwitcher.vue'
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuGroup,
  } from '@/components/ui/dropdown-menu'
  import { Button } from '@/components/ui/button'
  import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar/'
  import { LogOut, User, Settings } from 'lucide-vue-next'
  import { computed, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useAuthStore } from '@/store/auth'
  import { useRouter } from 'vue-router'
  import LanguageSwitcher from '@/components/LanguageSwitcher.vue'

  const i18n = useI18n()
  const authStore = useAuthStore()
  const router = useRouter()

  function logout() {
    authStore.logout()
    router.push('/login')
  }

  watch(
    () => i18n.locale.value,
    (newLocale) => {
      localStorage.setItem('locale', newLocale)
    },
  )

  const profilePicture = computed(() => {
    return authStore.user?.picture || 'https://avatar.iran.liara.run/public'
  })
</script>

<template>
  <div class="flex h-screen flex-col">
    <div class="border-b">
      <div class="flex h-16 items-center px-4">
        <SchemaSwitcher />
        <div class="flex flex-1 items-center justify-between">
          <Navigation class="mx-6" />
          <div class="flex items-center gap-4">
            <LanguageSwitcher />

            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  variant="ghost"
                  class="relative h-8 w-8 rounded-full"
                >
                  <Avatar class="h-8 w-8">
                    <AvatarImage
                      :src="profilePicture"
                      :alt="authStore.user?.name || 'User'"
                    />
                    <AvatarFallback>{{
                      authStore.user?.name?.charAt(0) || 'U'
                    }}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                class="w-56"
                align="end"
              >
                <DropdownMenuLabel class="font-normal">
                  <div class="flex flex-col space-y-1">
                    <p class="text-sm font-medium leading-none">
                      {{ authStore.user?.name || $t('user.defaultName') }}
                    </p>
                    <p class="text-xs leading-none text-muted-foreground">
                      {{ authStore.user?.email || 'user@example.com' }}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <User class="mr-2 h-4 w-4" />
                    {{ $t('user.profile') }}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings class="mr-2 h-4 w-4" />
                    {{ $t('user.settings') }}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem @click="logout">
                  <LogOut class="mr-2 h-4 w-4" />
                  {{ $t('user.logout') }}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
    <RouterView class="flex flex-1 overflow-hidden" />
  </div>
</template>
