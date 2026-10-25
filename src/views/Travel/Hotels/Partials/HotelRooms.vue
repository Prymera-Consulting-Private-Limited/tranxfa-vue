<script setup>
import {computed} from 'vue';
import HotelMealBadge from '@/views/Travel/Hotels/Partials/HotelMealBadge.vue';
import HotelCancellationBadge from '@/views/Travel/Hotels/Partials/HotelCancellationBadge.vue';
import HotelAvailability from '@/views/Travel/Hotels/Partials/HotelAvailability.vue';
import PayableAtProperty from '@/views/Travel/Hotels/Partials/PayableAtProperty.vue';
import HotelRoomPhotos from '@/views/Travel/Hotels/Partials/HotelRoomPhotos.vue';
import HotelAmenities from '@/views/Travel/Hotels/Partials/HotelAmenities.vue';
import HotelPriceLines from '@/views/Travel/Hotels/Partials/HotelPriceLines.vue';
import HotelCancellationLadder from '@/views/Travel/Hotels/Partials/HotelCancellationLadder.vue';
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
   * The chosen rate, the object itself. A rate is identified by which row it
   * is, never by its token: before console 2026.10.6 the token was the
   * supplier's match key for an offer, and several rows could carry the same
   * one (SD-1219). Keying on it lit three rows at once.
   *
   * @type {HotelRate|null}
   */
  selected: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits([
  'select',
]);

const groups = computed(() => getRateGroups(props.rates));

// The cheapest rate anywhere on the page, so the marker means "cheapest here"
// rather than "cheapest in its own group", which would put one on every group.
const best = computed(() => {
  const bookable = props.rates.filter(rate => rate.bookable && rate.token);

  if (bookable.length === 0) {
    return null;
  }

  return bookable.reduce((cheapest, rate) => (rate.total.amount < cheapest.total.amount ? rate : cheapest));
});

/**
 * Whether a rate has more to say than its total and its badge. Every rate's
 * terms can be read without choosing it (SD-1839), so a customer comparing two
 * never has to select one to see what it costs to cancel.
 *
 * @param {HotelRate} rate
 * @returns {boolean}
 */
function hasTerms(rate) {
  const lines = rate.breakdown.filter(line => line.amount.amount !== 0);

  return lines.length > 1 || (rate.cancellation?.ladder.length ?? 0) > 0;
}
</script>

<template>
  <section>
    <h2 class="text-lg font-semibold tracking-tight text-gray-900">{{ $t('travel.chooseYourRoom') }}</h2>
    <p class="mt-1 text-sm/6 text-gray-500">{{ $t('travel.pricesAreForYourWhole') }}</p>
    <div class="mt-4 space-y-4">
      <!-- Keyed by the room, not its name: two rooms can share one name. -->
      <article v-for="group in groups" :key="group.key" class="overflow-hidden rounded-3xl bg-white ring-1 ring-gray-200 transition hover:ring-gray-300">
        <header class="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-5 pb-4">
          <h3 class="min-w-0 text-base font-semibold tracking-tight text-gray-900">{{ group.name }}</h3>
          <!-- A single rate already shows its own price, so this would only repeat it. -->
          <p v-if="group.rates.length > 1" class="shrink-0 text-right">
            <span class="block text-xs/5 text-gray-500">{{ $t('travel.from') }}</span>
            <span class="text-base font-semibold tracking-tight text-gray-900 tabular-nums">{{ group.from.currencyPrefixed }}</span>
          </p>
        </header>
        <!-- Every rate below is this one room, so what it looks like and has is said once, above them. -->
        <div v-if="group.photos.length || group.amenities.length" class="space-y-3 px-5 pb-4">
          <HotelRoomPhotos :photos="group.photos" :name="group.name" />
          <HotelAmenities :amenities="group.amenities" :labels="labels" :limit="group.amenities.length" />
        </div>
        <ul>
          <!-- Keyed by the rate's own id, never its token: an unbookable rate has no token, and before console 2026.10.6 rates could share one.
          Position only stands in for a rate that arrived without an id. -->
          <li
              v-for="(rate, position) in group.rates"
              :key="rate.id ?? `position-${position}`"
              :class="[
                rate === selected ? 'bg-brand-50/60' : 'hover:bg-gray-50/70',
                'relative flex flex-col gap-4 border-t border-gray-100 px-5 py-4 transition sm:flex-row sm:items-center',
              ]"
          >
            <!-- The chosen rate is marked on the edge as well, since the button alone is easy to lose in a long list. -->
            <span v-if="rate === selected" class="absolute inset-y-0 left-0 w-1 bg-brand-600" aria-hidden="true" />
            <div class="min-w-0 flex-1 space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <span v-if="rate === best" class="inline-flex items-center rounded-lg bg-brand-600 px-2.5 py-1 text-xs/5 font-semibold text-white">{{ $t('travel.lowestPrice') }}</span>
                <HotelMealBadge :meal="rate.meal" :labels="labels" />
                <!-- Each rate's own terms, never the hotel's or another rate's. -->
                <HotelCancellationBadge :cancellation="rate.cancellation" />
                <HotelAvailability :allotment="rate.allotment" />
              </div>
              <PayableAtProperty :charges="rate.payableAtProperty" dense class="max-w-xs" />
              <details v-if="hasTerms(rate)" class="max-w-xs">
                <summary class="cursor-pointer text-xs/5 font-medium text-brand-700 hover:text-brand-800">{{ $t('travel.priceAndCancellation') }}</summary>
                <div class="mt-2 space-y-3">
                  <HotelPriceLines :lines="rate.breakdown" dense />
                  <HotelCancellationLadder :cancellation="rate.cancellation" dense />
                </div>
              </details>
            </div>
            <!-- Price rail, so every row lines up on the number and the button. -->
            <div class="flex shrink-0 items-end justify-between gap-4 sm:w-48 sm:flex-col sm:items-stretch sm:gap-3 sm:border-l sm:border-gray-100 sm:pl-6">
              <div class="sm:text-right">
                <p class="text-lg font-semibold tracking-tight text-gray-900 tabular-nums">{{ rate.total.currencyPrefixed }}</p>
                <p v-if="rate.perNight.isStated && nights" class="mt-0.5 text-xs/5 text-gray-500">{{ $t('travel.pricePerNight', {currencyPrefixed: rate.perNight.currencyPrefixed}) }}</p>
              </div>
              <!-- A rate with no token cannot be taken forward, so it is shown priced but not offered. -->
              <button
                  v-if="rate.bookable && rate.token"
                  type="button"
                  @click="emit('select', rate)"
                  :class="[
                    rate === selected
                      ? 'bg-brand-800 text-white'
                      : 'bg-brand-700 text-white hover:bg-brand-800',
                    'cursor-pointer rounded-xl px-4 py-2.5 text-sm/6 font-semibold shadow-xs transition focus-visible:outline-0',
                  ]"
              >{{ rate === selected ? $t('travel.selected') : $t('travel.select') }}</button>
              <span v-else class="rounded-xl bg-gray-100 px-4 py-2 text-center text-sm/6 font-medium text-gray-500">{{ $t('travel.notAvailable') }}</span>
            </div>
          </li>
        </ul>
      </article>
    </div>
  </section>
</template>
