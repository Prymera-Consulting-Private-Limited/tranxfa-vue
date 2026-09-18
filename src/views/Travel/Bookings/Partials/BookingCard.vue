<script setup>
import {computed} from 'vue';
import moment from 'moment';
import {CalendarDaysIcon, ClockIcon, MapPinIcon, UserGroupIcon} from '@heroicons/vue/24/outline';
import BookingNextStep from '@/views/Travel/Bookings/Partials/BookingNextStep.vue';
import BookingStateBadge from '@/views/Travel/Bookings/Partials/BookingStateBadge.vue';
import HotelRating from '@/views/Travel/Hotels/Partials/HotelRating.vue';
import {getGuestSummary, getStayLabel} from '@/composables/travel/hotels/hotel_utils.js';

const props = defineProps({
  /**
   * @type {Order}
   */
  order: {
    type: Object,
    required: true,
  },
});

const stay = computed(() => getStayLabel(props.order.checkIn, props.order.checkOut));

// The occupancy is the same room-by-room shape the search criteria use, so it
// reads through the same summary rather than a second implementation. A card
// in a list has room for one line, not one per room.
const guests = computed(() => {
  const rooms = (props.order.occupancy?.rooms ?? []).map(room => ({
    adults: room.adults ?? 0,
    children: room.children_ages ?? [],
  }));

  return getGuestSummary(rooms);
});

// A moment, unlike the stay's dates: the waiting payment really does lapse at
// this time. Null means it never expires, and the line is left out.
const openPaymentDeadline = computed(() => (props.order.openPayment?.expiresAt
    ? moment(props.order.openPayment.expiresAt).format('lll')
    : null));
</script>

<template>
  <!-- The whole card opens the booking through the name's link, stretched over
  it, so the pay button can sit on the card without being inside a link. -->
  <article class="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs transition duration-200 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-200/70">
    <div class="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 class="text-base font-semibold text-gray-900 transition group-hover:text-brand-800">
            <RouterLink
                :to="{name: 'travelBooking', params: {id: order.id}}"
                class="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
            >{{ order.hotel?.name }}</RouterLink>
          </h3>
          <HotelRating :stars="order.hotel?.starRating" />
        </div>
        <p v-if="order.hotel?.address" class="mt-1.5 flex items-start gap-1 text-sm/6 text-gray-500">
          <MapPinIcon class="mt-0.5 size-4 shrink-0 text-gray-400" aria-hidden="true" />
          <span class="min-w-0 truncate">{{ order.hotel.address }}</span>
        </p>
        <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm/6 text-gray-600">
          <span v-if="stay" class="inline-flex items-center gap-1.5">
            <CalendarDaysIcon class="size-4 shrink-0 text-gray-400" aria-hidden="true" />
            {{ stay }}
            <span v-if="order.nights" class="text-gray-500">· {{ $t('travel.nightCount', order.nights, {count: order.nights}) }}</span>
          </span>
          <span v-if="guests" class="inline-flex items-center gap-1.5">
            <UserGroupIcon class="size-4 shrink-0 text-gray-400" aria-hidden="true" />
            {{ guests }}
          </span>
        </div>
        <p v-if="order.roomName" class="mt-1.5 text-sm/6 text-gray-500">{{ order.roomName }}</p>
        <div class="mt-3">
          <BookingStateBadge :order="order" />
        </div>
        <!-- The api's own sentence for what the state means. -->
        <p v-if="order.stateDescription" class="mt-2 text-xs/5 text-gray-500">{{ order.stateDescription }}</p>
        <!-- A waiting payment holds the customer's deposit account, so the
        booking it belongs to has to be findable from the list. -->
        <p v-if="order.openPayment" class="mt-3 inline-flex flex-wrap items-center gap-x-1.5 rounded-lg bg-warning-50 px-2.5 py-1 text-xs/5 font-medium text-warning-800 ring-1 ring-warning-200 ring-inset">
          <ClockIcon class="size-3.5 shrink-0" aria-hidden="true" />
          {{ $t('travel.paymentWaiting', {amount: order.openPayment.amount.currencyPrefixed}) }}
          <span v-if="openPaymentDeadline" class="font-normal">· {{ $t('travel.payByShort', {deadline: openPaymentDeadline}) }}</span>
        </p>
      </div>
      <div class="shrink-0 sm:text-right">
        <p class="text-xs/5 font-medium tracking-wide text-gray-500 uppercase">{{ $t('account.total') }}</p>
        <p class="mt-1 text-xl font-semibold tracking-tight text-gray-900">{{ order.total.currencyPrefixed }}</p>
        <p v-if="order.reference" class="mt-1 text-xs/5 text-gray-500">{{ order.reference }}</p>
        <BookingNextStep :order="order" class="relative z-10 mt-3" />
      </div>
    </div>
  </article>
</template>
