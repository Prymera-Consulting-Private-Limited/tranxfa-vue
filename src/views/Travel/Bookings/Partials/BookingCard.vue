<script setup>
import {computed} from 'vue';
import moment from 'moment';
import {CalendarDaysIcon, MapPinIcon, UserGroupIcon} from '@heroicons/vue/24/outline';
import BookingStateBadge from '@/views/Travel/Bookings/Partials/BookingStateBadge.vue';
import HotelRating from '@/views/Travel/Hotels/Partials/HotelRating.vue';
import {getGuestBreakdown} from '@/composables/travel/hotels/hotel_utils.js';

const props = defineProps({
  /**
   * @type {Order}
   */
  order: {
    type: Object,
    required: true,
  },
});

const stay = computed(() => {
  if (!props.order.checkIn || !props.order.checkOut) {
    return null;
  }

  return `${moment(props.order.checkIn).format('D MMM')} – ${moment(props.order.checkOut).format('D MMM YYYY')}`;
});

// The occupancy is the same room-by-room shape the search criteria use, so it
// reads through the same breakdown rather than a second implementation.
const guests = computed(() => {
  const rooms = (props.order.occupancy?.rooms ?? []).map(room => ({
    adults: room.adults ?? 0,
    children: room.children_ages ?? [],
  }));

  return rooms.length ? getGuestBreakdown(rooms).join(' · ') : null;
});
</script>

<template>
  <RouterLink
      :to="{name: 'travelBooking', params: {id: order.id}}"
      class="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs transition duration-200 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-200/70"
  >
    <div class="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 class="text-base font-semibold text-gray-900 transition group-hover:text-brand-800">{{ order.hotel?.name }}</h3>
          <HotelRating :stars="order.hotel?.starRating" />
        </div>
        <p v-if="order.hotel?.address" class="mt-1.5 flex items-start gap-1 text-sm text-gray-500">
          <MapPinIcon class="mt-0.5 size-4 shrink-0 text-gray-400" aria-hidden="true" />
          <span class="min-w-0 truncate">{{ order.hotel.address }}</span>
        </p>
        <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-600">
          <span v-if="stay" class="inline-flex items-center gap-1.5">
            <CalendarDaysIcon class="size-4 shrink-0 text-gray-400" aria-hidden="true" />
            {{ stay }}
            <span v-if="order.nights" class="text-gray-400">· {{ order.nights }} night{{ order.nights === 1 ? '' : 's' }}</span>
          </span>
          <span v-if="guests" class="inline-flex items-center gap-1.5">
            <UserGroupIcon class="size-4 shrink-0 text-gray-400" aria-hidden="true" />
            {{ guests }}
          </span>
        </div>
        <p v-if="order.roomName" class="mt-1.5 text-sm text-gray-500">{{ order.roomName }}</p>
        <div class="mt-3">
          <BookingStateBadge :order="order" />
        </div>
        <!-- Only the list carries this, and it says in words what the state means. -->
        <p v-if="order.stateDescription" class="mt-2 text-xs text-gray-500">{{ order.stateDescription }}</p>
      </div>
      <div class="shrink-0 sm:text-right">
        <p class="text-xs font-medium tracking-wide text-gray-400 uppercase">Total</p>
        <p class="mt-1 text-xl font-semibold tracking-tight text-gray-900">{{ order.total.currencyPrefixed }}</p>
        <p v-if="order.reference" class="mt-1 text-xs text-gray-400">{{ order.reference }}</p>
      </div>
    </div>
  </RouterLink>
</template>
