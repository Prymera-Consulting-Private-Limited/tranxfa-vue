<script setup>
import {Bars3Icon, BellIcon, XMarkIcon} from "@heroicons/vue/24/outline/index.js";
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
import {MagnifyingGlassIcon} from "@heroicons/vue/20/solid/index.js";

const user = {
  name: 'Tom Cook',
  email: 'tom@example.com',
  imageUrl:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
}
const navigation = [
  { name: 'Dashboard', href: '#', current: true },
  { name: 'Transactions', href: '#', current: false },
  { name: 'Recipients', href: '#', current: false },
  { name: 'Account Verification', href: '#', current: false },
  { name: 'Settings', href: '#', current: false },
]
const userNavigation = [
  { name: 'Your Profile', href: '#' },
  { name: 'Settings', href: '#' },
  { name: 'Sign out', href: '#' },
]
</script>
<template>
  <Popover as="header" class="bg-brand-700 pb-24" v-slot="{ open }">
    <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
      <div class="relative flex items-center justify-center py-5 lg:justify-between">
        <!-- Logo -->
        <div class="absolute left-0 shrink-0 lg:static">
          <a href="#">
            <span class="sr-only">Tranxfa</span>
            <img class="h-8 w-auto" src="/images/logo.png" alt="Tranxfa" />
          </a>
        </div>

        <!-- Right section on desktop -->
        <div class="hidden lg:ml-4 lg:flex lg:items-center lg:pr-0.5">
          <button type="button" class="relative shrink-0 rounded-full p-1 text-indigo-200 hover:bg-white/10 hover:text-white focus:ring-2 focus:ring-white focus:outline-hidden">
            <span class="absolute -inset-1.5" />
            <span class="sr-only">View notifications</span>
            <BellIcon class="size-6" aria-hidden="true" />
          </button>

          <!-- Profile dropdown -->
          <Menu as="div" class="relative ml-4 shrink-0">
            <div>
              <MenuButton class="relative flex rounded-full bg-white text-sm ring-2 ring-white/20 focus:ring-white focus:outline-hidden">
                <span class="absolute -inset-1.5" />
                <span class="sr-only">Open user menu</span>
                <img class="size-8 rounded-full" :src="user.imageUrl" alt="" />
              </MenuButton>
            </div>
            <transition leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100" leave-to-class="transform opacity-0 scale-95">
              <MenuItems class="absolute -right-2 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 ring-1 shadow-lg ring-black/5 focus:outline-hidden">
                <MenuItem v-for="item in userNavigation" :key="item.name" v-slot="{ active }">
                  <a :href="item.href" :class="[active ? 'bg-gray-100 outline-hidden' : '', 'block px-4 py-2 text-sm text-gray-700']">{{ item.name }}</a>
                </MenuItem>
              </MenuItems>
            </transition>
          </Menu>
        </div>

        <!-- Search -->
        <div class="min-w-0 flex-1 px-12 lg:hidden">
          <div class="mx-auto grid w-full max-w-xs grid-cols-1">
            <input type="search" name="search" aria-label="Search" class="peer col-start-1 row-start-1 block w-full rounded-md bg-white/20 py-1.5 pr-3 pl-10 text-base text-white outline-hidden placeholder:text-white focus:bg-white focus:text-gray-900 focus:outline-2 focus:outline-offset-2 focus:outline-white/40 focus:placeholder:text-gray-400 sm:text-sm/6" placeholder="Search" />
            <MagnifyingGlassIcon class="pointer-events-none col-start-1 row-start-1 ml-3 size-5 self-center text-white peer-focus:text-gray-400" aria-hidden="true" />
          </div>
        </div>

        <!-- Menu button -->
        <div class="absolute right-0 shrink-0 lg:hidden">
          <!-- Mobile menu button -->
          <PopoverButton class="relative inline-flex items-center justify-center rounded-md bg-transparent p-2 text-indigo-200 hover:bg-white/10 hover:text-white focus:ring-2 focus:ring-white focus:outline-hidden">
            <span class="absolute -inset-0.5" />
            <span class="sr-only">Open main menu</span>
            <Bars3Icon v-if="!open" class="block size-6" aria-hidden="true" />
            <XMarkIcon v-else class="block size-6" aria-hidden="true" />
          </PopoverButton>
        </div>
      </div>
      <div class="hidden border-t border-purple-100/20 py-5 lg:block">
        <div class="grid grid-cols-3 items-center gap-8">
          <div class="col-span-2">
            <nav class="flex space-x-4">
              <a v-for="item in navigation" :key="item.name" :href="item.href" :class="[item.current ? 'text-white' : 'text-indigo-100', 'rounded-md px-3 py-2 text-sm font-medium hover:bg-white/10']" :aria-current="item.current ? 'page' : undefined">{{ item.name }}</a>
            </nav>
          </div>
          <div class="mx-auto grid w-full max-w-md grid-cols-1">
            <input type="search" name="search" aria-label="Search" class="peer col-start-1 row-start-1 block w-full rounded-md bg-white/20 py-1.5 pr-3 pl-10 text-sm/6 text-white outline-hidden placeholder:text-white focus:bg-white focus:text-gray-900 focus:outline-2 focus:outline-offset-2 focus:outline-white/40 focus:placeholder:text-gray-400" placeholder="Search" />
            <MagnifyingGlassIcon class="pointer-events-none col-start-1 row-start-1 ml-3 size-5 self-center text-white peer-focus:text-gray-400" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>

    <TransitionRoot as="template" :show="open">
      <div class="lg:hidden">
        <TransitionChild as="template" enter="duration-150 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-150 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <PopoverOverlay class="fixed inset-0 z-20 bg-black/25" />
        </TransitionChild>

        <TransitionChild as="template" enter="duration-150 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-150 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
          <PopoverPanel focus class="absolute inset-x-0 top-0 z-30 mx-auto w-full max-w-3xl origin-top transform p-2 transition">
            <div class="divide-y divide-gray-200 rounded-lg bg-white ring-1 shadow-lg ring-black/5">
              <div class="pt-3 pb-2">
                <div class="flex items-center justify-between px-4">
                  <div>
                    <img class="h-8 w-auto" src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600" alt="Your Company" />
                  </div>
                  <div class="-mr-2">
                    <PopoverButton class="relative inline-flex items-center justify-center rounded-md bg-white p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden focus:ring-inset">
                      <span class="absolute -inset-0.5" />
                      <span class="sr-only">Close menu</span>
                      <XMarkIcon class="size-6" aria-hidden="true" />
                    </PopoverButton>
                  </div>
                </div>
                <div class="mt-3 space-y-1 px-2">
                  <a href="#" class="block rounded-md px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-100 hover:text-gray-800">Dashboard</a>
                  <a href="#" class="block rounded-md px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-100 hover:text-gray-800">Transactions</a>
                  <a href="#" class="block rounded-md px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-100 hover:text-gray-800">Recipients</a>
                  <a href="#" class="block rounded-md px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-100 hover:text-gray-800">Account Verification</a>
                  <a href="#" class="block rounded-md px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-100 hover:text-gray-800">Settings</a>
                </div>
              </div>
              <div class="pt-4 pb-2">
                <div class="flex items-center px-5">
                  <div class="shrink-0">
                    <img class="size-10 rounded-full" :src="user.imageUrl" alt="" />
                  </div>
                  <div class="ml-3 min-w-0 flex-1">
                    <div class="truncate text-base font-medium text-gray-800">{{ user.name }}</div>
                    <div class="truncate text-sm font-medium text-gray-500">{{ user.email }}</div>
                  </div>
                  <button type="button" class="relative ml-auto shrink-0 rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden">
                    <span class="absolute -inset-1.5" />
                    <span class="sr-only">View notifications</span>
                    <BellIcon class="size-6" aria-hidden="true" />
                  </button>
                </div>
                <div class="mt-3 space-y-1 px-2">
                  <a v-for="item in userNavigation" :key="item.name" :href="item.href" class="block rounded-md px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-100 hover:text-gray-800">{{ item.name }}</a>
                </div>
              </div>
            </div>
          </PopoverPanel>
        </TransitionChild>
      </div>
    </TransitionRoot>
  </Popover>
</template>