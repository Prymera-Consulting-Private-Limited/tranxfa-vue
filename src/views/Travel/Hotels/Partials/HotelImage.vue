<script setup>
import {BuildingOffice2Icon} from "@heroicons/vue/24/outline";

const props = defineProps({
  hotel: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <div class="relative h-full min-h-52 overflow-hidden bg-gray-100">
    <img v-if="hotel.photo" :src="hotel.photo.card" :alt="hotel.name" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy">
    <!-- No Photo -->
    <div v-else class="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
      <BuildingOffice2Icon class="size-10 text-gray-400" aria-hidden="true" />
      <span class="sr-only">No photo available</span>
    </div>
  </div>
</template>
