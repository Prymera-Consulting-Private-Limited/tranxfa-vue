<script setup>
import {computed} from 'vue';
import HotelMealBadge from "@/views/Travel/Hotels/Partials/HotelMealBadge.vue";
import HotelCancellationBadge from "@/views/Travel/Hotels/Partials/HotelCancellationBadge.vue";
import {formatAmount, getRateAmount, getRateCurrency} from "@/composables/travel/hotels/hotel_utils.js";
import {CalendarDaysIcon, MoonIcon, UserGroupIcon} from "@heroicons/vue/24/outline";

const props = defineProps({
  stay: {
    type: String,
    default: null,
  },

  nights: {
    type: Number,
    default: 0,
  },

  guests: {
    type: String,
    default: null,
  },

  /**
   * @type {HotelRate|null}
   */
  cheapest: {
    type: Object,
    default: null,
  },

  /**
   * @type {HotelRate|null}
   */
  selected: {
    type: Object,
    default: null,
  },
});

defineEmits([
  'clear',
]);

const rate = computed(() => props.selected ?? props.cheapest);

const currency = computed(() => (rate.value ? getRateCurrency(rate.value) : null));

const amount = computed(() => (rate.value ? formatAmount(getRateAmount(rate.value)) : null));

const perNight = computed(() => {
  if (!rate.value || !props.nights) {
    return null;
  }

  return formatAmount(getRateAmount(rate.value) / props.nights);
});

const roomName = computed(() => {
  if (!props.selected) {
    return null;
  }

  return props.selected.roomDataTranslation?.mainRoomType || props.selected.roomName;
});

const payment = computed(() => props.selected?.paymentOptions?.paymentTypes?.[0] ?? null);

const facts = computed(() => [
  {key: 'dates', icon: CalendarDaysIcon, label: 'Dates', value: props.stay},
  {key: 'nights', icon: MoonIcon, label: 'Nights', value: String(props.nights)},
  {key: 'guests', icon: UserGroupIcon, label: 'Guests', value: props.guests},
]);
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
    <!-- Price -->
    <div v-if="rate" class="border-b border-gray-100 px-5 py-4">
      <p class="text-xs font-medium tracking-wide text-gray-400 uppercase">{{ selected ? 'Your room' : 'From' }}</p>
      <p v-if="roomName" class="mt-1 text-sm font-medium text-gray-900">{{ roomName }}</p>
      <p class="mt-1 flex items-baseline gap-1.5">
        <span class="text-sm font-medium text-gray-500">{{ currency }}</span>
        <span class="text-2xl font-semibold tracking-tight text-gray-900 tabular-nums">{{ amount }}</span>
      </p>
      <p v-if="perNight" class="mt-0.5 text-xs text-gray-500">
        total for {{ nights }} night{{ nights === 1 ? '' : 's' }} &middot; {{ currency }} {{ perNight }} / night
      </p>
      <div v-if="selected" class="mt-3 flex flex-wrap items-center gap-2">
        <HotelMealBadge :meal="selected.mealData" />
        <HotelCancellationBadge :payment="payment" />
      </div>
      <button
          v-if="selected"
          type="button"
          @click="$emit('clear')"
          class="mt-3 cursor-pointer text-xs font-medium text-brand-700 transition hover:text-brand-800"
      >Choose a different room</button>
      <a v-else href="#rooms" class="mt-3 inline-block text-xs font-medium text-brand-700 transition hover:text-brand-800">See all rooms</a>
    </div>
    <!-- Stay -->
    <dl class="divide-y divide-gray-100">
      <div v-for="fact in facts" :key="fact.key" class="flex items-center gap-3 px-5 py-3">
        <component :is="fact.icon" class="size-4 shrink-0 text-gray-400" aria-hidden="true" />
        <dt class="text-xs text-gray-500">{{ fact.label }}</dt>
        <dd class="ml-auto min-w-0 truncate text-sm font-medium text-gray-900">{{ fact.value }}</dd>
      </div>
    </dl>
  </div>
</template>
