<script setup>
import {computed} from 'vue';
import moment from 'moment';
import Spinner from '@/components/Spinner.vue';
import HotelCancellationBadge from '@/views/Travel/Hotels/Partials/HotelCancellationBadge.vue';
import {getGuestBreakdown} from '@/composables/travel/hotels/hotel_utils.js';
import {CalendarDaysIcon, ExclamationTriangleIcon, UserGroupIcon} from '@heroicons/vue/24/outline';

const props = defineProps({
  /**
   * The stay as the backend resolved it, which is what the prices below were
   * quoted against — never what the url happens to say.
   *
   * @type {HotelSearch|null}
   */
  search: {
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

  isHolding: {
    type: Boolean,
    default: false,
  },

  /**
   * Set when the room has gone since the page was loaded, which is an ordinary
   * answer rather than a failure — rooms sell out while they are being read about.
   */
  roomGone: {
    type: Boolean,
    default: false,
  },

  failureMessage: {
    type: String,
    default: null,
  },
});

const emit = defineEmits([
  'hold',
]);

const stay = computed(() => {
  if (!props.search?.checkIn || !props.search?.checkOut) {
    return null;
  }

  return `${moment(props.search.checkIn).format('ddd D MMM')} – ${moment(props.search.checkOut).format('ddd D MMM YYYY')}`;
});

const guests = computed(() => (props.search ? getGuestBreakdown(props.search.rooms) : []));
</script>

<template>
  <div class="space-y-4 rounded-3xl bg-white p-5 ring-1 ring-gray-200">
    <!-- Stay -->
    <div class="space-y-2 text-sm">
      <p v-if="stay" class="flex items-start gap-2 text-gray-700">
        <CalendarDaysIcon class="mt-0.5 size-4 shrink-0 text-gray-400" aria-hidden="true" />
        <span>
          {{ stay }}
          <span v-if="search?.nights" class="text-gray-400">· {{ search.nights }} night{{ search.nights === 1 ? '' : 's' }}</span>
        </span>
      </p>
      <p v-if="guests.length" class="flex items-start gap-2 text-gray-700">
        <UserGroupIcon class="mt-0.5 size-4 shrink-0 text-gray-400" aria-hidden="true" />
        <span>{{ guests.join(' · ') }}</span>
      </p>
    </div>
    <div class="border-t border-gray-100 pt-4">
      <template v-if="selected">
        <p class="text-xs font-medium tracking-wide text-gray-400 uppercase">Your room</p>
        <p class="mt-1 text-sm font-medium text-gray-900">{{ selected.roomName }}</p>
        <p class="mt-3 text-2xl font-semibold tracking-tight text-gray-900 tabular-nums">{{ selected.total.currencyPrefixed }}</p>
        <p v-if="selected.perNight.isStated" class="mt-0.5 text-xs text-gray-500">{{ selected.perNight.currencyPrefixed }} / night</p>
        <div class="mt-3">
          <HotelCancellationBadge :cancellation="selected.cancellation" />
        </div>
      </template>
      <p v-else class="text-sm text-gray-500">Pick a room to see the price for your stay.</p>
    </div>
    <!-- A room selling out between reading about it and choosing it is ordinary,
    so it is answered in place rather than as an error the customer must dismiss. -->
    <div v-if="roomGone" class="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      <ExclamationTriangleIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>That room has just gone. Choose another from the list.</span>
    </div>
    <div v-else-if="failureMessage" class="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <ExclamationTriangleIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{{ failureMessage }}</span>
    </div>
    <button
        type="button"
        :disabled="!selected || isHolding"
        @click="emit('hold')"
        class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-800 focus-visible:outline-0 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
    >
      <Spinner v-if="isHolding" class="size-4" />
      {{ isHolding ? 'Holding this price…' : 'Continue' }}
    </button>
    <p class="text-center text-xs text-gray-400">We'll hold this price for 15 minutes while you check the details.</p>
  </div>
</template>
