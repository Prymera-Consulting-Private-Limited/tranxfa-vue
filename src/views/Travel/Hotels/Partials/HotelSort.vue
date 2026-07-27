<script setup>
import {Menu, MenuButton, MenuItem, MenuItems} from '@headlessui/vue';
import {ChevronDownIcon, CheckIcon} from '@heroicons/vue/24/outline';
import {SORT_OPTIONS} from "@/composables/travel/hotels/hotel_utils.js";

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
  },
});

const emit = defineEmits([
  'update:modelValue',
]);
</script>

<template>
  <Menu as="div" class="relative shrink-0 text-left">
    <MenuButton class="flex cursor-pointer items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-xs transition hover:border-gray-300 focus-visible:outline-0">
      <span class="text-gray-400">Sort:</span>
      {{ SORT_OPTIONS.find(option => option.value === modelValue)?.label }}
      <ChevronDownIcon class="size-4 text-gray-400" aria-hidden="true" />
    </MenuButton>
    <transition leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100" leave-to-class="transform opacity-0 scale-95">
      <MenuItems class="absolute right-0 z-10 mt-2 w-52 origin-top-right rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-hidden">
        <MenuItem v-for="option in SORT_OPTIONS" :key="option.value" v-slot="{active}">
          <button
              type="button"
              @click="emit('update:modelValue', option.value)"
              :class="[active ? 'bg-gray-100' : '', 'flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-2 text-left text-sm text-gray-700']"
          >
            {{ option.label }}
            <CheckIcon v-if="option.value === modelValue" class="size-4 text-brand-700" aria-hidden="true" />
          </button>
        </MenuItem>
      </MenuItems>
    </transition>
  </Menu>
</template>
