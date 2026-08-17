<script setup>
import {computed} from 'vue';
import HotelMealBadge from '@/views/Travel/Hotels/Partials/HotelMealBadge.vue';
import HotelCancellationBadge from '@/views/Travel/Hotels/Partials/HotelCancellationBadge.vue';
import HotelAvailability from '@/views/Travel/Hotels/Partials/HotelAvailability.vue';
import {getRateGroups} from '@/composables/travel/hotels/hotel_utils.js';

const props = defineProps({
  /**
   * @type {HotelRate[]}
   */
  rates: {
    type: Array,
    default: () => [],
  },

  labels: {
    type: Object,
    default: () => ({}),
  },

  nights: {
    type: Number,
    default: 0,
  },

  /**
   * The token of the chosen rate. A token is what identifies a rate here — it is
   * the only thing on it that is unique and that the next step will accept.
   */
  selectedToken: {
    type: String,
    default: null,
  },
});

const emit = defineEmits([
  'select',
]);

const groups = computed(() => getRateGroups(props.rates));

// The cheapest rate anywhere on the page, so the marker means "cheapest here"
// rather than "cheapest in its own group", which would put one on every group.
const bestToken = computed(() => {
  const bookable = props.rates.filter(rate => rate.bookable && rate.token);

  if (bookable.length === 0) {
    return null;
  }

  return bookable.reduce((cheapest, rate) => (rate.total.amount < cheapest.total.amount ? rate : cheapest)).token;
});
</script>

<template>
  <section>
    <h2 class="text-lg font-semibold tracking-tight text-gray-900">Choose your room</h2>
    <p class="mt-1 text-sm text-gray-500">Prices are for your whole stay. Each option has its own cancellation terms.</p>
    <div class="mt-4 space-y-4">
      <article v-for="group in groups" :key="group.name" class="overflow-hidden rounded-3xl bg-white ring-1 ring-gray-200 transition hover:ring-gray-300">
        <header class="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-5 pb-4">
          <h3 class="min-w-0 text-base font-semibold tracking-tight text-gray-900">{{ group.name }}</h3>
          <!-- A single rate already shows its own price, so this would only repeat it. -->
          <p v-if="group.rates.length > 1" class="shrink-0 text-right">
            <span class="block text-xs text-gray-400">from</span>
            <span class="text-base font-semibold tracking-tight text-gray-900 tabular-nums">{{ group.from.currencyPrefixed }}</span>
          </p>
        </header>
        <ul>
          <li
              v-for="rate in group.rates"
              :key="rate.token ?? rate.roomName"
              :class="[
                rate.token === selectedToken ? 'bg-brand-50/60' : 'hover:bg-gray-50/70',
                'relative flex flex-col gap-4 border-t border-gray-100 px-5 py-4 transition sm:flex-row sm:items-center',
              ]"
          >
            <!-- The chosen rate is marked on the edge as well, since the button alone is easy to lose in a long list. -->
            <span v-if="rate.token === selectedToken" class="absolute inset-y-0 left-0 w-1 bg-brand-600" aria-hidden="true" />
            <div class="min-w-0 flex-1 space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <span v-if="rate.token && rate.token === bestToken" class="inline-flex items-center rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white">Lowest price</span>
                <HotelMealBadge :meal="rate.meal" :labels="labels" />
                <!-- Each rate's own terms, never the hotel's or another rate's. -->
                <HotelCancellationBadge :cancellation="rate.cancellation" />
                <HotelAvailability :allotment="rate.allotment" />
              </div>
              <p v-if="rate.payableAtProperty.isStated" class="text-xs text-amber-700">Plus {{ rate.payableAtProperty.currencyPrefixed }} payable at the property</p>
            </div>
            <!-- Price rail, so every row lines up on the number and the button. -->
            <div class="flex shrink-0 items-end justify-between gap-4 sm:w-48 sm:flex-col sm:items-stretch sm:gap-3 sm:border-l sm:border-gray-100 sm:pl-6">
              <div class="sm:text-right">
                <p class="text-lg font-semibold tracking-tight text-gray-900 tabular-nums">{{ rate.total.currencyPrefixed }}</p>
                <p v-if="rate.perNight.isStated && nights" class="mt-0.5 text-xs text-gray-500">{{ rate.perNight.currencyPrefixed }} / night</p>
              </div>
              <!-- A rate with no token cannot be taken forward, so it is shown priced but not offered. -->
              <button
                  v-if="rate.bookable && rate.token"
                  type="button"
                  @click="emit('select', rate)"
                  :class="[
                    rate.token === selectedToken
                      ? 'bg-brand-800 text-white'
                      : 'bg-brand-700 text-white hover:bg-brand-800',
                    'cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold shadow-xs transition focus-visible:outline-0',
                  ]"
              >{{ rate.token === selectedToken ? 'Selected' : 'Select' }}</button>
              <span v-else class="rounded-xl bg-gray-100 px-4 py-2 text-center text-sm font-medium text-gray-500">Not available</span>
            </div>
          </li>
        </ul>
      </article>
    </div>
  </section>
</template>
