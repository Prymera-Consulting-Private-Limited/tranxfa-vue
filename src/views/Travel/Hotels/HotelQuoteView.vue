<script setup>
import {computed, onUnmounted, ref, watch} from 'vue';
import moment from 'moment';
import {useRouter} from 'vue-router';
import CustomerLayout from '@/components/CustomerLayout.vue';
import HotelRating from '@/views/Travel/Hotels/Partials/HotelRating.vue';
import HotelMealBadge from '@/views/Travel/Hotels/Partials/HotelMealBadge.vue';
import HotelCancellationBadge from '@/views/Travel/Hotels/Partials/HotelCancellationBadge.vue';
import GuestContactForm from '@/views/Travel/Hotels/Partials/GuestContactForm.vue';
import TravelQuote from '@/models/travel/quote.js';
import {getCustomerMessage} from '@/composables/api_utils.js';
import {getGuestBreakdown, useHotelUtils} from '@/composables/travel/hotels/hotel_utils.js';
import {useOrderUtils} from '@/composables/travel/order_utils.js';
import {CalendarDaysIcon, ClockIcon, ExclamationTriangleIcon, MapPinIcon, UserGroupIcon} from '@heroicons/vue/24/outline';

const props = defineProps({
  quoteId: {
    type: String,
    required: true,
  },
});

const router = useRouter();

const {getQuote} = useHotelUtils();
const {bookQuote} = useOrderUtils();

/**
 * @type {import('vue').Ref<TravelQuote|null>}
 */
const quote = ref(null);

const isLoading = ref(true);
const hasFailed = ref(false);
const failureMessage = ref(null);
const hasExpired = ref(false);

// Ticks so the countdown moves, and so the page notices the hold running out
// without waiting for the customer to do something.
const now = ref(moment());
let clock = null;

const expiresAt = computed(() => (quote.value?.expiresAt ? moment(quote.value.expiresAt) : null));

const secondsLeft = computed(() => {
  if (!expiresAt.value) {
    return null;
  }

  return Math.max(0, expiresAt.value.diff(now.value, 'seconds'));
});

const countdown = computed(() => {
  if (secondsLeft.value === null) {
    return null;
  }

  const minutes = Math.floor(secondsLeft.value / 60);
  const seconds = secondsLeft.value % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
});

// Under two minutes the hold is worth hurrying, not just watching.
const isRunningOut = computed(() => secondsLeft.value !== null && secondsLeft.value <= 120);

const isHeld = computed(() => !hasExpired.value && (secondsLeft.value === null || secondsLeft.value > 0));

const stay = computed(() => {
  if (!quote.value?.checkIn || !quote.value?.checkOut) {
    return null;
  }

  return `${moment(quote.value.checkIn).format('ddd D MMM')} – ${moment(quote.value.checkOut).format('ddd D MMM YYYY')}`;
});

const guests = computed(() => (quote.value ? getGuestBreakdown(quote.value.rooms) : []));

/**
 * The quote is held rather than recalculated — the price, the rule behind it and
 * the exchange rate are all recorded — but its cancellation terms are worked out
 * again on every read, because that answer genuinely moves with the clock. So
 * this is fetched on opening rather than carried over from the page before.
 */
async function load() {
  isLoading.value = true;
  hasFailed.value = false;
  hasExpired.value = false;
  failureMessage.value = null;

  await getQuote(props.quoteId).then((response) => {
    quote.value = TravelQuote.getInstance(response.data);
  }).catch((error) => {
    quote.value = null;
    hasExpired.value = error.response?.status === 410;
    hasFailed.value = !hasExpired.value;
    failureMessage.value = getCustomerMessage(error);
  }).finally(() => {
    isLoading.value = false;
  });
}

const isBooking = ref(false);
const bookingError = ref(null);
const bookingValidation = ref(null);

/**
 * Turns the hold into a real booking. Payment is a separate step against the
 * order this creates — the room is held either way, and a payment page that
 * never opens should not cost the customer the booking.
 *
 * @param {object} payload
 */
async function book(payload) {
  isBooking.value = true;
  bookingError.value = null;
  bookingValidation.value = null;

  await bookQuote(props.quoteId, payload).then((response) => {
    router.push({name: 'travelBookingPayment', params: {id: response.data.id}});
  }).catch((error) => {
    // A hold that ran out while the form was being filled in is an expiry, not
    // a failure of anything the customer typed.
    if (error.response?.status === 410) {
      hasExpired.value = true;
      failureMessage.value = getCustomerMessage(error);
    } else if (error.response?.status === 422) {
      bookingValidation.value = error.response?.data?.errors ?? null;
      bookingError.value = getCustomerMessage(error);
    } else {
      bookingError.value = getCustomerMessage(error) ?? 'We could not book this room. Please try again in a moment.';
    }

    isBooking.value = false;
  });
}

watch(() => props.quoteId, load, {immediate: true});

clock = setInterval(() => {
  now.value = moment();
}, 1000);

onUnmounted(() => clearInterval(clock));
</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 bg-gray-50 pb-12">
      <div class="mx-auto max-w-3xl px-4 pt-8 sm:px-6 lg:px-8">
        <!-- Loading -->
        <div v-if="isLoading" class="animate-pulse space-y-4">
          <div class="h-28 rounded-3xl bg-white ring-1 ring-gray-200" />
          <div class="h-64 rounded-3xl bg-white ring-1 ring-gray-200" />
        </div>
        <!-- The hold ran out. Not an error the customer made, so it reads as an
        expiry with a way forward rather than as a failure. -->
        <div v-else-if="hasExpired || !isHeld" class="flex flex-col items-center justify-center rounded-3xl bg-white px-8 py-16 text-center ring-1 ring-amber-200">
          <div class="flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <ClockIcon class="size-7" aria-hidden="true" />
          </div>
          <h1 class="mt-6 text-base font-semibold text-gray-900">This price is no longer held</h1>
          <p class="mt-2 max-w-md text-sm text-gray-500">
            {{ failureMessage ?? 'We hold a price for 15 minutes. Search again to see what is available now.' }}
          </p>
          <RouterLink
              :to="{name: 'hotels'}"
              class="mt-6 cursor-pointer rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-0"
          >Search again</RouterLink>
        </div>
        <!-- Failed -->
        <div v-else-if="hasFailed" class="flex flex-col items-center justify-center rounded-3xl bg-white px-8 py-16 text-center ring-1 ring-red-200">
          <div class="flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600">
            <ExclamationTriangleIcon class="size-7" aria-hidden="true" />
          </div>
          <h1 class="mt-6 text-base font-semibold text-gray-900">We couldn't load this price</h1>
          <p v-if="failureMessage" class="mt-2 max-w-md text-sm text-gray-500">{{ failureMessage }}</p>
          <p v-else class="mt-2 max-w-md text-sm text-gray-500">Something went wrong on our side. Please try again in a moment.</p>
          <button
              type="button"
              @click="load"
              class="mt-6 cursor-pointer rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-0"
          >Try again</button>
        </div>
        <template v-else-if="quote">
          <!-- Countdown -->
          <div :class="[
            isRunningOut ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-gray-200 bg-white text-gray-600',
            'flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-2xl border px-5 py-3',
          ]">
            <p class="flex items-center gap-2 text-sm font-medium">
              <ClockIcon class="size-4 shrink-0" aria-hidden="true" />
              This price is held for you
            </p>
            <p v-if="countdown" class="text-sm font-semibold tabular-nums">{{ countdown }} left</p>
          </div>
          <!-- Hotel -->
          <header class="mt-4 rounded-3xl bg-white p-5 ring-1 ring-gray-200">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 class="text-xl font-semibold tracking-tight text-gray-900">{{ quote.hotel?.name }}</h1>
              <HotelRating :stars="quote.hotel?.starRating" />
            </div>
            <p v-if="quote.hotel?.address" class="mt-1.5 flex items-start gap-1.5 text-sm text-gray-500">
              <MapPinIcon class="mt-0.5 size-4 shrink-0 text-gray-400" aria-hidden="true" />
              <span>{{ quote.hotel.address }}</span>
            </p>
            <div class="mt-4 space-y-2 border-t border-gray-100 pt-4 text-sm">
              <p v-if="stay" class="flex items-start gap-2 text-gray-700">
                <CalendarDaysIcon class="mt-0.5 size-4 shrink-0 text-gray-400" aria-hidden="true" />
                <span>
                  {{ stay }}
                  <span v-if="quote.nights" class="text-gray-400">· {{ quote.nights }} night{{ quote.nights === 1 ? '' : 's' }}</span>
                </span>
              </p>
              <p v-if="guests.length" class="flex items-start gap-2 text-gray-700">
                <UserGroupIcon class="mt-0.5 size-4 shrink-0 text-gray-400" aria-hidden="true" />
                <span>{{ guests.join(' · ') }}</span>
              </p>
            </div>
            <div v-if="quote.room" class="mt-4 border-t border-gray-100 pt-4">
              <p class="text-xs font-medium tracking-wide text-gray-400 uppercase">Your room</p>
              <p class="mt-1 text-sm font-medium text-gray-900">{{ quote.room.roomName }}</p>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <HotelMealBadge :meal="quote.room.meal" :labels="quote.labels" />
                <HotelCancellationBadge :cancellation="quote.cancellation" />
              </div>
            </div>
          </header>
          <!-- Price -->
          <section class="mt-4 overflow-hidden rounded-3xl bg-white ring-1 ring-gray-200">
            <header class="border-b border-gray-100 px-5 py-4">
              <h2 class="text-sm font-semibold text-gray-900">Your price</h2>
            </header>
            <dl class="divide-y divide-gray-100">
              <div v-for="line in quote.breakdown" :key="line.key" class="flex items-baseline justify-between gap-4 px-5 py-3">
                <dt class="min-w-0 text-sm text-gray-500">{{ line.label }}</dt>
                <dd class="shrink-0 text-sm text-gray-900 tabular-nums">{{ line.amount.currencyPrefixed }}</dd>
              </div>
              <div class="flex items-baseline justify-between gap-4 bg-gray-50/70 px-5 py-3">
                <dt class="text-sm font-semibold text-gray-900">Total</dt>
                <dd class="text-right">
                  <span class="block text-base font-semibold text-gray-900 tabular-nums">{{ quote.total.currencyPrefixed }}</span>
                  <span v-if="quote.perNight.isStated" class="mt-0.5 block text-xs font-normal text-gray-500">{{ quote.perNight.currencyPrefixed }} / night</span>
                </dd>
              </div>
            </dl>
            <!-- Not part of the total: the hotel collects this on arrival. -->
            <p v-if="quote.payableAtProperty.isStated" class="border-t border-gray-100 px-5 py-3 text-sm text-amber-700">
              Plus {{ quote.payableAtProperty.currencyPrefixed }} payable at the property
            </p>
          </section>
          <!-- What cancelling would give back, while the terms still say so. -->
          <section v-if="quote.cancellation?.refundNow?.isStated" class="mt-4 rounded-3xl bg-white p-5 ring-1 ring-gray-200">
            <h2 class="text-sm font-semibold text-gray-900">If you cancel</h2>
            <dl class="mt-3 space-y-2 text-sm">
              <div class="flex items-baseline justify-between gap-3">
                <dt class="text-gray-500">Cancelling now would cost</dt>
                <dd class="font-medium text-gray-900 tabular-nums">{{ quote.cancellation.costsNow.currencyPrefixed }}</dd>
              </div>
              <div class="flex items-baseline justify-between gap-3">
                <dt class="text-gray-500">You would get back</dt>
                <dd class="font-medium text-gray-900 tabular-nums">{{ quote.cancellation.refundNow.currencyPrefixed }}</dd>
              </div>
            </dl>
            <p class="mt-3 text-xs text-gray-400">Worked out fresh each time this page is opened, since it changes as your stay approaches.</p>
          </section>
          <!-- Who is staying, and how to reach them -->
          <GuestContactForm
              :rooms="quote.rooms"
              :is-submitting="isBooking"
              :submit-error="bookingError"
              :validation-errors="bookingValidation"
              @submit="book"
              class="mt-4"
          />
          <p v-if="quote.reference" class="mt-6 text-center text-xs text-gray-400">Reference {{ quote.reference }}</p>
        </template>
      </div>
    </main>
  </CustomerLayout>
</template>
