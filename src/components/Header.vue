<script setup>
import {
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from "@heroicons/vue/24/outline/index.js";
import {
  Menu,
  MenuButton,
  MenuItem, MenuItems,
  Popover, PopoverButton,
  PopoverOverlay,
  PopoverPanel,
  TransitionChild,
  TransitionRoot
} from "@headlessui/vue";
import { useCustomerStore } from "@/stores/customer.js";
import { useCustomerUtils } from "@/composables/customer_utils.js";
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useMediaQuery } from '@vueuse/core'
import router from "@/router/index.js";

const props = defineProps({
  sidebarCollapsed: {
    type: Boolean,
    default: false,
  },
  sidebarMobileOpen: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['toggleSidebar'])

const isMdUp = useMediaQuery('(min-width: 768px)')

const navToggleAriaLabel = computed(() => {
  if (isMdUp.value) {
    return props.sidebarCollapsed
      ? 'Expand navigation sidebar'
      : 'Collapse navigation sidebar'
  }
  return props.sidebarMobileOpen
    ? 'Close navigation menu'
    : 'Open navigation menu'
})

const route = useRoute()

const customerStore = useCustomerStore();
const customerUtils = useCustomerUtils();

const customer = customerStore.customer;

const navigation = [
  { name: 'Home', href: 'dashboard' },
  { name: 'Transactions', href: 'transactions' },
  { name: 'Recipients', href: 'recipients' },
  { name: 'Account Verification', href: 'accountVerification' },
  { name: 'Settings', href: 'settings' },
]

const pageTitle = computed(() => {
  const match = navigation.find((n) => n.href === route.name)
  if (match) return match.name
  if (route.meta?.title) return route.meta.title
  return ''
})

async function logout() {
  await customerUtils.logout().finally(() => {
    router.push({ name: 'signIn' });
  });
}

const userNavigation = [
  { name: 'Account Verification', href: 'accountVerification' },
  { name: 'Settings', href: 'settings' },
  { name: 'Sign out', action: logout },
]

function navLinkClass(isActive) {
  return [
    'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
    isActive
      ? 'bg-gray-100 text-gray-900'
      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
  ]
}
</script>

<template>
  <Popover as="header"
    class="sticky top-0 z-30 border-b border-gray-200/80 bg-white/85 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/70"
    v-slot="{ open }">

    <div class="w-full px-4 sm:px-6 lg:px-8">

      <div class="flex min-h-[3.25rem] items-center justify-between py-2 sm:min-h-[3.5rem] sm:py-2.5">

        <div class="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">

          <button
            type="button"
            class="inline-flex shrink-0 rounded-lg p-2 text-gray-600 transition-colors hover:bg-brand-50 hover:text-brand-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            :aria-label="navToggleAriaLabel"
            :title="navToggleAriaLabel"
            @click="emit('toggleSidebar')"
          >
            <span class="relative block size-6 md:size-7" aria-hidden="true">
              <span class="absolute inset-0 flex items-center justify-center md:hidden">
                <XMarkIcon
                  v-if="sidebarMobileOpen"
                  class="size-6 text-gray-800 transition-transform duration-200"
                />
                <Bars3Icon
                  v-else
                  class="size-6 transition-transform duration-200"
                />
              </span>
              <span class="absolute inset-0 hidden items-center justify-center md:flex">
                <ChevronDoubleLeftIcon
                  v-if="!sidebarCollapsed"
                  class="size-6 text-brand-800 transition-transform duration-200 hover:scale-105"
                />
                <ChevronDoubleRightIcon
                  v-else
                  class="size-6 text-brand-800 transition-transform duration-200 hover:scale-105"
                />
              </span>
            </span>
          </button>

          <div class="flex min-w-0 items-center gap-3 md:gap-4">
            <!-- Logo visible ONLY on small screens -->
            <img class="h-10 w-auto shrink-0 sm:h-8 md:h-9 block lg:hidden" src="/images/logo.png" alt="RemitSo" />

            <p v-if="pageTitle"
              class="hidden min-w-0 truncate border-l border-gray-200 pl-3 text-sm font-medium text-gray-500 sm:block md:hidden lg:block">
              {{ pageTitle }}
            </p>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2 sm:gap-3">

          <Menu as="div" class="relative">
            <MenuButton type="button"
              class="group flex items-center gap-2 rounded-full border border-gray-200 bg-white p-0.5 pl-1 shadow-sm transition hover:border-gray-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
              <span
                class="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-sm font-semibold text-brand-800">
                <template v-if="customer.data">
                  {{ customer.data?.name?.slice(0, 1).toUpperCase() }}
                </template>
                <template v-else>
                  +
                </template>
              </span>
              <span class="hidden pr-2 sm:flex sm:items-center">
                <ChevronDownIcon class="size-4 text-gray-400 transition group-hover:text-gray-500" aria-hidden="true" />
              </span>
            </MenuButton>

            <transition enter-active-class="transition ease-out duration-100"
              enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100"
              leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100"
              leave-to-class="transform opacity-0 scale-95">
              <MenuItems
                class="absolute right-0 z-40 mt-2 w-56 origin-top-right rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/5 outline-none">
                <MenuItem v-for="item in userNavigation" :key="item.name" v-slot="{ active, close: closeItem }">

                <a v-if="item.action" href="javascript:" @click="item.action" :class="[
                  active ? 'bg-gray-50' : '',
                  'block px-4 py-2.5 text-sm text-gray-700 outline-none',
                  item.name === 'Sign out' ? 'font-medium text-red-600 hover:bg-red-50' : '',
                ]">
                  {{ item.name }}
                </a>

                <router-link v-else v-slot="{ href, navigate, isActive }" :to="{ name: item.href }" custom>
                  <a :href="href" @click="(e) => { navigate(e); closeItem(); }" :class="[
                    active || isActive ? 'bg-gray-50' : '',
                    'block px-4 py-2.5 text-sm text-gray-700 outline-none',
                  ]">
                    {{ item.name }}
                  </a>
                </router-link>
                </MenuItem>
              </MenuItems>
            </transition>
          </Menu>

        </div>

      </div>

    </div>

    <TransitionRoot as="template" :show="open">
      <div class="md:hidden">

        <TransitionChild as="template" enter="duration-200 ease-out" enter-from="opacity-0" enter-to="opacity-100"
          leave="duration-150 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <PopoverOverlay class="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-[2px]" />
        </TransitionChild>

        <TransitionChild as="template" enter="duration-200 ease-out" enter-from="-translate-y-2 opacity-0"
          enter-to="translate-y-0 opacity-100" leave="duration-150 ease-in" leave-from="translate-y-0 opacity-100"
          leave-to="-translate-y-2 opacity-0">

          <PopoverPanel v-slot="{ close }"
            class="fixed inset-x-0 top-0 z-50 max-h-[min(100dvh,28rem)] overflow-auto border-b border-gray-200 bg-white shadow-xl outline-none">
            <div class="px-3 pb-4 pt-3 sm:px-4">

              <div class="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <img class="h-8 w-auto" src="/images/logo.png" alt="RemitSo" />
                <PopoverButton type="button"
                  class="inline-flex rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  aria-label="Close menu">
                  <XMarkIcon class="size-6" />
                </PopoverButton>
              </div>

              <nav class="mt-3 space-y-0.5" aria-label="Mobile">
                <router-link v-for="item in navigation" :key="item.name" v-slot="{ href, navigate, isActive }"
                  :to="{ name: item.href }" custom>
                  <a :href="href" @click="(e) => { navigate(e); close(); }" :class="navLinkClass(isActive)">
                    {{ item.name }}
                  </a>
                </router-link>
              </nav>

            </div>
          </PopoverPanel>

        </TransitionChild>
      </div>
    </TransitionRoot>

  </Popover>
</template>
