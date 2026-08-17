<script setup>
import {computed} from 'vue';
import HotelRating from '@/views/Travel/Hotels/Partials/HotelRating.vue';
import {ArrowTopRightOnSquareIcon, ClockIcon, MapPinIcon} from '@heroicons/vue/24/outline';

const props = defineProps({
  /**
   * @type {HotelDetail}
   */
  hotel: {
    type: Object,
    required: true,
  },
});

const location = computed(() => [props.hotel.address, props.hotel.region].filter(Boolean).join(', '));

// Only worth a line when the hotel actually stated one of them.
const times = computed(() => {
  const parts = [];

  if (props.hotel.checkInFrom) {
    parts.push(`Check in from ${props.hotel.checkInFrom}`);
  }

  if (props.hotel.checkOutUntil) {
    parts.push(`check out by ${props.hotel.checkOutUntil}`);
  }

  return parts.length ? parts.join(' · ') : null;
});
</script>

<template>
  <header>
    <div class="flex flex-wrap items-center gap-2">
      <span v-if="hotel.starRating" class="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 ring-1 ring-amber-100 ring-inset">
        <HotelRating :stars="hotel.starRating" />
      </span>
    </div>
    <h1 class="mt-3 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">{{ hotel.name }}</h1>
    <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-500">
      <p v-if="location" class="flex items-start gap-1.5">
        <MapPinIcon class="mt-0.5 size-4 shrink-0 text-gray-400" aria-hidden="true" />
        <span>{{ location }}</span>
      </p>
      <a
          v-if="hotel.mapUrl"
          :href="hotel.mapUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 font-medium text-brand-700 transition hover:text-brand-800"
      >
        View on map
        <ArrowTopRightOnSquareIcon class="size-3.5" aria-hidden="true" />
      </a>
    </div>
    <p v-if="times" class="mt-1.5 flex items-start gap-1.5 text-sm text-gray-500">
      <ClockIcon class="mt-0.5 size-4 shrink-0 text-gray-400" aria-hidden="true" />
      <span>{{ times }}</span>
    </p>
  </header>
</template>
