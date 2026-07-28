<script setup>
import {computed, onMounted, onUnmounted, ref} from 'vue';
import {RouterLink} from 'vue-router';
import moment from "moment";
import CustomerLayout from "@/components/CustomerLayout.vue";
import Spinner from "@/components/Spinner.vue";
import HotelGallery from "@/views/Travel/Hotels/Partials/HotelGallery.vue";
import HotelRating from "@/views/Travel/Hotels/Partials/HotelRating.vue";
import HotelMealBadge from "@/views/Travel/Hotels/Partials/HotelMealBadge.vue";
import HotelSelectionCancellationBadge from "@/views/Travel/Hotels/Partials/HotelSelectionCancellationBadge.vue";
import HotelAvailability from "@/views/Travel/Hotels/Partials/HotelAvailability.vue";
import HotelAmenities from "@/views/Travel/Hotels/Partials/HotelAmenities.vue";
import {formatAmount, prettifyLabel, useHotelUtils} from "@/composables/travel/hotels/hotel_utils.js";
import HotelQuote from "@/models/travel/hotels/hotel_quote.js";
import {ChevronLeftIcon, ClockIcon, ExclamationTriangleIcon, MapPinIcon, UsersIcon} from "@heroicons/vue/24/outline";

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  // A repeated ?search= arrives as an array, which is not an id.
  search: {
    type: String,
    default: null,
  },
});

const {getHotelQuote} = useHotelUtils();

/**
 * @type {import('vue').Ref<HotelQuote|null>}
 */
const quote = ref(null);

const isLoading = ref(false);
const hasFailed = ref(false);

async function loadQuote() {
  isLoading.value = true;
  hasFailed.value = false;

  await getHotelQuote(props.id).then((response) => {
    quote.value = HotelQuote.getInstance(response.data);
  }).catch(() => {
    quote.value = null;
    hasFailed.value = true;
  }).finally(() => {
    isLoading.value = false;
  });
}

onMounted(loadQuote);

// Ticks the countdown against the hold's own expiry rather than a fixed
// duration, so it stays correct even if loading the quote took a while.
const now = ref(Date.now());
let countdownTimer = null;

onMounted(() => {
  countdownTimer = setInterval(() => {
    now.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  clearInterval(countdownTimer);
});

const remainingSeconds = computed(() => {
  if (!quote.value?.expiresAt) {
    return null;
  }

  return Math.floor((moment(quote.value.expiresAt).valueOf() - now.value) / 1000);
});

const countdownLabel = computed(() => {
  if (remainingSeconds.value === null) {
    return null;
  }

  if (remainingSeconds.value <= 0) {
    return 'Expired';
  }

  const minutes = Math.floor(remainingSeconds.value / 60);
  const seconds = remainingSeconds.value % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
});

const isExpired = computed(() => remainingSeconds.value !== null && remainingSeconds.value <= 0);

/**
 * Ordered loosest-first so the first threshold the remaining time still
 * clears wins; anything left over (including expired) falls through to red.
 */
const HOLD_ALERT_THRESHOLDS = [
    {seconds: 10 * 60, level: 'green'},
    {seconds: 5 * 60, level: 'blue'},
    {seconds: 3 * 60, level: 'yellow'},
];

const HOLD_ALERT_STYLES = {
  green: {wrap: 'bg-emerald-50 text-emerald-800 ring-emerald-200', iconWrap: 'bg-emerald-100 text-emerald-600', icon: ClockIcon},
  blue: {wrap: 'bg-blue-50 text-blue-800 ring-blue-200', iconWrap: 'bg-blue-100 text-blue-600', icon: ClockIcon},
  yellow: {wrap: 'bg-amber-50 text-amber-800 ring-amber-200', iconWrap: 'bg-amber-100 text-amber-600', icon: ExclamationTriangleIcon},
  red: {wrap: 'bg-red-50 text-red-800 ring-red-200', iconWrap: 'bg-red-100 text-red-600', icon: ExclamationTriangleIcon},
};

const holdAlertLevel = computed(() => {
  if (remainingSeconds.value === null) {
    return 'green';
  }

  const match = HOLD_ALERT_THRESHOLDS.find(entry => remainingSeconds.value > entry.seconds);

  return match?.level ?? 'red';
});

const holdAlertStyle = computed(() => HOLD_ALERT_STYLES[holdAlertLevel.value]);

const holdAlertMessage = computed(() => {
  if (isExpired.value) {
    return {
      title: 'Reservation expired',
      description: 'This price is no longer held. Please search again for a fresh quote.',
    };
  }

  switch (holdAlertLevel.value) {
    case 'green':
      return {
        title: "You're all set",
        description: `This price is held — complete your booking before ${holdExpiry.value}.`,
      };
    case 'blue':
      return {
        title: 'Your room is reserved',
        description: `Complete your booking before ${holdExpiry.value}.`,
      };
    case 'yellow':
      return {
        title: 'Time is running out',
        description: `Only a few minutes left on this rate — complete your booking before ${holdExpiry.value}.`,
      };
    default:
      return {
        title: 'Hurry, almost out of time',
        description: 'This reservation is about to expire. Complete your booking now.',
      };
  }
});

// One line, the same way the hotel page's own heading collapses it.
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

const roomName = computed(() => {
  return quote.value?.rate?.roomData?.mainRoomType || quote.value?.rate?.roomName || null;
});

// Room facts stated plainly, the same way the room card on the hotel page does.
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

const holdExpiry = computed(() => {
  return quote.value ? moment(quote.value.expiresAt).format('D MMM, h:mm A') : null;
});

// Once the hotel is known, back means "change room" rather than the search
// results this booking was several steps removed from.
const backLink = computed(() => {
  const hotel = quote.value?.hotel;

  if (!hotel) {
    return {name: 'hotels'};
  }

  return {
    name: 'viewHotel',
    params: {id: hotel.id, slug: hotel.slug},
    query: {search: props.search ?? undefined},
  };
});

const backLabel = computed(() => (quote.value?.hotel ? 'Change room' : 'Back to hotels'));
</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 pb-12 bg-gray-50">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <RouterLink :to="backLink" class="inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition hover:text-gray-900">
          <ChevronLeftIcon class="size-4" aria-hidden="true" />
          {{ backLabel }}
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
          <h2 class="mt-6 text-base font-semibold text-gray-900">We couldn't load your quote</h2>
          <p class="mt-2 max-w-md text-sm text-gray-500">Something went wrong while contacting our travel partner. Please try again in a moment.</p>
          <button
              type="button"
              @click="loadQuote"
              class="mt-6 cursor-pointer rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-0"
          >Try again</button>
        </div>
        <!-- Quote -->
        <template v-else-if="quote">
          <!-- Hold countdown, full width so it reads as a status banner rather than a sidebar detail -->
          <div :class="[holdAlertStyle.wrap, 'mt-3 flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4 ring-1 ring-inset']">
            <div class="flex items-center gap-3">
              <span :class="[holdAlertStyle.iconWrap, 'flex size-10 shrink-0 items-center justify-center rounded-full']">
                <component :is="holdAlertStyle.icon" class="size-5" aria-hidden="true" />
              </span>
              <div>
                <p class="text-sm font-semibold">{{ holdAlertMessage.title }}</p>
                <p class="text-xs opacity-80">{{ holdAlertMessage.description }}</p>
              </div>
            </div>
            <p v-if="countdownLabel" class="text-xl font-semibold tabular-nums">{{ countdownLabel }}</p>
          </div>
          <div class="mt-6 lg:grid lg:grid-cols-3 lg:items-start lg:gap-6">
            <!-- Gallery -->
            <div class="lg:col-span-2">
              <HotelGallery v-if="quote.hotel" :photos="quote.hotel.photos" :name="quote.hotel.name" />
            </div>
            <!-- Hotel, room -->
            <aside class="mt-6 space-y-4 lg:col-span-1 lg:mt-0 lg:sticky lg:top-6">
              <!-- Hotel -->
              <div v-if="quote.hotel" class="rounded-2xl bg-white p-5 ring-1 ring-gray-200">
                <span v-if="quote.hotel.starRating" class="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 ring-1 ring-amber-100 ring-inset">
                  <HotelRating :stars="quote.hotel.starRating" />
                </span>
                <h1 class="mt-2 text-base font-semibold tracking-tight text-gray-900">{{ quote.hotel.name }}</h1>
                <p v-if="hotelLocation" class="mt-1 flex items-start gap-1 text-xs text-gray-500">
                  <MapPinIcon class="mt-0.5 size-3.5 shrink-0 text-gray-400" aria-hidden="true" />
                  <span>{{ hotelLocation }}</span>
                </p>
              </div>
              <!-- Room, price and next step -->
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
                  <HotelMealBadge :meal-type="quote.rate?.mealType" />
                  <HotelSelectionCancellationBadge :cancellation="quote.cancellation" />
                  <HotelAvailability :allotment="quote.rate?.allotment" />
                </div>
                <HotelAmenities v-if="quote.rate?.amenities?.length" :amenities="quote.rate.amenities" class="mt-3" />
                <p v-if="roomNote" class="mt-3 text-xs text-gray-400">{{ prettifyLabel(roomNote) }}</p>
                <!-- Price -->
                <div class="mt-4 border-t border-gray-100 pt-4">
                  <p class="text-xs font-semibold tracking-wide text-gray-400 uppercase">Total price</p>
                  <p class="mt-1.5 flex items-baseline gap-1.5">
                    <span class="text-sm font-medium text-gray-500">{{ quote.price.currency }}</span>
                    <span class="text-3xl font-semibold tracking-tight text-gray-900 tabular-nums">{{ amount }}</span>
                  </p>
                  <p v-if="quote.priceChanged" class="mt-2 text-xs text-amber-600">The price changed when we confirmed availability.</p>
                  <!-- Not wired up yet — the ETG booking-start call this hands off to hasn't been specified. -->
                  <button
                      type="button"
                      :disabled="isExpired"
                      class="mt-4 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-0 disabled:cursor-not-allowed disabled:opacity-60"
                  >{{ isExpired ? 'Reservation expired' : 'Continue Booking' }}</button>
                </div>
              </section>
            </aside>
          </div>
        </template>
      </div>
    </main>
  </CustomerLayout>
</template>
