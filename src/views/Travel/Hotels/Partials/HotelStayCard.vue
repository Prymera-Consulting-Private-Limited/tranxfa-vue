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
    <div class="space-y-2 text-sm/6">
      <p v-if="stay" class="flex items-start gap-2 text-gray-700">
        <CalendarDaysIcon class="mt-0.5 size-4 shrink-0 text-gray-400" aria-hidden="true" />
        <span>
          {{ stay }}
          <span v-if="search?.nights" class="text-gray-500">· {{ search.nights }} night{{ search.nights === 1 ? '' : 's' }}</span>
        </span>
      </p>
      <p v-if="guests.length" class="flex items-start gap-2 text-gray-700">
        <UserGroupIcon class="mt-0.5 size-4 shrink-0 text-gray-400" aria-hidden="true" />
        <span>{{ guests.join(' · ') }}</span>
      </p>
    </div>
    <div class="border-t border-gray-100 pt-4">
      <template v-if="selected">
        <p class="text-xs/5 font-medium tracking-wide text-gray-500 uppercase">{{ $t('travel.yourRoom') }}</p>
        <p class="mt-1 text-sm/6 font-medium text-gray-900">{{ selected.roomName }}</p>
        <p class="mt-3 text-2xl font-semibold tracking-tight text-gray-900 tabular-nums">{{ selected.total.currencyPrefixed }}</p>
        <p v-if="selected.perNight.isStated" class="mt-0.5 text-xs/5 text-gray-500">{{ selected.perNight.currencyPrefixed }} / night</p>
        <div class="mt-3">
          <HotelCancellationBadge :cancellation="selected.cancellation" />
        </div>
      </template>
      <p v-else class="text-sm/6 text-gray-500">{{ $t('travel.pickARoomToSee') }}</p>
    </div>
    <!-- A room selling out between reading about it and choosing it is ordinary,
    so it is answered in place rather than as an error the customer must dismiss. -->
    <div v-if="roomGone" class="flex items-start gap-2 rounded-xl border border-warning-200 bg-warning-50 p-3 text-sm/6 text-warning-800">
      <ExclamationTriangleIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{{ $t('travel.thatRoomHasJustGone') }}</span>
    </div>
    <div v-else-if="failureMessage" class="flex items-start gap-2 rounded-xl border border-danger-200 bg-danger-50 p-3 text-sm/6 text-danger-700">
      <ExclamationTriangleIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{{ failureMessage }}</span>
    </div>
    <button
        type="button"
        :disabled="!selected || isHolding"
        @click="emit('hold')"
        class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3.5 text-sm/6 font-semibold text-white shadow-xs transition hover:bg-brand-800 focus-visible:outline-0 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
    >
      <Spinner v-if="isHolding" class="size-4" />
      {{ isHolding ? $t('travel.holdingThisPrice') : $t('common.continue') }}
    </button>
    <p class="text-center text-xs/5 text-gray-500">{{ $t('travel.wellHoldThisPriceFor') }}</p>
  </div>
</template>
