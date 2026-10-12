<script setup>
import {MagnifyingGlassIcon} from "@heroicons/vue/24/outline";

// No default strings: a prop default is evaluated before any locale is in play,
// so copy written there can never be translated. The template falls back to the
// catalogue instead.
defineProps({
  title: {
    type: String,
    default: null,
  },

  description: {
    type: String,
    default: null,
  },
});
</script>

<template>
  <section class="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white px-8 py-16 text-center">
    <div class="flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-700">
      <MagnifyingGlassIcon class="size-7" aria-hidden="true" />
    </div>
    <h3 class="mt-6 text-base font-semibold text-gray-900">{{ title ?? $t('travel.noHotelsAvailable') }}</h3>
    <p class="mt-2 max-w-md text-sm/6 text-gray-500">{{ description ?? $t('travel.noHotelsForTheseDates') }}</p>
  </section>
</template>
