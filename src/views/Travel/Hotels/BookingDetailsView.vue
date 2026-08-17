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
import {CONFIRMATION_POLL_MS} from "@/composables/travel/order_utils.js";
import HotelBooking from "@/models/travel/hotels/hotel_booking.js";
import {EnvelopeIcon, ExclamationTriangleIcon, MapPinIcon, UserIcon, UsersIcon} from "@heroicons/vue/24/outline";

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
  stopWatchingConfirmation();
  startedWaitingAt = Date.now();
  timedOut.value = false;

  await refreshAttempt();
}

/**
 * @param {boolean} quiet A poll leaves what is on screen alone rather than
 * flashing the whole page back to its skeleton every few seconds.
 */
async function refreshAttempt(quiet = false) {
  await getBookingAttempt(props.attemptId).then((response) => {
    attempt.value = HotelBooking.getInstance(response.data);

    watchConfirmation();
  }).catch((error) => {
    // A poll that fails is not worth tearing the page down for — the next one
    // may well succeed, and the confirmation is running regardless.
    if (quiet) {
      watchConfirmation();

      return;
    }

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
let startedWaitingAt = null;

/**
 * The confirmation is asked for rather than announced. This page originally
 * listened on a private booking-attempts channel for booking.confirmed and
 * booking.failed, but no such broadcast exists anywhere on the backend and none
 * ever fired — so the wait never ended on its own. Polling is the mechanism,
 * not a fallback for it.
 */
function watchConfirmation() {
  clearTimeout(confirmationTimer);
  confirmationTimer = null;

  if (!isConfirming.value) {
    return;
  }

  if (startedWaitingAt !== null && Date.now() - startedWaitingAt >= CONFIRMATION_TIMEOUT_MS) {
    timedOut.value = true;
  }

  // Kept running past the timeout: the message changes to say it is taking
  // longer than usual, but the answer is still worth catching when it lands.
  confirmationTimer = setTimeout(() => refreshAttempt(true), CONFIRMATION_POLL_MS);
}

function stopWatchingConfirmation() {
  clearTimeout(confirmationTimer);
  confirmationTimer = null;
}

onUnmounted(stopWatchingConfirmation);

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

// Declared last so it can call watchConfirmation/stopWatchingConfirmation
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

/**
 * Nameless slots return nothing so the avatar can fall back to a neutral
 * icon rather than faking initials for a guest we know nothing about.
 *
 * @param {{firstName: string|null, lastName: string|null}} guest
 * @returns {string|null}
 */
function guestInitials(guest) {
  const initials = [guest.firstName, guest.lastName]
      .filter(Boolean)
      .map(name => name.charAt(0).toUpperCase())
      .join('');

  return initials || null;
}
</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 pb-12 bg-gray-50">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <!-- No back link on purpose: by the time this page is reached the
        attempt is past guest collection, so there is nothing behind it to go
        back and change — the final states carry their own forward CTA. -->
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
          <!-- so this is the live wait state rather than a static message. The -->
          <!-- negative margins crop the Lottie's own generous whitespace. -->
          <div v-if="isConfirming" class="mt-3 flex flex-col items-center rounded-3xl bg-white px-8 pb-10 pt-6 text-center ring-1 ring-gray-200">
            <Processing class="-my-12" />
            <h2 class="text-xl font-semibold tracking-tight text-gray-900">Confirming your booking</h2>
            <template v-if="!timedOut">
              <p class="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500">
                We're finalising your reservation{{ quote?.hotel ? ` with ${quote.hotel.name}` : '' }} — this usually takes a few seconds, occasionally a couple of minutes.
              </p>
              <div class="mt-5 flex items-center gap-1.5" aria-hidden="true">
                <span class="size-1.5 animate-bounce rounded-full bg-brand-600" />
                <span class="size-1.5 animate-bounce rounded-full bg-brand-600 [animation-delay:0.15s]" />
                <span class="size-1.5 animate-bounce rounded-full bg-brand-600 [animation-delay:0.3s]" />
              </div>
              <p class="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-1.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                <span class="relative flex size-2" aria-hidden="true">
                  <span class="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span class="relative inline-flex size-2 rounded-full bg-amber-500" />
                </span>
                Please keep this page open
              </p>
            </template>
            <template v-else>
              <p class="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500">
                This is taking longer than expected, but your booking is still being confirmed in the background.
              </p>
              <p class="mt-5 inline-flex items-center gap-2 rounded-full bg-gray-50 px-4 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-200">
                <EnvelopeIcon class="size-3.5" aria-hidden="true" />
                We'll update you here or by email — it's safe to leave this page.
              </p>
            </template>
          </div>
          <!-- Confirmed -->
          <div v-else-if="attemptStatus === 'confirmed'" class="mt-3 flex flex-col items-center rounded-3xl bg-white px-8 pb-10 pt-6 text-center ring-1 ring-gray-200">
            <PaymentCompleted class="-my-12" />
            <h2 class="text-xl font-semibold tracking-tight text-gray-900">Booking confirmed</h2>
            <p class="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500">
              {{ quote?.hotel ? `${quote.hotel.name} has` : 'The hotel has' }} confirmed your reservation. A confirmation email is on its way to you.
            </p>
            <RouterLink
                :to="{name: 'hotels'}"
                class="mt-6 inline-flex cursor-pointer items-center rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-0"
            >Book another stay</RouterLink>
          </div>
          <!-- Failed — a real possible outcome once availability/pricing has -->
          <!-- shifted since search, not a bug to apologise for. -->
          <div v-else-if="attemptStatus === 'failed'" class="mt-3 flex flex-col items-center rounded-3xl bg-white px-8 pb-10 pt-6 text-center ring-1 ring-red-200">
            <Failed class="-my-12" />
            <h2 class="text-xl font-semibold tracking-tight text-gray-900">We couldn't confirm this booking</h2>
            <p class="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500">
              The hotel couldn't confirm this reservation, most likely because availability or pricing changed. You haven't been charged — search again for a fresh quote.
            </p>
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
                <div class="flex items-center gap-2">
                  <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                    <UsersIcon class="size-4" aria-hidden="true" />
                  </span>
                  <h2 class="text-base font-semibold text-gray-900">Guests</h2>
                </div>
                <div class="mt-4 divide-y divide-gray-100">
                  <div v-for="(room, roomIndex) in attempt.rooms" :key="room.id" :class="[roomIndex ? 'pt-5' : '', 'pb-5']">
                    <h3 class="text-xs font-semibold tracking-wide text-gray-500 uppercase">Room {{ roomIndex + 1 }}</h3>
                    <ul class="mt-3 space-y-2.5">
                      <li v-for="(guest, guestIndex) in room.guests" :key="guest.id" class="flex items-center gap-3">
                        <span v-if="guestInitials(guest)" class="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">{{ guestInitials(guest) }}</span>
                        <span v-else class="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                          <UserIcon class="size-4" aria-hidden="true" />
                        </span>
                        <span class="min-w-0">
                          <span class="block truncate text-sm font-medium text-gray-900">{{ guestLabel(guest, guestIndex) }}</span>
                          <span class="block text-xs text-gray-400">{{ guest.isChild ? (guest.age !== null ? `Child · ${guest.age} years` : 'Child') : 'Adult' }}</span>
                        </span>
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
                  <HotelMealBadge :meal="quote?.rate?.mealType" />
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
