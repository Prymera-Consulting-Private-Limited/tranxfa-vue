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

// A single rate already shows its own price, so the header would only repeat it.
const hasRange = computed(() => props.group.rates.length > 1);

/**
 * When the money is taken, which the supplier states per payment type.
 */
const PAYMENT_LABELS = {
  now: 'Pay now',
  hotel: 'Pay at the hotel',
  deposit: 'Deposit now, rest later',
};

function payment(rate) {
  return rate.paymentOptions.paymentTypes[0];
}

function paymentLabel(rate) {
  return PAYMENT_LABELS[payment(rate).type] ?? null;
}

function total(rate) {
  return formatAmount(getRateAmount(rate));
}

function perNight(rate) {
  if (!props.nights) {
    return null;
  }

  return formatAmount(getRateAmount(rate) / props.nights);
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
  <article class="overflow-hidden rounded-3xl bg-white ring-1 ring-gray-200 transition hover:ring-gray-300">
    <!-- Room -->
    <header class="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-5 pb-4 sm:px-6">
      <div class="min-w-0">
        <h3 class="text-base font-semibold tracking-tight text-gray-900 sm:text-lg">{{ group.name }}</h3>
        <!-- Stated plainly rather than as chips, so the badges below stay the loudest thing in the card. -->
        <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
          <span v-if="capacity" class="inline-flex items-center gap-1">
            <UsersIcon class="size-3.5 text-gray-400" aria-hidden="true" />
            Sleeps {{ capacity }}
          </span>
          <template v-for="(feature, position) in features" :key="feature">
            <span v-if="capacity || position" class="text-gray-300" aria-hidden="true">&middot;</span>
            <span>{{ feature }}</span>
          </template>
        </div>
      </div>
      <p v-if="hasRange" class="shrink-0 text-right">
        <span class="block text-xs text-gray-400">from</span>
        <span class="text-base font-semibold tracking-tight text-gray-900 tabular-nums">{{ group.currency }} {{ formatAmount(group.amount) }}</span>
      </p>
    </header>
    <!-- Rates -->
    <ul>
      <li
          v-for="rate in group.rates"
          :key="key(rate)"
          :class="[
            key(rate) === selectedKey ? 'bg-brand-50/60' : 'hover:bg-gray-50/70',
            'relative flex flex-col gap-4 border-t border-gray-100 px-5 py-4 transition sm:flex-row sm:items-center sm:px-6',
          ]"
      >
        <!-- The chosen rate is marked on the edge of the row as well, since the button alone is easy to lose in a long list. -->
        <span v-if="key(rate) === selectedKey" class="absolute inset-y-0 left-0 w-1 bg-brand-600" aria-hidden="true" />
        <div class="min-w-0 flex-1 space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <span v-if="key(rate) === bestKey" class="inline-flex items-center rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white">Lowest price</span>
            <HotelMealBadge :meal="rate.mealData" />
            <HotelCancellationBadge :payment="payment(rate)" />
            <HotelAvailability :allotment="rate.allotment" />
          </div>
          <HotelAmenities :amenities="rate.amenitiesData" />
          <p v-if="note(rate)" class="text-xs text-gray-400">{{ prettifyLabel(note(rate)) }}</p>
        </div>
        <!-- Price rail, so every row lines up on the number and the button. -->
        <div class="flex shrink-0 items-end justify-between gap-4 sm:w-48 sm:flex-col sm:items-stretch sm:gap-3 sm:border-l sm:border-gray-100 sm:pl-6">
          <div class="sm:text-right">
            <p class="flex items-baseline gap-1 sm:justify-end">
              <span class="text-xs font-medium text-gray-500">{{ getRateCurrency(rate) }}</span>
              <span class="text-xl font-semibold tracking-tight text-gray-900 tabular-nums">{{ total(rate) }}</span>
            </p>
            <p v-if="perNight(rate)" class="mt-0.5 text-xs text-gray-500 tabular-nums">{{ perNight(rate) }} / night</p>
            <p v-if="paymentLabel(rate)" class="mt-0.5 text-xs text-gray-400">{{ paymentLabel(rate) }}</p>
          </div>
          <button
              type="button"
              @click="$emit('select', rate)"
              :class="[
                key(rate) === selectedKey
                  ? 'bg-brand-700 text-white hover:bg-brand-800'
                  : 'bg-white text-gray-900 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 hover:ring-gray-400',
                'flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold transition focus-visible:outline-0',
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
