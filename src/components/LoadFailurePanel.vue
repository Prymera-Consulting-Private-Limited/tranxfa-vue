<script setup>
import {ExclamationTriangleIcon} from "@heroicons/vue/24/outline";
import {RouterLink} from "vue-router";

/**
 * What a parameterised route shows when its id does not resolve.
 *
 * A stale bookmark, a shared link, a step already completed, a record that
 * belongs to someone else - all of them land on a detail route with an id the
 * API will not return. Before this existed the transaction view rendered an
 * empty skeleton, the recipient view rendered nothing at all, and the transfer
 * view said "Loading..." forever.
 */
defineProps({
  title: {type: String, required: true},
  // Only ever a message the API wrote for a customer. getCustomerMessage is
  // what decides that; null falls through to our own wording.
  message: {type: String, default: null},
  backTo: {type: Object, default: null},
  backLabel: {type: String, default: 'Go back'},
})
</script>

<template>
  <div class="mt-6 flex flex-col items-center justify-center rounded-2xl border border-danger-200 bg-white px-8 py-16 text-center">
    <div class="flex size-14 items-center justify-center rounded-full bg-danger-50 text-danger-600">
      <ExclamationTriangleIcon class="size-7" aria-hidden="true" />
    </div>
    <h1 class="mt-6 text-base font-semibold text-gray-900">{{ title }}</h1>
    <p v-if="message" class="mt-2 max-w-md text-sm/6 text-gray-500">{{ message }}</p>
    <p v-else class="mt-2 max-w-md text-sm/6 text-gray-500">
      It may have been removed, or the link may be out of date.
    </p>
    <RouterLink
      v-if="backTo"
      :to="backTo"
      class="mt-6 inline-flex items-center rounded-xl bg-brand-700 px-5 py-2.5 text-sm/6 font-medium text-white transition cursor-pointer hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
    >
      {{ backLabel }}
    </RouterLink>
  </div>
</template>
