<script setup>
import {computed, onUnmounted, ref, watch} from 'vue';
import moment from 'moment';
import CustomerLayout from '@/components/CustomerLayout.vue';
import BookingStateBadge from '@/views/Travel/Bookings/Partials/BookingStateBadge.vue';
import BookingCancellation from '@/views/Travel/Bookings/Partials/BookingCancellation.vue';
import BookingPayments from '@/views/Travel/Bookings/Partials/BookingPayments.vue';
import HotelRating from '@/views/Travel/Hotels/Partials/HotelRating.vue';
import Order from '@/models/travel/orders/order.js';
import {getCustomerMessage} from '@/composables/api_utils.js';
import {CONFIRMATION_POLL_MS, useOrderUtils} from '@/composables/travel/order_utils.js';
import {getGuestBreakdown} from '@/composables/travel/hotels/hotel_utils.js';
import {ChevronLeftIcon, ExclamationTriangleIcon, MapPinIcon} from '@heroicons/vue/24/outline';

const props = defineProps({
  orderId: {
    type: String,
    required: true,
  },
});

const {getOrder} = useOrderUtils();

const order = ref(null);
const isLoading = ref(true);
const hasFailed = ref(false);
const failureMessage = ref(null);

const stay = computed(() => {
  if (!order.value?.checkIn || !order.value?.checkOut) {
    return null;
  }

  return `${moment(order.value.checkIn).format('ddd D MMM YYYY')} – ${moment(order.value.checkOut).format('ddd D MMM YYYY')}`;
});

const guests = computed(() => {
  const rooms = (order.value?.occupancy?.rooms ?? []).map(room => ({
    adults: room.adults ?? 0,
    children: room.children_ages ?? [],
  }));

  return rooms.length ? getGuestBreakdown(rooms) : [];
});

const guestNames = computed(() => {
  return (order.value?.guests ?? [])
      .map(guest => [guest.firstName, guest.lastName].filter(Boolean).join(' '))
      .filter(Boolean);
});

let pollTimer = null;

function stopPolling() {
  clearTimeout(pollTimer);
  pollTimer = null;
}

function schedulePoll() {
  stopPolling();

  if (!order.value?.isAwaitingHotel) {
    return;
  }

  pollTimer = setTimeout(() => load({quiet: true}), CONFIRMATION_POLL_MS);
}

/**
 * The cancellation quote moves with the clock, so this is read fresh on every
 * open rather than cached — a booking free until midnight is not free at 00:01.
 *
 * @param {{quiet: boolean}} options
 */
async function load({quiet = false} = {}) {
  if (!quiet) {
    isLoading.value = true;
    order.value = null;
  }

  hasFailed.value = false;
  failureMessage.value = null;

  await getOrder(props.orderId).then((response) => {
    order.value = Order.getInstance(response.data);
  }).catch((error) => {
    // A booking that is not this customer's answers 404 rather than 403, and so
    // does a deployment without the travel licence.
    hasFailed.value = true;
    failureMessage.value = getCustomerMessage(error)
        ?? (error.response?.status === 404 ? "We couldn't find this booking." : null);
  }).finally(() => {
    isLoading.value = false;
    schedulePoll();
  });
}

watch(() => props.orderId, () => load(), {immediate: true});

onUnmounted(stopPolling);
</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 bg-gray-50 pb-12">
      <div class="mx-auto max-w-3xl px-4 pt-8 sm:px-6 lg:px-8">
        <RouterLink
            :to="{name: 'travelBookings'}"
            class="inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition hover:text-gray-900"
        >
          <ChevronLeftIcon class="size-4" aria-hidden="true" />
          All bookings
        </RouterLink>
        <!-- Loading -->
        <div v-if="isLoading" class="mt-6 animate-pulse space-y-4">
          <div class="h-32 rounded-2xl border border-gray-200 bg-white" />
          <div class="h-48 rounded-2xl border border-gray-200 bg-white" />
        </div>
        <!-- Failed -->
        <div v-else-if="hasFailed" class="mt-6 flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-white px-8 py-16 text-center">
          <div class="flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600">
            <ExclamationTriangleIcon class="size-7" aria-hidden="true" />
          </div>
          <h1 class="mt-6 text-base font-semibold text-gray-900">We couldn't load this booking</h1>
          <p v-if="failureMessage" class="mt-2 max-w-md text-sm text-gray-500">{{ failureMessage }}</p>
          <p v-else class="mt-2 max-w-md text-sm text-gray-500">Something went wrong on our side. Please try again in a moment.</p>
        </div>
        <template v-else-if="order">
          <!-- Heading -->
          <header class="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
            <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h1 class="text-xl font-semibold tracking-tight text-gray-900">{{ order.hotel?.name }}</h1>
                  <HotelRating :stars="order.hotel?.starRating" />
                </div>
                <p v-if="order.hotel?.address" class="mt-1.5 flex items-start gap-1 text-sm text-gray-500">
                  <MapPinIcon class="mt-0.5 size-4 shrink-0 text-gray-400" aria-hidden="true" />
                  <span>{{ order.hotel.address }}</span>
                </p>
              </div>
              <div class="shrink-0 text-right">
                <p class="text-xs font-medium tracking-wide text-gray-400 uppercase">Total paid</p>
                <p class="mt-1 text-2xl font-semibold tracking-tight text-gray-900">{{ order.total.currencyPrefixed }}</p>
              </div>
            </div>
            <div class="mt-4">
              <BookingStateBadge :order="order" />
            </div>
            <p v-if="order.reference" class="mt-3 text-xs text-gray-400">Reference {{ order.reference }}</p>
          </header>
          <div class="mt-4 space-y-4">
            <!-- Stay -->
            <section class="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <header class="border-b border-gray-100 px-5 py-4">
                <h2 class="text-sm font-semibold text-gray-900">Your stay</h2>
              </header>
              <dl class="divide-y divide-gray-100">
                <div v-if="stay" class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3">
                  <dt class="text-sm text-gray-500">Dates</dt>
                  <dd class="text-sm font-medium text-gray-900">
                    {{ stay }}
                    <span v-if="order.nights" class="font-normal text-gray-400">· {{ order.nights }} night{{ order.nights === 1 ? '' : 's' }}</span>
                  </dd>
                </div>
                <div v-if="order.roomName" class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3">
                  <dt class="text-sm text-gray-500">Room</dt>
                  <dd class="text-sm font-medium text-gray-900">{{ order.roomName }}</dd>
                </div>
                <div v-if="guests.length" class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3">
                  <dt class="text-sm text-gray-500">Occupancy</dt>
                  <dd class="text-sm font-medium text-gray-900">{{ guests.join(' · ') }}</dd>
                </div>
                <div v-if="guestNames.length" class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3">
                  <dt class="text-sm text-gray-500">Guests</dt>
                  <dd class="text-sm font-medium text-gray-900">{{ guestNames.join(', ') }}</dd>
                </div>
                <div v-if="order.contact?.email || order.contact?.phone" class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3">
                  <dt class="text-sm text-gray-500">Contact</dt>
                  <dd class="text-sm font-medium text-gray-900">{{ [order.contact.email, order.contact.phone].filter(Boolean).join(' · ') }}</dd>
                </div>
                <div v-if="order.bookedAt" class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3">
                  <dt class="text-sm text-gray-500">Booked</dt>
                  <dd class="text-sm font-medium text-gray-900">{{ moment(order.bookedAt).format('D MMM YYYY, HH:mm') }}</dd>
                </div>
                <div v-if="order.confirmedAt" class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3">
                  <dt class="text-sm text-gray-500">Confirmed by the hotel</dt>
                  <dd class="text-sm font-medium text-gray-900">{{ moment(order.confirmedAt).format('D MMM YYYY, HH:mm') }}</dd>
                </div>
              </dl>
            </section>
            <!-- What was charged, as written when the booking was made -->
            <section v-if="order.breakdown.length" class="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <header class="border-b border-gray-100 px-5 py-4">
                <h2 class="text-sm font-semibold text-gray-900">What you paid for</h2>
              </header>
              <dl class="divide-y divide-gray-100">
                <div v-for="line in order.breakdown" :key="line.key" class="flex items-baseline justify-between gap-4 px-5 py-3">
                  <dt class="min-w-0 text-sm text-gray-500">{{ line.label }}</dt>
                  <dd class="shrink-0 text-sm text-gray-900 tabular-nums">{{ line.amount.currencyPrefixed }}</dd>
                </div>
                <div class="flex items-baseline justify-between gap-4 bg-gray-50/70 px-5 py-3">
                  <dt class="text-sm font-semibold text-gray-900">Total</dt>
                  <dd class="text-sm font-semibold text-gray-900 tabular-nums">{{ order.total.currencyPrefixed }}</dd>
                </div>
              </dl>
            </section>
            <BookingCancellation :cancellation="order.cancellation" />
            <BookingPayments :payments="order.payments" />
          </div>
        </template>
      </div>
    </main>
  </CustomerLayout>
</template>
