<script setup>
import {computed} from 'vue';
import HotelMealBadge from "@/views/Travel/Hotels/Partials/HotelMealBadge.vue";
import HotelCancellationBadge from "@/views/Travel/Hotels/Partials/HotelCancellationBadge.vue";
import HotelAvailability from "@/views/Travel/Hotels/Partials/HotelAvailability.vue";
import HotelAmenities from "@/views/Travel/Hotels/Partials/HotelAmenities.vue";
import {formatAmount, getRateAmount, getRateCurrency, getRateKey, prettifyLabel} from "@/composables/travel/hotels/hotel_utils.js";
import {CheckIcon, UsersIcon} from "@heroicons/vue/24/outline";

const props = defineProps({
  /**
   * One room type and every way it can be booked.
   */
  group: {
    type: Object,
    required: true,
  },

  nights: {
    type: Number,
    default: 0,
  },

  // The cheapest rate of the whole hotel, not of this room.
  bestKey: {
    type: String,
    default: null,
  },

  selectedKey: {
    type: String,
    default: null,
  },
});

defineEmits([
  'select',
]);

/**
 * Room facts we can state plainly. The rest of rg_ext is supplier codes whose
 * meaning is not documented, so it stays out of the ui.
 */
const features = computed(() => {
  const rate = props.group.rates[0];
  const features = [];

  if (rate.roomExtension?.bedrooms) {
    features.push(`${rate.roomExtension.bedrooms} bedroom${rate.roomExtension.bedrooms === 1 ? '' : 's'}`);
  }

  if (rate.roomDataTranslation?.beddingType) {
    features.push(prettifyLabel(rate.roomDataTranslation.beddingType));
  }

  return features;
});

const capacity = computed(() => props.group.rates[0].roomExtension?.capacity ?? null);

function payment(rate) {
  return rate.paymentOptions.paymentTypes[0];
}

function total(rate) {
  return `${getRateCurrency(rate)} ${formatAmount(getRateAmount(rate))}`;
}

function perNight(rate) {
  if (!props.nights) {
    return null;
  }

  return `${getRateCurrency(rate)} ${formatAmount(getRateAmount(rate) / props.nights)}`;
}

/**
 * The caveats the supplier keeps out of the room name, e.g. "smoking, bed type
 * is subject to availability".
 */
function note(rate) {
  return rate.roomDataTranslation?.miscRoomType ?? null;
}

const key = getRateKey;
</script>

<template>
  <article class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
    <!-- Room -->
    <header class="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-gray-100 bg-gray-50/60 px-5 py-4">
      <div class="min-w-0">
        <h3 class="text-base font-semibold text-gray-900">{{ group.name }}</h3>
        <div class="mt-1.5 flex flex-wrap items-center gap-2">
          <span v-if="capacity" class="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
            <UsersIcon class="size-3.5 text-gray-400" aria-hidden="true" />
            Sleeps {{ capacity }}
          </span>
          <span v-for="feature in features" :key="feature" class="rounded-lg bg-white px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200">{{ feature }}</span>
        </div>
      </div>
      <p class="shrink-0 text-right">
        <span class="block text-xs text-gray-500">from</span>
        <span class="text-lg font-semibold tracking-tight text-gray-900 tabular-nums">{{ group.currency }} {{ formatAmount(group.amount) }}</span>
      </p>
    </header>
    <!-- Rates -->
    <ul class="divide-y divide-gray-100">
      <li
          v-for="rate in group.rates"
          :key="key(rate)"
          :class="[
            key(rate) === selectedKey ? 'bg-brand-50/50' : '',
            'flex flex-col gap-4 px-5 py-4 transition sm:flex-row sm:items-center sm:justify-between',
          ]"
      >
        <div class="min-w-0 space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <HotelMealBadge :meal="rate.mealData" />
            <HotelCancellationBadge :payment="payment(rate)" />
            <HotelAvailability :allotment="rate.allotment" />
            <span v-if="key(rate) === bestKey" class="inline-flex items-center rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800 ring-1 ring-brand-200 ring-inset">Lowest price</span>
          </div>
          <HotelAmenities :amenities="rate.amenitiesData" />
          <p v-if="note(rate)" class="text-xs text-gray-400">{{ prettifyLabel(note(rate)) }}</p>
        </div>
        <div class="flex shrink-0 items-end justify-between gap-4 sm:flex-col sm:items-end sm:gap-2">
          <div class="text-left sm:text-right">
            <p class="text-lg font-semibold tracking-tight text-gray-900 tabular-nums">{{ total(rate) }}</p>
            <p v-if="perNight(rate)" class="text-xs text-gray-500">{{ perNight(rate) }} / night</p>
          </div>
          <button
              type="button"
              @click="$emit('select', rate)"
              :class="[
                key(rate) === selectedKey
                  ? 'bg-brand-700 text-white hover:bg-brand-800'
                  : 'bg-white text-brand-700 ring-1 ring-brand-200 ring-inset hover:bg-brand-50',
                'flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline-0',
              ]"
          >
            <CheckIcon v-if="key(rate) === selectedKey" class="size-4" aria-hidden="true" />
            {{ key(rate) === selectedKey ? 'Selected' : 'Select' }}
          </button>
        </div>
      </li>
    </ul>
  </article>
</template>
