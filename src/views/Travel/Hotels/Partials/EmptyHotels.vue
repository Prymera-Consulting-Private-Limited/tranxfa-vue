<script setup>
import {MagnifyingGlassIcon} from "@heroicons/vue/24/outline";

defineProps({
  title: {
    type: String,
    default: 'No hotels available',
  },

  description: {
    type: String,
    default: "We couldn't find any hotels for these dates. Try a different check-in date or a nearby destination.",
  },
});
</script>

<template>
  <section class="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white px-8 py-16 text-center">
    <div class="flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-700">
      <MagnifyingGlassIcon class="size-7" aria-hidden="true" />
    </div>
    <h3 class="mt-6 text-base font-semibold text-gray-900">{{ title }}</h3>
    <p class="mt-2 max-w-md text-sm text-gray-500">{{ description }}</p>
  </section>
</template>
