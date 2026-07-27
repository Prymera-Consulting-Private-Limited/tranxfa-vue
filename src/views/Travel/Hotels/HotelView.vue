<script setup>
import {computed, onMounted, ref, watch} from 'vue';
import {RouterLink, useRoute, useRouter} from 'vue-router';
import CustomerLayout from "@/components/CustomerLayout.vue";
import SearchBar from "@/views/Travel/Hotels/Partials/SearchBar.vue";
import HotelGallery from "@/views/Travel/Hotels/Partials/HotelGallery.vue";
import HotelHeading from "@/views/Travel/Hotels/Partials/HotelHeading.vue";
import HotelRooms from "@/views/Travel/Hotels/Partials/HotelRooms.vue";
import HotelStayCard from "@/views/Travel/Hotels/Partials/HotelStayCard.vue";
import HotelFacilities from "@/views/Travel/Hotels/Partials/HotelFacilities.vue";
import HotelFacts from "@/views/Travel/Hotels/Partials/HotelFacts.vue";
import HotelDetailSkeleton from "@/views/Travel/Hotels/Partials/HotelDetailSkeleton.vue";
import {getCheapestRate, getCriteria, getQuery, getRateKey, useHotelUtils} from "@/composables/travel/hotels/hotel_utils.js";
import CatalogHotel from "@/models/travel/hotels/catalog_hotel.js";
import Region from "@/models/travel/region.js";
import {ChevronLeftIcon, ExclamationTriangleIcon} from "@heroicons/vue/24/outline";

const props = defineProps({
  id: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true
  }
});

const route = useRoute();
const router = useRouter();

const {criteria, nights, stayLabel, guestBreakdown, getHotel, regions} = useHotelUtils();

/**
 * @type {import('vue').Ref<CatalogHotel|null>}
 */
const hotel = ref(null);

const isLoading = ref(false);
const hasFailed = ref(false);

const regionOptions = ref([]);
const isSearchingRegions = ref(false);

// Keystrokes can resolve out of order, so only the newest lookup may answer.
let regionLookup = 0;

const regionName = computed(() => hotel.value?.region?.name ?? null);

/**
 * The rate the customer picked, kept as the rate itself so the booking step can
 * be handed its book_hash without looking it up again.
 *
 * @type {import('vue').Ref<HotelRate|null>}
 */
const selectedRate = ref(null);

const selectedKey = computed(() => (selectedRate.value ? getRateKey(selectedRate.value) : null));

const cheapestRate = computed(() => (hotel.value ? getCheapestRate(hotel.value) : null));

// The results this hotel was opened from, replayed through the same query contract.
const resultsLink = computed(() => ({name: 'hotels', query: getQuery(criteria.value)}));

async function getHotelDetails() {
  isLoading.value = true;
  hasFailed.value = false;

  // Rates are priced for a stay, so a room chosen for the previous one is void.
  selectedRate.value = null;

  await getHotel(props.id).then((response) => {
    hotel.value = CatalogHotel.getInstance(response.data);

    // A link shared without the search still has to be able to run one, and the
    // hotel knows the region the url did not carry.
    if (!criteria.value.region_id && hotel.value.region) {
      criteria.value.region_id = hotel.value.region.id;
    }

    // The stay card should never sit on a bare "from" price when there is
    // already a bookable room, so the cheapest one is picked for the customer.
    selectedRate.value = getCheapestRate(hotel.value);
  }).catch(() => {
    hotel.value = null;
    hasFailed.value = true;
  }).finally(() => {
    isLoading.value = false;
  });
}

async function getRegions(query = null) {
  const lookup = ++regionLookup;

  isSearchingRegions.value = true;

  await regions(query).then((response) => {
    if (lookup !== regionLookup) {
      return;
    }

    regionOptions.value = Region.getCollection(response.data);
  }).catch(() => {
    if (lookup === regionLookup) {
      regionOptions.value = [];
    }
  }).finally(() => {
    if (lookup === regionLookup) {
      isSearchingRegions.value = false;
    }
  });
}

/**
 * The hotel is part of the signature, since the router reuses this page when one
 * result is opened straight after another.
 *
 * @param {object} query
 * @returns {string}
 */
function getSignature(query) {
  return `${props.id}:${JSON.stringify(getQuery(getCriteria(query)))}`;
}

// Nothing has been priced yet, so the first url always runs.
let appliedStay = null;

/**
 * The url owns the stay here as well, so the hotel is always priced for whatever
 * the address bar says, including after a back or forward.
 */
function applyStay() {
  const signature = getSignature(route.query);

  if (signature === appliedStay) {
    return;
  }

  appliedStay = signature;
  criteria.value = getCriteria(route.query);

  getHotelDetails();
}

/**
 * @param {object} update
 */
function updateSearch(update) {
  const query = getQuery({...criteria.value, ...update});

  // Another destination is a region search, which this page cannot answer.
  if (update.region_id !== criteria.value.region_id) {
    router.push({name: 'hotels', query: query});

    return;
  }

  // An unchanged url is never replayed, so a repeat search is run directly.
  if (`${props.id}:${JSON.stringify(query)}` === appliedStay) {
    getHotelDetails();

    return;
  }

  // The navigation only lands on the next tick, and until then the page still
  // shows the previous stay.
  isLoading.value = true;

  router.replace({query: query});
}

watch([() => props.id, () => route.query], applyStay, {immediate: true});

onMounted(() => {
  getRegions();
});
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
              <p class="mt-2 max-w-md text-sm text-gray-500">Something went wrong while contacting our travel partner. Please try again in a moment.</p>
              <button
                  type="button"
                  @click="getHotelDetails"
                  class="mt-6 cursor-pointer rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-0"
              >Try again</button>
            </div>
            <!-- Hotel -->
            <template v-else-if="hotel">
              <HotelGallery :photos="hotel.photos" :name="hotel.name" />
              <div class="mt-6 space-y-8">
                <HotelHeading :hotel="hotel" />
                <HotelRooms
                    :hotel="hotel"
                    :nights="nights"
                    :selected-key="selectedKey"
                    @select="selectedRate = $event"
                />
                <HotelFacts :provider="hotel.provider" />
                <HotelFacilities :facilities="hotel.facilities" />
              </div>
            </template>
          </div>
          <!-- Stay and search -->
          <aside class="mt-6 space-y-4 lg:col-span-1 lg:mt-0 lg:sticky lg:top-6">
            <!-- Held open while the stay is re-priced, so the search below it does not jump. -->
            <div v-if="isLoading" class="animate-pulse space-y-3 rounded-2xl bg-white p-5 ring-1 ring-gray-200">
              <div class="h-3 w-14 rounded bg-gray-100" />
              <div class="h-8 w-32 rounded bg-gray-200" />
              <div class="h-10 w-full rounded-xl bg-gray-100" />
            </div>
            <HotelStayCard
                v-else-if="!hasFailed"
                :stay="stayLabel"
                :nights="nights"
                :guests="guestBreakdown"
                :cheapest="cheapestRate"
                :selected="selectedRate"
            />
            <SearchBar
                stacked
                :criteria="criteria"
                :region="regionName"
                :regions="regionOptions"
                :is-loading="isLoading"
                :is-searching-regions="isSearchingRegions"
                @search="updateSearch"
                @region-search="getRegions"
            />
          </aside>
        </div>
      </div>
    </main>
  </CustomerLayout>
</template>
