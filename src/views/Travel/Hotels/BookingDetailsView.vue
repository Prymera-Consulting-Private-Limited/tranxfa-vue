<script setup>
import {computed, onUnmounted, ref, watch} from 'vue';
import {onBeforeRouteLeave, RouterLink} from 'vue-router';
import CustomerLayout from "@/components/CustomerLayout.vue";
import Spinner from "@/components/Spinner.vue";
import HotelGallery from "@/views/Travel/Hotels/Partials/HotelGallery.vue";
import HotelRating from "@/views/Travel/Hotels/Partials/HotelRating.vue";
import HotelMealBadge from "@/views/Travel/Hotels/Partials/HotelMealBadge.vue";
import HotelSelectionCancellationBadge from "@/views/Travel/Hotels/Partials/HotelSelectionCancellationBadge.vue";
import HotelAvailability from "@/views/Travel/Hotels/Partials/HotelAvailability.vue";
import HotelAmenities from "@/views/Travel/Hotels/Partials/HotelAmenities.vue";
import Processing from "@/components/Payment/State/Processing.vue";
import PaymentCompleted from "@/components/Payment/State/PaymentCompleted.vue";
import Failed from "@/components/Payment/State/Failed.vue";
import {formatAmount, prettifyLabel, useHotelUtils} from "@/composables/travel/hotels/hotel_utils.js";
import HotelBooking from "@/models/travel/hotels/hotel_booking.js";
import {ChevronLeftIcon, ExclamationTriangleIcon, MapPinIcon, UserIcon, UsersIcon} from "@heroicons/vue/24/outline";

const props = defineProps({
  attemptId: {
    type: String,
    required: true,
  },
});

const {getBookingAttempt} = useHotelUtils();

/**
 * @type {import('vue').Ref<HotelBooking|null>}
 */
const attempt = ref(null);

const isLoading = ref(false);
const hasFailed = ref(false);

/**
 * @type {import('vue').Ref<'load'|'forbidden'|'notFound'>}
 */
const failReason = ref('load');

const FAIL_MESSAGES = {
  load: {
    title: "We couldn't load this booking",
    description: 'Something went wrong while contacting our travel partner. Please try again in a moment.',
  },
  forbidden: {
    title: "This booking isn't available",
    description: "This booking attempt doesn't belong to your account. Please start a new search.",
  },
  notFound: {
    title: 'This booking no longer exists',
    description: 'It may have expired, or the link is out of date. Please start a new search to book again.',
  },
};

const failMessage = computed(() => FAIL_MESSAGES[failReason.value]);

async function loadPage() {
  isLoading.value = true;
  hasFailed.value = false;
  failReason.value = 'load';
  attempt.value = null;
  unsubscribeFromConfirmation();
  timedOut.value = false;

  await getBookingAttempt(props.attemptId).then((response) => {
    attempt.value = HotelBooking.getInstance(response.data);

    if (isConfirming.value) {
      subscribeToConfirmation();
    }
  }).catch((error) => {
    hasFailed.value = true;
    failReason.value = error.response?.status === 403 ? 'forbidden' : (error.response?.status === 404 ? 'notFound' : 'load');
  }).finally(() => {
    isLoading.value = false;
  });
}

const quote = computed(() => attempt.value?.quote ?? null);

// Landing here means guest details are in and payment has gone through — the
// hotel confirmation itself still runs on our end asynchronously, anywhere
// from a few seconds to a couple of minutes, so anything short of a final
// outcome is "still confirming" rather than a step of its own.
const attemptStatus = computed(() => attempt.value?.status ?? null);
const isConfirming = computed(() => attemptStatus.value !== null && attemptStatus.value !== 'confirmed' && attemptStatus.value !== 'failed');

// Doesn't fire until the backend's own worst-case window has had a real
// chance to finish, so this reads as "still working on it", not "broken".
const CONFIRMATION_TIMEOUT_MS = 150000;

const timedOut = ref(false);
let confirmationTimer = null;
let subscribedAttemptId = null;

function subscribeToConfirmation() {
  if (!attempt.value || subscribedAttemptId === attempt.value.id) {
    return;
  }

  subscribedAttemptId = attempt.value.id;

  Echo.private(`booking-attempts.${subscribedAttemptId}`)
      .listen('.booking.confirmed', (data) => {
        attempt.value = HotelBooking.getInstance(data);
        unsubscribeFromConfirmation();
      })
      .listen('.booking.failed', (data) => {
        attempt.value = HotelBooking.getInstance(data);
        unsubscribeFromConfirmation();
      });

  confirmationTimer = setTimeout(() => {
    timedOut.value = true;
  }, CONFIRMATION_TIMEOUT_MS);
}

function unsubscribeFromConfirmation() {
  if (subscribedAttemptId) {
    Echo.leave(`booking-attempts.${subscribedAttemptId}`);
    subscribedAttemptId = null;
  }

  clearTimeout(confirmationTimer);
  confirmationTimer = null;
}

onUnmounted(unsubscribeFromConfirmation);

// The confirmation is already running on our end regardless of this tab, but
// closing or refreshing mid-wait just makes the customer think it was lost.
function warnBeforeUnload(event) {
  event.preventDefault();
  event.returnValue = '';
}

watch(() => isConfirming.value && !timedOut.value, (shouldWarn) => {
  window.removeEventListener('beforeunload', warnBeforeUnload);

  if (shouldWarn) {
    window.addEventListener('beforeunload', warnBeforeUnload);
  }
}, {immediate: true});

onUnmounted(() => window.removeEventListener('beforeunload', warnBeforeUnload));

onBeforeRouteLeave(() => {
  if (isConfirming.value && !timedOut.value) {
    return window.confirm("Your booking is still being confirmed with the hotel. Leave this page anyway?");
  }
});

// Declared last so it can call subscribeToConfirmation/unsubscribeFromConfirmation
// above, and run as an immediate watcher only once everything it touches exists.
watch(() => props.attemptId, loadPage, {immediate: true});

const hotelLocation = computed(() => {
  const hotel = quote.value?.hotel;

  if (!hotel) {
    return null;
  }

  return [
    hotel.address,
    [hotel.region?.name, hotel.region?.country?.commonName].filter(Boolean).join(', '),
  ].filter(Boolean).join(' · ');
});

const roomName = computed(() => quote.value?.rate?.roomData?.mainRoomType || quote.value?.rate?.roomName || null);

const roomFeatures = computed(() => {
  const rate = quote.value?.rate;

  if (!rate) {
    return [];
  }

  const features = [];

  if (rate.rgExt?.bedrooms) {
    features.push(`${rate.rgExt.bedrooms} bedroom${rate.rgExt.bedrooms === 1 ? '' : 's'}`);
  }

  if (rate.roomData?.beddingType) {
    features.push(prettifyLabel(rate.roomData.beddingType));
  }

  return features;
});

const capacity = computed(() => quote.value?.rate?.rgExt?.capacity ?? null);

const roomNote = computed(() => quote.value?.rate?.roomData?.miscRoomType ?? null);

const amount = computed(() => (quote.value ? formatAmount(quote.value.price.amount) : null));

// A guest with neither name saved is still shown as a slot, rather than
// silently dropped, so the room's occupancy still reads as complete.
function guestLabel(guest, index) {
  if (guest.firstName || guest.lastName) {
    return [guest.firstName, guest.lastName].filter(Boolean).join(' ');
  }

  return guest.isChild ? `Child ${index + 1}` : `Adult ${index + 1}`;
}
</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 pb-12 bg-gray-50">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <!-- Hidden while confirming — there is nothing left to edit, and this -->
        <!-- isn't a moment to invite the customer to navigate away. -->
        <RouterLink
            v-if="!isConfirming"
            :to="{name: 'hotelBooking', params: {id: attemptId}}"
            class="inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition hover:text-gray-900"
        >
          <ChevronLeftIcon class="size-4" aria-hidden="true" />
          Edit guest details
        </RouterLink>
        <!-- Loading -->
        <div v-if="isLoading" class="mt-3 flex items-center justify-center rounded-3xl bg-white py-24 ring-1 ring-gray-200">
          <Spinner class="size-12" />
        </div>
        <!-- Failed -->
        <div v-else-if="hasFailed" class="mt-3 flex flex-col items-center justify-center rounded-3xl bg-white px-8 py-16 text-center ring-1 ring-red-200">
          <div class="flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600">
            <ExclamationTriangleIcon class="size-7" aria-hidden="true" />
          </div>
          <h2 class="mt-6 text-base font-semibold text-gray-900">{{ failMessage.title }}</h2>
          <p class="mt-2 max-w-md text-sm text-gray-500">{{ failMessage.description }}</p>
          <button
              v-if="failReason === 'load'"
              type="button"
              @click="loadPage"
              class="mt-6 cursor-pointer rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-0"
          >Try again</button>
          <RouterLink
              v-else
              :to="{name: 'hotels'}"
              class="mt-6 inline-flex cursor-pointer items-center rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-0"
          >Back to search</RouterLink>
        </div>
        <!-- Booking -->
        <template v-else-if="attempt">
          <!-- Confirming — the hotel confirmation runs on our end asynchronously, -->
          <!-- so this is the live wait state rather than a static message. -->
          <div v-if="isConfirming" class="mt-3 flex flex-col items-center justify-center rounded-3xl bg-white px-8 py-14 text-center ring-1 ring-gray-200">
            <Processing class="size-48" />
            <h2 class="mt-2 text-lg font-semibold text-gray-900">Confirming your booking</h2>
            <template v-if="!timedOut">
              <p class="mt-2 max-w-md text-sm text-gray-500">We're finalising this reservation with the hotel — this can take anywhere from a few seconds up to a couple of minutes.</p>
              <p class="mt-3 text-xs font-medium text-amber-600">Please don't close or refresh this page.</p>
            </template>
            <p v-else class="mt-2 max-w-md text-sm text-gray-500">This is taking longer than expected. We'll keep confirming in the background and update you here or by email — feel free to leave this page and check back later.</p>
          </div>
          <!-- Confirmed -->
          <div v-else-if="attemptStatus === 'confirmed'" class="mt-3 flex flex-col items-center justify-center rounded-3xl bg-white px-8 py-14 text-center ring-1 ring-gray-200">
            <PaymentCompleted class="size-48" />
            <h2 class="mt-2 text-lg font-semibold text-gray-900">Booking confirmed</h2>
            <p class="mt-2 max-w-md text-sm text-gray-500">Your reservation is confirmed with the hotel. A confirmation has been sent to your email.</p>
            <RouterLink
                :to="{name: 'hotels'}"
                class="mt-6 inline-flex cursor-pointer items-center rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-0"
            >Book another stay</RouterLink>
          </div>
          <!-- Failed — a real possible outcome once availability/pricing has -->
          <!-- shifted since search, not a bug to apologise for. -->
          <div v-else-if="attemptStatus === 'failed'" class="mt-3 flex flex-col items-center justify-center rounded-3xl bg-white px-8 py-14 text-center ring-1 ring-red-200">
            <Failed class="size-48" />
            <h2 class="mt-2 text-lg font-semibold text-gray-900">We couldn't confirm this booking</h2>
            <p class="mt-2 max-w-md text-sm text-gray-500">The hotel couldn't confirm this reservation, most likely because availability or pricing changed. Please search again for a fresh quote.</p>
            <RouterLink
                :to="{name: 'hotels'}"
                class="mt-6 inline-flex cursor-pointer items-center rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-0"
            >Search again</RouterLink>
          </div>
          <div class="mt-6 lg:grid lg:grid-cols-3 lg:items-start lg:gap-6">
            <div class="space-y-6 lg:col-span-2">
              <HotelGallery v-if="quote?.hotel" :photos="quote.hotel.photos" :name="quote.hotel.name" />
              <!-- Guests -->
              <section class="rounded-2xl bg-white p-5 ring-1 ring-gray-200 sm:p-6">
                <h2 class="text-base font-semibold text-gray-900">Guests</h2>
                <div class="mt-4 divide-y divide-gray-100">
                  <div v-for="(room, roomIndex) in attempt.rooms" :key="room.id" :class="[roomIndex ? 'pt-4' : '', 'pb-4']">
                    <h3 class="text-xs font-semibold tracking-wide text-gray-500 uppercase">Room {{ roomIndex + 1 }}</h3>
                    <ul class="mt-2 space-y-1.5">
                      <li v-for="(guest, guestIndex) in room.guests" :key="guest.id" class="flex items-center gap-1.5 text-sm text-gray-900">
                        <UserIcon class="size-3.5 shrink-0 text-gray-400" aria-hidden="true" />
                        {{ guestLabel(guest, guestIndex) }}
                        <span v-if="guest.isChild" class="text-xs text-gray-400">(child{{ guest.age !== null ? `, ${guest.age}` : '' }})</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </section>
            </div>
            <!-- Hotel, room -->
            <aside class="mt-6 space-y-4 lg:col-span-1 lg:mt-0 lg:sticky lg:top-6">
              <div v-if="quote?.hotel" class="rounded-2xl bg-white p-5 ring-1 ring-gray-200">
                <span v-if="quote.hotel.starRating" class="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 ring-1 ring-amber-100 ring-inset">
                  <HotelRating :stars="quote.hotel.starRating" />
                </span>
                <h1 class="mt-2 text-base font-semibold tracking-tight text-gray-900">{{ quote.hotel.name }}</h1>
                <p v-if="hotelLocation" class="mt-1 flex items-start gap-1 text-xs text-gray-500">
                  <MapPinIcon class="mt-0.5 size-3.5 shrink-0 text-gray-400" aria-hidden="true" />
                  <span>{{ hotelLocation }}</span>
                </p>
              </div>
              <section class="rounded-2xl bg-white p-5 ring-1 ring-gray-200">
                <h2 class="text-xs font-semibold tracking-wide text-gray-400 uppercase">Your room</h2>
                <h3 v-if="roomName" class="mt-1 text-sm font-semibold tracking-tight text-gray-900">{{ roomName }}</h3>
                <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                  <span v-if="capacity" class="inline-flex items-center gap-1">
                    <UsersIcon class="size-3.5 text-gray-400" aria-hidden="true" />
                    Sleeps {{ capacity }}
                  </span>
                  <template v-for="(feature, position) in roomFeatures" :key="feature">
                    <span v-if="capacity || position" class="text-gray-300" aria-hidden="true">&middot;</span>
                    <span>{{ feature }}</span>
                  </template>
                </div>
                <div class="mt-3 flex flex-wrap items-center gap-2">
                  <HotelMealBadge :meal-type="quote?.rate?.mealType" />
                  <HotelSelectionCancellationBadge :cancellation="quote?.cancellation" />
                  <HotelAvailability :allotment="quote?.rate?.allotment" />
                </div>
                <HotelAmenities v-if="quote?.rate?.amenities?.length" :amenities="quote.rate.amenities" class="mt-3" />
                <p v-if="roomNote" class="mt-3 text-xs text-gray-400">{{ prettifyLabel(roomNote) }}</p>
                <div class="mt-4 border-t border-gray-100 pt-4">
                  <p class="text-xs font-semibold tracking-wide text-gray-400 uppercase">Total price</p>
                  <p class="mt-1.5 flex items-baseline gap-1.5">
                    <span class="text-sm font-medium text-gray-500">{{ quote?.price?.currency }}</span>
                    <span class="text-3xl font-semibold tracking-tight text-gray-900 tabular-nums">{{ amount }}</span>
                  </p>
                </div>
              </section>
            </aside>
          </div>
        </template>
      </div>
    </main>
  </CustomerLayout>
</template>
