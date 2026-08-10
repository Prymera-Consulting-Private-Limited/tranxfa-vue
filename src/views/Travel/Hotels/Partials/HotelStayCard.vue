<script setup>
import {computed} from 'vue';
import HotelMealBadge from "@/views/Travel/Hotels/Partials/HotelMealBadge.vue";
import HotelSelectionCancellationBadge from "@/views/Travel/Hotels/Partials/HotelSelectionCancellationBadge.vue";
import {formatAmount, getSelectionRateAmount, getSelectionRateCurrency} from "@/composables/travel/hotels/hotel_utils.js";
import {ArrowDownIcon, CalendarDaysIcon, CheckIcon, MoonIcon, UserGroupIcon} from "@heroicons/vue/24/outline";

const props = defineProps({
  stay: {
    type: String,
    default: null,
  },

  nights: {
    type: Number,
    default: 0,
  },

  /**
   * One line per room, since each is priced on its own adults and children.
   *
   * @type {string[]}
   */
  guests: {
    type: Array,
    default: () => [],
  },

  /**
   * @type {HotelSelectionRate|null}
   */
  cheapest: {
    type: Object,
    default: null,
  },

  /**
   * @type {HotelSelectionRate|null}
   */
  selected: {
    type: Object,
    default: null,
  },

  isBooking: {
    type: Boolean,
    default: false,
  },

  bookingFailed: {
    type: Boolean,
    default: false,
  },
});

defineEmits([
  'book',
]);

const rate = computed(() => props.selected ?? props.cheapest);

const currency = computed(() => (rate.value ? getSelectionRateCurrency(rate.value) : null));

const amount = computed(() => (rate.value ? formatAmount(getSelectionRateAmount(rate.value)) : null));

const perNight = computed(() => {
  if (!rate.value || !props.nights) {
    return null;
  }

  return formatAmount(getSelectionRateAmount(rate.value) / props.nights);
});

const roomName = computed(() => {
  if (!props.selected) {
    return null;
  }

  return props.selected.roomData?.mainRoomType || props.selected.roomName;
});

const facts = computed(() => [
  {key: 'dates', icon: CalendarDaysIcon, label: 'Dates', value: props.stay},
  {key: 'nights', icon: MoonIcon, label: 'Nights', value: String(props.nights)},
]);
</script>

<template>
  <div class="overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200">
    <!-- Price. Tinted once a room is chosen, so the rail reads as a summary rather than a teaser. -->
    <div v-if="rate" :class="[selected ? 'bg-gradient-to-br from-brand-50 via-white to-white' : '', 'px-5 py-5']">
      <div class="flex items-center justify-between gap-2">
        <p :class="[selected ? 'text-brand-700' : 'text-gray-400', 'text-xs font-semibold tracking-wide uppercase']">
          {{ selected ? 'Your room' : 'From' }}
        </p>
        <span v-if="selected" class="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
          <CheckIcon class="size-3" aria-hidden="true" />
        </span>
      </div>
      <p v-if="roomName" class="mt-1.5 text-sm font-medium text-gray-900">{{ roomName }}</p>
      <p class="mt-2 flex items-baseline gap-1.5">
        <span class="text-sm font-medium text-gray-500">{{ currency }}</span>
        <span class="text-3xl font-semibold tracking-tight text-gray-900 tabular-nums">{{ amount }}</span>
      </p>
      <p v-if="perNight" class="mt-1 text-xs text-gray-500">
        total for {{ nights }} night{{ nights === 1 ? '' : 's' }} &middot; {{ currency }} {{ perNight }} / night
      </p>
      <div v-if="selected" class="mt-3 flex flex-wrap items-center gap-2">
        <HotelMealBadge :meal="selected.mealType" />
        <HotelSelectionCancellationBadge :cancellation="selected.cancellation" />
      </div>
      <p v-if="bookingFailed" class="mt-3 text-xs text-red-600">Something went wrong starting your booking. Please try again.</p>
      <button
          v-if="selected"
          type="button"
          :disabled="isBooking"
          @click="$emit('book')"
          class="mt-4 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-0 disabled:cursor-not-allowed disabled:opacity-60"
      >{{ isBooking ? 'Booking…' : 'Book now' }}</button>
      <a
          v-if="selected"
          href="#rooms"
          class="mt-2 inline-block cursor-pointer text-xs font-medium text-brand-700 underline decoration-brand-200 underline-offset-2 transition hover:text-brand-800 hover:decoration-brand-400"
      >Choose a different room</a>
      <a
          v-else
          href="#rooms"
          class="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800"
      >
        <ArrowDownIcon class="size-4" aria-hidden="true" />
        Choose a room
      </a>
    </div>
    <!-- Stay -->
    <dl :class="[rate ? 'border-t border-gray-100' : '', 'space-y-3 bg-gray-50/70 px-5 py-4']">
      <div v-for="fact in facts" :key="fact.key" class="flex items-center gap-3">
        <span class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-gray-500 ring-1 ring-gray-200">
          <component :is="fact.icon" class="size-4" aria-hidden="true" />
        </span>
        <dt class="text-xs text-gray-500">{{ fact.label }}</dt>
        <dd class="ml-auto min-w-0 truncate text-sm font-medium text-gray-900">{{ fact.value }}</dd>
      </div>
      <!-- One line per room once there is more than one, so a child never reads as belonging to the wrong room. -->
      <div v-if="guests.length" class="flex gap-3">
        <span class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-gray-500 ring-1 ring-gray-200">
          <UserGroupIcon class="size-4" aria-hidden="true" />
        </span>
        <div class="min-w-0 flex-1">
          <dt class="text-xs text-gray-500">Guests</dt>
          <dd v-if="guests.length === 1" class="text-sm font-medium text-gray-900">{{ guests[0] }}</dd>
          <dd v-else class="mt-1 space-y-1.5">
            <div v-for="(room, index) in guests" :key="index">
              <p class="text-xs text-gray-400">Room {{ index + 1 }}</p>
              <p class="text-sm font-medium text-gray-900">{{ room }}</p>
            </div>
          </dd>
        </div>
      </div>
    </dl>
  </div>
</template>
