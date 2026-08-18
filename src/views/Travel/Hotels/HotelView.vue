<script setup>
import {computed, ref, watch} from 'vue';
import {RouterLink, useRoute, useRouter} from 'vue-router';
import CustomerLayout from "@/components/CustomerLayout.vue";
import HotelGallery from "@/views/Travel/Hotels/Partials/HotelGallery.vue";
import HotelHeading from "@/views/Travel/Hotels/Partials/HotelHeading.vue";
import HotelRooms from "@/views/Travel/Hotels/Partials/HotelRooms.vue";
import HotelHouseRules from "@/views/Travel/Hotels/Partials/HotelHouseRules.vue";
import HotelAmenities from "@/views/Travel/Hotels/Partials/HotelAmenities.vue";
import HotelStayCard from "@/views/Travel/Hotels/Partials/HotelStayCard.vue";
import HotelDetailSkeleton from "@/views/Travel/Hotels/Partials/HotelDetailSkeleton.vue";
import {getCheapestRate, useHotelUtils} from "@/composables/travel/hotels/hotel_utils.js";
import HotelDetail from "@/models/travel/hotels/hotel_detail.js";
import HotelRate from "@/models/travel/hotels/hotel_rate.js";
import HotelSearch from "@/models/travel/hotels/hotel_search.js";
import {getCustomerMessage, getLabels} from "@/composables/api_utils.js";
import {ChevronLeftIcon, ExclamationTriangleIcon} from "@heroicons/vue/24/outline";

const props = defineProps({
  id: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true
  },
  // A repeated ?search= arrives as an array, which is not an id.
  search: {
    type: String,
    default: null
  }
});

const route = useRoute();
const router = useRouter();

const {getHotelView, createQuote} = useHotelUtils();

/**
 * @type {import('vue').Ref<HotelDetail|null>}
 */
const hotel = ref(null);

/**
 * @type {import('vue').Ref<HotelRate[]>}
 */
const rates = ref([]);

/**
 * The stay as the backend resolved it. Read from here rather than from the url,
 * because a page reached by the back button can carry a url describing a
 * different stay from the one these prices were quoted for — a mismatch nobody
 * would notice until checkout.
 *
 * @type {import('vue').Ref<HotelSearch|null>}
 */
const resolvedSearch = ref(null);

const labels = ref({});

const isLoading = ref(false);
const hasFailed = ref(false);
const failureMessage = ref(null);

/**
 * The chosen rate. Kept whole so the token, the price and the terms shown beside
 * the button all come from the same rate.
 *
 * @type {import('vue').Ref<HotelRate|null>}
 */
const selectedRate = ref(null);

const selectedToken = computed(() => selectedRate.value?.token ?? null);

const isHolding = ref(false);
const roomGone = ref(false);
const holdFailureMessage = ref(null);

/**
 * @param {HotelRate} rate
 */
function selectRate(rate) {
  selectedRate.value = rate;
  roomGone.value = false;
  holdFailureMessage.value = null;
}

/**
 * Holds the price, which is the first thing that can fail for an ordinary
 * reason: the supplier is asked for this hotel again and the token looked for in
 * its current answer, so a room that sold out in the meantime comes back as a
 * 409. That is an answer, not an error — the customer is sent back to the list
 * rather than shown a dialog.
 */
async function holdPrice() {
  if (!selectedRate.value?.token || !searchId.value) {
    return;
  }

  isHolding.value = true;
  roomGone.value = false;
  holdFailureMessage.value = null;

  await createQuote(searchId.value, props.id, selectedRate.value.token).then((response) => {
    router.push({name: 'travelQuote', params: {id: response.data.id}});
  }).catch((error) => {
    if (error.response?.status === 409) {
      roomGone.value = true;
      selectedRate.value = null;
      // The rate list is now known to be out of date, so it is fetched again
      // rather than left showing a room that cannot be had.
      getHotelDetails({quiet: true});
    } else {
      holdFailureMessage.value = getCustomerMessage(error) ?? 'We could not hold this price. Please try again in a moment.';
    }

    isHolding.value = false;
  });
}

// The search this hotel was opened from, replayed exactly as the url carries it.
// Only ever used to go back: the stay itself comes from the resolved search, so
// nothing here is trusted to describe what was priced.
const resultsLink = computed(() => ({
  name: 'hotels',
  query: {
    region: route.query.region,
    checkin: route.query.checkin,
    checkout: route.query.checkout,
    guests: route.query.guests,
  },
}));

// Nothing past search/region ever carries raw criteria again, so without a
// search_id there is no request this page is allowed to make.
const searchId = computed(() => (typeof props.search === 'string' && props.search.length ? props.search : null));

async function getHotelDetails({quiet = false} = {}) {
  if (!searchId.value) {
    hotel.value = null;
    hasFailed.value = true;
    failureMessage.value = 'These results are out of date. Search again to see current prices.';

    return;
  }

  if (!quiet) {
    isLoading.value = true;
    // Rates are priced for a stay, so a room chosen for the previous one is void.
    selectedRate.value = null;
  }

  hasFailed.value = false;
  failureMessage.value = null;

  await getHotelView(searchId.value, props.id).then((response) => {
    hotel.value = HotelDetail.getInstance(response.data.hotel);
    rates.value = (response.data.rates ?? []).map(rate => HotelRate.getInstance(rate));
    resolvedSearch.value = response.data.search ? HotelSearch.getInstance(response.data.search) : null;
    labels.value = getLabels(response.data.labels);

    if (!quiet) {
      // The stay card should never sit on nothing when there is already a
      // bookable room, so the cheapest one is picked for the customer.
      selectedRate.value = getCheapestRate(rates.value);
    }
  }).catch((error) => {
    hotel.value = null;
    rates.value = [];
    hasFailed.value = true;
    // A search past its half hour, a hotel we do not sell, or somebody else's
    // search all answer 404 with words written to be shown.
    failureMessage.value = getCustomerMessage(error);
  }).finally(() => {
    isLoading.value = false;
  });
}

// A different hotel or a different search both mean a new view, the same way
// the router reuses this page when one result is opened straight after another.
watch([() => props.id, searchId], () => getHotelDetails(), {immediate: true});
</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 pb-12 bg-gray-50">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <!-- Back to results -->
        <RouterLink :to="resultsLink" class="inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition hover:text-gray-900">
          <ChevronLeftIcon class="size-4" aria-hidden="true" />
          Back to results
        </RouterLink>
        <div class="mt-3 lg:grid lg:grid-cols-3 lg:items-start lg:gap-6">
          <!-- Hotel -->
          <div class="lg:col-span-2">
            <!-- Loading -->
            <HotelDetailSkeleton v-if="isLoading" />
            <!-- Failed -->
            <div v-else-if="hasFailed" class="flex flex-col items-center justify-center rounded-3xl bg-white px-8 py-16 text-center ring-1 ring-red-200">
              <div class="flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                <ExclamationTriangleIcon class="size-7" aria-hidden="true" />
              </div>
              <h2 class="mt-6 text-base font-semibold text-gray-900">We couldn't load this hotel</h2>
              <p v-if="failureMessage" class="mt-2 max-w-md text-sm text-gray-500">{{ failureMessage }}</p>
              <p v-else class="mt-2 max-w-md text-sm text-gray-500">Something went wrong while contacting our travel partner. Please try again in a moment.</p>
              <RouterLink
                  :to="resultsLink"
                  class="mt-6 cursor-pointer rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-0"
              >Back to results</RouterLink>
            </div>
            <!-- Hotel -->
            <template v-else-if="hotel">
              <HotelGallery :photos="hotel.photos" :name="hotel.name" />
              <div class="mt-6 space-y-8">
                <HotelHeading :hotel="hotel" />
                <HotelRooms
                    :rates="rates"
                    :labels="labels"
                    :nights="resolvedSearch?.nights ?? 0"
                    :selected-token="selectedToken"
                    @select="selectRate"
                />
                <section v-if="hotel.amenities.length">
                  <h2 class="text-lg font-semibold tracking-tight text-gray-900">What this place offers</h2>
                  <div class="mt-3 rounded-3xl bg-white p-5 ring-1 ring-gray-200">
                    <HotelAmenities :amenities="hotel.amenities" :labels="labels" :limit="hotel.amenities.length" />
                  </div>
                </section>
                <HotelHouseRules :rules="hotel.houseRules" :charges="hotel.charges" :labels="labels" />
              </div>
            </template>
          </div>
          <!-- Stay -->
          <aside class="mt-6 space-y-4 lg:col-span-1 lg:mt-0 lg:sticky lg:top-6">
            <div v-if="isLoading" class="animate-pulse space-y-3 rounded-3xl bg-white p-5 ring-1 ring-gray-200">
              <div class="h-3 w-14 rounded bg-gray-100" />
              <div class="h-8 w-32 rounded bg-gray-200" />
              <div class="h-10 w-full rounded-xl bg-gray-100" />
            </div>
            <HotelStayCard
                v-else-if="!hasFailed"
                :search="resolvedSearch"
                :selected="selectedRate"
                :is-holding="isHolding"
                :room-gone="roomGone"
                :failure-message="holdFailureMessage"
                @hold="holdPrice"
            />
          </aside>
        </div>
      </div>
    </main>
  </CustomerLayout>
</template>
