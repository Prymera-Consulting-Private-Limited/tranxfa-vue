<script setup>
import {computed, onMounted, onUnmounted, ref, watch} from 'vue';
import {RouterLink, useRouter} from 'vue-router';
import moment from "moment";
import CustomerLayout from "@/components/CustomerLayout.vue";
import Spinner from "@/components/Spinner.vue";
import HotelGallery from "@/views/Travel/Hotels/Partials/HotelGallery.vue";
import HotelRating from "@/views/Travel/Hotels/Partials/HotelRating.vue";
import HotelMealBadge from "@/views/Travel/Hotels/Partials/HotelMealBadge.vue";
import HotelSelectionCancellationBadge from "@/views/Travel/Hotels/Partials/HotelSelectionCancellationBadge.vue";
import HotelAvailability from "@/views/Travel/Hotels/Partials/HotelAvailability.vue";
import HotelAmenities from "@/views/Travel/Hotels/Partials/HotelAmenities.vue";
import PriceChangeDialog from "@/views/Travel/Hotels/Partials/PriceChangeDialog.vue";
import GuestDetailsForm from "@/views/Travel/Hotels/Partials/GuestDetailsForm.vue";
import {formatAmount, getGuestBreakdown, prettifyLabel, useHotelUtils} from "@/composables/travel/hotels/hotel_utils.js";
import HotelQuote from "@/models/travel/hotels/hotel_quote.js";
import HotelBooking from "@/models/travel/hotels/hotel_booking.js";
import {CheckCircleIcon, ChevronLeftIcon, ClockIcon, ExclamationTriangleIcon, MapPinIcon, UsersIcon} from "@heroicons/vue/24/outline";

const props = defineProps({
  // Set on the quote route, before a booking attempt exists.
  quoteId: {
    type: String,
    default: null,
  },
  // Set on the booking route instead, once "book" has been accepted — its
  // own id, not the quote's, so a refresh here resumes the attempt rather
  // than landing back on "Continue Booking".
  attemptId: {
    type: String,
    default: null,
  },
  // A repeated ?search= arrives as an array, which is not an id.
  search: {
    type: String,
    default: null,
  },
});

const router = useRouter();

const {getHotelQuote, bookHotel, getBookingAttempt, saveBookingGuests} = useHotelUtils();

/**
 * @type {import('vue').Ref<HotelQuote|null>}
 */
const quote = ref(null);

const isLoading = ref(false);
const hasFailed = ref(false);

/**
 * What put the page into its failed state, so the "Failed" block can say
 * something more specific than a generic load error when it's actually a
 * hard 403/404 from a save made mid-flow.
 *
 * @type {import('vue').Ref<'load'|'forbidden'|'notFound'>}
 */
const failReason = ref('load');

const FAIL_MESSAGES = {
  load: {
    title: "We couldn't load your quote",
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

// ETG only flags a price change, it never re-asks — the customer has to see
// the new total and explicitly accept or walk away before booking can proceed.
const priceChangeConfirmed = ref(true);
const priceChangeDialogOpen = ref(false);

const isBooking = ref(false);
const bookingFailed = ref(false);

/**
 * Set once "book" is accepted — a booking attempt, not a finished
 * reservation, since its own status starts at "form_started" and still needs
 * guest details before it can be finished.
 *
 * @type {import('vue').Ref<HotelBooking|null>}
 */
const attempt = ref(null);

/**
 * Drives what shows once there is an attempt. Guest details can be saved and
 * revisited any number of times while the attempt stays "form_started" — there
 * is no submit past this yet, since payment and final booking submission
 * aren't built. Also what a refresh has to reconstruct from the attempt's own
 * status, since the attempt route carries no other state.
 *
 * @type {import('vue').Ref<'guestDetails'|'confirmed'|'failed'|null>}
 */
const attemptStep = ref(null);

// Mirrors GuestDetailsForm's own state, so the sidebar shows real names as
// soon as they're typed instead of just the room's adult/child counts.
const guestNameEntries = ref([]);

function resolveAttemptStep(status) {
  if (status === 'confirmed') {
    return 'confirmed';
  }

  if (status === 'failed') {
    return 'failed';
  }

  // Covers "form_started" and anything else short of a final outcome —
  // there's no in-between step of our own to land on yet.
  return 'guestDetails';
}

async function loadPage() {
  isLoading.value = true;
  hasFailed.value = false;
  failReason.value = 'load';
  attempt.value = null;
  attemptStep.value = null;
  guestNameEntries.value = [];

  if (props.attemptId) {
    await getBookingAttempt(props.attemptId).then((response) => {
      attempt.value = HotelBooking.getInstance(response.data);
      quote.value = attempt.value.quote;
      // The price-change gate only guards the "book" call itself — an
      // attempt existing at all means that call already went through.
      priceChangeConfirmed.value = true;
      priceChangeDialogOpen.value = false;
      attemptStep.value = resolveAttemptStep(attempt.value.status);
    }).catch(() => {
      quote.value = null;
      hasFailed.value = true;
    }).finally(() => {
      isLoading.value = false;
    });

    return;
  }

  await getHotelQuote(props.quoteId).then((response) => {
    quote.value = HotelQuote.getInstance(response.data);
    priceChangeConfirmed.value = !quote.value.priceChanged;
    priceChangeDialogOpen.value = quote.value.priceChanged;
  }).catch(() => {
    quote.value = null;
    hasFailed.value = true;
  }).finally(() => {
    isLoading.value = false;
  });
}

// A quote and an attempt are different pages sharing this component, so
// whichever id the route carries reloads it — the same way HotelView keys
// its watch off the route rather than assuming it's always mounting fresh.
watch([() => props.quoteId, () => props.attemptId], loadPage, {immediate: true});

/**
 * The single go-ahead to book, reached either by confirming a changed price
 * in the dialog or by clicking Continue Booking on an unchanged one — both
 * are the customer accepting the price the quote is currently showing.
 * Hands off to the booking route rather than swapping state in place, so the
 * attempt this creates is refreshable from the moment it exists.
 */
async function startBooking() {
  if (!quote.value || isBooking.value) {
    return;
  }

  priceChangeConfirmed.value = true;
  priceChangeDialogOpen.value = false;
  isBooking.value = true;
  bookingFailed.value = false;

  await bookHotel(quote.value.id).then((response) => {
    const newAttempt = HotelBooking.getInstance(response.data);

    router.push({name: 'hotelBooking', params: {id: newAttempt.id}, query: {search: props.search ?? undefined}});
  }).catch(() => {
    bookingFailed.value = true;
  }).finally(() => {
    isBooking.value = false;
  });
}

// Declining a changed price cancels the booking outright, per the ETG rule —
// there is nothing to fall back to at the old price, so this sends the
// customer back to pick a room again rather than re-showing the quote.
function cancelPriceChange() {
  priceChangeDialogOpen.value = false;
  router.push(backLink.value);
}

const isSavingGuests = ref(false);
const saveGuestsError = ref(null);

/**
 * The raw `errors` object off a 422, handed straight to GuestDetailsForm —
 * it already knows which guest was at which position in the request it just
 * sent, which is what a field error is actually keyed by.
 */
const validationErrors = ref(null);

const guestsSavedRecently = ref(false);
let savedIndicatorTimer = null;

/**
 * Callable any number of times while the attempt is still "form_started" —
 * each call only touches the guests it includes, so filling in one guest now
 * and the rest later both just work.
 *
 * @param {{guests: Array}} payload
 */
async function submitGuestDetails(payload) {
  if (!attempt.value || isSavingGuests.value) {
    return;
  }

  isSavingGuests.value = true;
  saveGuestsError.value = null;
  validationErrors.value = null;
  guestsSavedRecently.value = false;

  await saveBookingGuests(attempt.value.id, payload).then(() => {
    guestsSavedRecently.value = true;
    clearTimeout(savedIndicatorTimer);
    savedIndicatorTimer = setTimeout(() => {
      guestsSavedRecently.value = false;
    }, 4000);
  }).catch(async (error) => {
    const status = error.response?.status;

    // Field- and room-level messages, e.g. which room is still missing a
    // named adult — GuestDetailsForm attributes these itself, so there's no
    // single flat message to set here.
    if (status === 422) {
      validationErrors.value = error.response.data?.errors ?? null;
      return;
    }

    if (status === 409) {
      saveGuestsError.value = 'This booking has already moved past guest collection, so details can no longer be changed here.';

      // Whatever moved it on happened outside this tab, so re-fetch the
      // attempt to reflect its actual current status instead of guessing.
      await getBookingAttempt(attempt.value.id).then((response) => {
        attempt.value = HotelBooking.getInstance(response.data);
        attemptStep.value = resolveAttemptStep(attempt.value.status);
      }).catch(() => {});

      return;
    }

    // Shouldn't happen in normal use — the attempt not being ours or not
    // existing at all isn't something this form can recover from, so this
    // drops the whole page into its hard-failure state instead of an inline
    // message the customer could just retry past.
    if (status === 403) {
      hasFailed.value = true;
      failReason.value = 'forbidden';
      return;
    }

    if (status === 404) {
      hasFailed.value = true;
      failReason.value = 'notFound';
      return;
    }

    saveGuestsError.value = error.response?.data?.message ?? 'Something went wrong saving your guest details. Please try again.';
  }).finally(() => {
    isSavingGuests.value = false;
  });
}

onUnmounted(() => {
  clearTimeout(savedIndicatorTimer);
});

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

// One line per room, same formatting as the search/hotel-view sidebar.
const guestBreakdown = computed(() => getGuestBreakdown(quote.value?.guests ?? []));

function onGuestDetailsUpdate(rooms) {
  guestNameEntries.value = rooms;
}

// Falls back to the count breakdown per room until a room has at least one
// named guest, and still lists how many guests in that room have no details yet.
const guestDisplayRooms = computed(() => {
  return guestBreakdown.value.map((summary, index) => {
    const room = guestNameEntries.value[index];
    const named = room?.guests.filter(guest => guest.named) ?? [];

    if (named.length === 0) {
      return {names: null, summary, unnamed: 0};
    }

    return {
      names: named.map(guest => `${guest.firstName} ${guest.lastName}`).join(', '),
      summary,
      unnamed: room.guests.length - named.length,
    };
  });
});

// The backend rejects a save missing this per room, so the button is guided
// shut beforehand rather than letting the customer hit that error unprompted.
const allRoomsHaveNamedAdult = computed(() => {
  if (!guestNameEntries.value.length) {
    return false;
  }

  return guestNameEntries.value.every(room => room.guests.some(guest => !guest.isChild && guest.named));
});

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
        <!-- Quote -->
        <template v-else-if="quote">
          <!-- Hold countdown, full width so it reads as a status banner rather than a sidebar detail. Dropped once booking is underway — the hold no longer applies to a room that's already being booked. -->
          <div v-if="!attempt" :class="[holdAlertStyle.wrap, 'mt-3 flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4 ring-1 ring-inset']">
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
            <!-- Gallery, then the booking attempt's own flow once it starts -->
            <div class="space-y-6 lg:col-span-2">
              <HotelGallery v-if="quote.hotel" :photos="quote.hotel.photos" :name="quote.hotel.name" />
              <GuestDetailsForm
                  v-if="attemptStep === 'guestDetails'"
                  :rooms="attempt.rooms"
                  :gender-required="attempt.isGenderSpecificationRequired"
                  :submit-error="saveGuestsError"
                  :validation-errors="validationErrors"
                  @submit="submitGuestDetails"
                  @update="onGuestDetailsUpdate"
              />
              <div v-else-if="attemptStep === 'confirmed'" class="rounded-2xl bg-white p-8 text-center ring-1 ring-gray-200">
                <div class="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircleIcon class="size-7" aria-hidden="true" />
                </div>
                <h2 class="mt-6 text-base font-semibold text-gray-900">Booking confirmed</h2>
                <p class="mt-2 text-sm text-gray-500">Your reservation is confirmed. A confirmation will be sent to the email you provided.</p>
              </div>
              <div v-else-if="attemptStep === 'failed'" class="rounded-2xl bg-white p-8 text-center ring-1 ring-red-200">
                <div class="mx-auto flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <ExclamationTriangleIcon class="size-7" aria-hidden="true" />
                </div>
                <h2 class="mt-6 text-base font-semibold text-gray-900">We couldn't confirm this booking</h2>
                <p class="mt-2 text-sm text-gray-500">Something went wrong finishing your booking with the hotel. Please go back and try again.</p>
              </div>
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
                <!-- Guests -->
                <div v-if="guestDisplayRooms.length" class="mt-4 border-t border-gray-100 pt-4">
                  <p class="text-xs font-semibold tracking-wide text-gray-400 uppercase">Guests</p>
                  <div class="mt-1.5 space-y-1.5">
                    <div v-for="(room, index) in guestDisplayRooms" :key="index">
                      <p v-if="guestDisplayRooms.length > 1" class="text-xs text-gray-400">Room {{ index + 1 }}</p>
                      <p class="text-sm font-medium text-gray-900">{{ room.names ?? room.summary }}</p>
                      <p v-if="room.unnamed > 0" class="text-xs text-gray-400">+{{ room.unnamed }} guest{{ room.unnamed === 1 ? '' : 's' }} without details yet</p>
                    </div>
                  </div>
                </div>
                <!-- Price -->
                <div class="mt-4 border-t border-gray-100 pt-4">
                  <p class="text-xs font-semibold tracking-wide text-gray-400 uppercase">Total price</p>
                  <p class="mt-1.5 flex items-baseline gap-1.5">
                    <span class="text-sm font-medium text-gray-500">{{ quote.price.currency }}</span>
                    <span class="text-3xl font-semibold tracking-tight text-gray-900 tabular-nums">{{ amount }}</span>
                  </p>
                  <p v-if="quote.priceChanged && priceChangeConfirmed" class="mt-2 text-xs text-amber-600">You confirmed this updated price.</p>
                  <p v-if="bookingFailed" class="mt-3 text-xs text-red-600">Something went wrong starting your booking. Please try again.</p>
                  <!-- Always the last thing in the sidebar, so the customer sees the -->
                  <!-- full price before being asked to act on it. -->
                  <button
                      v-if="!attempt"
                      type="button"
                      :disabled="isExpired || !priceChangeConfirmed || isBooking"
                      @click="startBooking"
                      class="mt-4 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-0 disabled:cursor-not-allowed disabled:opacity-60"
                  >{{ isExpired ? 'Reservation expired' : (isBooking ? 'Starting booking…' : 'Continue Booking') }}</button>
                  <!-- Submits GuestDetailsForm from here via its form id. -->
                  <template v-else-if="attemptStep === 'guestDetails'">
                    <button
                        type="submit"
                        form="guest-details-form"
                        :disabled="isSavingGuests || !allRoomsHaveNamedAdult"
                        class="mt-4 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-0 disabled:cursor-not-allowed disabled:opacity-60"
                    >{{ isSavingGuests ? 'Saving…' : 'Save guest details' }}</button>
                    <!-- Right where the action is, since a validation message left only -->
                    <!-- at the top of a long form is easy to miss from down here. -->
                    <p v-if="!allRoomsHaveNamedAdult" class="mt-2 text-xs text-gray-500">Add a name for at least one adult in every room to save.</p>
                    <p v-else-if="validationErrors" class="mt-2 text-xs font-medium text-red-600">Some guest details need attention above.</p>
                    <p v-else-if="saveGuestsError" class="mt-2 text-xs font-medium text-red-600">{{ saveGuestsError }}</p>
                    <p v-else-if="guestsSavedRecently" class="mt-2 text-xs font-medium text-emerald-600">Guest details saved.</p>
                  </template>
                </div>
              </section>
            </aside>
          </div>
        </template>
      </div>
    </main>
    <PriceChangeDialog
        :open="priceChangeDialogOpen"
        :currency="quote?.price?.currency"
        :amount="amount"
        :is-booking="isBooking"
        @confirm="startBooking"
        @cancel="cancelPriceChange"
    />
  </CustomerLayout>
</template>
