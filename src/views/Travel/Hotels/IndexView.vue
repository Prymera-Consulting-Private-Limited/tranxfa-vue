<script setup>
import {computed, onMounted, ref, watch} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import CustomerLayout from "@/components/CustomerLayout.vue";
import HotelCard from "@/views/Travel/Hotels/Partials/HotelCard.vue";
import HotelSkeleton from "@/views/Travel/Hotels/Partials/HotelSkeleton.vue";
import EmptyHotels from "@/views/Travel/Hotels/Partials/EmptyHotels.vue";
import SearchBar from "@/views/Travel/Hotels/Partials/SearchBar.vue";
import HotelFilters from "@/views/Travel/Hotels/Partials/HotelFilters.vue";
import HotelSort from "@/views/Travel/Hotels/Partials/HotelSort.vue";
import HotelPagination from "@/views/Travel/Hotels/Partials/HotelPagination.vue";
import {
  getCheapestRate,
  getCriteria,
  getFacets,
  getFilteredResults,
  getFilters,
  getQuery,
  getSortedResults,
  hasFilters,
  HOTELS_PER_PAGE,
  SORT_OPTIONS,
  useHotelUtils,
} from "@/composables/travel/hotels/hotel_utils.js";
import Hotel from "@/models/travel/hotels/hotel.js";
import Region from "@/models/travel/region.js";
import {ExclamationTriangleIcon} from "@heroicons/vue/24/outline";

const route = useRoute();
const router = useRouter();

const {criteria, nights, search, regions} = useHotelUtils();

const hotels = ref([]);
const isLoading = ref(false);
const hasFailed = ref(false);

const regionOptions = ref([]);
const isSearchingRegions = ref(false);

// Keystrokes can resolve out of order, so only the newest lookup may answer.
let regionLookup = 0;

/**
 * A hotel is only listed once we have a rate we can actually price, so the card
 * never has to guard against a missing rate or payment option.
 */
const results = computed(() => {
  return hotels.value
      .map(hotel => ({hotel, rate: getCheapestRate(hotel)}))
      .filter(result => result.rate !== null);
});

const filters = ref(getFilters());

const facets = computed(() => getFacets(results.value));

const filteredResults = computed(() => getFilteredResults(results.value, filters.value));

const isFiltered = computed(() => hasFilters(filters.value));

const sort = ref(SORT_OPTIONS[0].value);

const sortedResults = computed(() => getSortedResults(filteredResults.value, sort.value));

const page = ref(1);

// The whole region is already here, so paging is a slice of what is on screen.
const pageCount = computed(() => Math.max(1, Math.ceil(sortedResults.value.length / HOTELS_PER_PAGE)));

const pagedResults = computed(() => {
  const start = (page.value - 1) * HOTELS_PER_PAGE;

  return sortedResults.value.slice(start, start + HOTELS_PER_PAGE);
});

const resultsTop = ref(null);

// A narrowed or reordered list makes the page you were on meaningless.
watch([filteredResults, sort], () => {
  page.value = 1;
});

function goToPage(next) {
  page.value = next;

  resultsTop.value?.scrollIntoView({behavior: 'smooth', block: 'start'});
}

// There is nothing to filter while a search is in flight or came back with nothing.
const showFilters = computed(() => {
  return hasDestination.value && !isLoading.value && !hasFailed.value && results.value.length > 0;
});

// The search is by region id, so the name only becomes known from the results.
const region = computed(() => results.value[0]?.hotel.region ?? null);

// Nothing can be priced until a destination is chosen.
const hasDestination = computed(() => criteria.value.region_id !== null);

async function getHotels() {
  isLoading.value = true;
  hasFailed.value = false;

  // A price cap or an amenity from one search says nothing about the next one.
  filters.value = getFilters();

  await search().then((response) => {
    hotels.value = Hotel.getCollection(response.data.hotels);
  }).catch(() => {
    hotels.value = [];
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
 * Both directions go through getCriteria/getQuery, so the same search always
 * produces the same signature no matter which side it came from.
 *
 * @param {object} query
 * @returns {string}
 */
function getSignature(query) {
  return JSON.stringify(getQuery(getCriteria(query)));
}

// Nothing has been applied yet, so the first url always runs.
let appliedSearch = null;

/**
 * Runs whatever the url asks for, including the back and forward buttons.
 *
 * @param {object} query
 */
function applySearch(query) {
  const signature = getSignature(query);

  if (signature === appliedSearch) {
    return;
  }

  appliedSearch = signature;
  criteria.value = getCriteria(query);

  if (!criteria.value.region_id) {
    hotels.value = [];
    hasFailed.value = false;

    return;
  }

  getHotels();
}

/**
 * The url owns the criteria, so a new search is a navigation and applySearch
 * runs it from there.
 *
 * @param {object} update
 */
function updateSearch(update) {
  const query = getQuery({...criteria.value, ...update});

  // An unchanged url is never replayed, so a repeat search is run directly.
  if (JSON.stringify(query) === appliedSearch) {
    getHotels();

    return;
  }

  // The navigation only lands on the next tick, and until then the results on
  // screen belong to the previous search.
  isLoading.value = true;

  router.replace({query: query});
}

watch(() => route.query, applySearch, {immediate: true});

onMounted(() => {
  getRegions();
});

/**
 * The stay carries over in the url, so the hotel page can price the same search
 * on a refresh or a shared link instead of asking for the dates again.
 *
 * @param {Hotel} hotel
 */
function viewHotel(hotel) {
  router.push({
    name: 'viewHotel',
    params: {id: hotel.hotelId, slug: hotel.slug},
    query: getQuery(criteria.value),
  });
}
</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 pb-12 bg-gray-50">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <!-- Search -->
        <SearchBar
            :criteria="criteria"
            :region="region"
            :regions="regionOptions"
            :is-loading="isLoading"
            :is-searching-regions="isSearchingRegions"
            @search="updateSearch"
            @region-search="getRegions"
        />
        <!-- Summary -->
        <div class="mt-8 sm:flex sm:items-end sm:justify-between sm:gap-4">
          <div>
            <h2 class="text-base font-semibold text-gray-900">
              <template v-if="!hasDestination">Where do you want to stay?</template>
              <template v-else-if="isLoading">Searching for hotels…</template>
              <template v-else-if="filteredResults.length">{{ filteredResults.length }} hotel{{ filteredResults.length === 1 ? '' : 's' }} available<template v-if="region"> in {{ region }}</template></template>
              <template v-else>No results</template>
            </h2>
            <p class="mt-1 text-sm text-gray-500">
              <template v-if="!hasDestination">Pick a destination, your dates and who is travelling to see live prices.</template>
              <template v-else-if="isFiltered">Filtered from {{ results.length }} hotel{{ results.length === 1 ? '' : 's' }} the supplier had for your dates.</template>
              <template v-else>Prices shown are the lowest available for your dates, for the whole stay.</template>
            </p>
          </div>
          <HotelSort v-if="showFilters" v-model="sort" class="mt-3 sm:mt-0" />
        </div>
        <div class="mt-6 lg:grid lg:grid-cols-4 lg:items-start lg:gap-6">
          <!-- Filters, once there is a result set to filter -->
          <HotelFilters
              v-if="showFilters"
              :facets="facets"
              :filters="filters"
              :match-count="filteredResults.length"
              :total-count="results.length"
              @update:filters="filters = $event"
              class="lg:col-span-1"
          />
          <section ref="resultsTop" :class="[showFilters ? 'mt-4 lg:col-span-3 lg:mt-0' : 'lg:col-span-4', 'scroll-mt-6 space-y-4']">
            <!-- Nothing searched yet -->
            <EmptyHotels
                v-if="!hasDestination"
                title="Start with a destination"
                description="Search for a city above and we'll price every available hotel for your stay."
            />
            <!-- Loading -->
            <template v-else-if="isLoading">
              <HotelSkeleton v-for="index in 4" :key="index" />
            </template>
            <!-- Failed -->
            <div v-else-if="hasFailed" class="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-white px-8 py-16 text-center">
              <div class="flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                <ExclamationTriangleIcon class="size-7" aria-hidden="true" />
              </div>
              <h3 class="mt-6 text-base font-semibold text-gray-900">We couldn't load hotels</h3>
              <p class="mt-2 max-w-md text-sm text-gray-500">Something went wrong while contacting our travel partner. Please try your search again in a moment.</p>
            </div>
            <!-- Empty -->
            <EmptyHotels v-else-if="results.length === 0" />
            <!-- Filtered out -->
            <EmptyHotels
                v-else-if="filteredResults.length === 0"
                title="No hotels match your filters"
                description="Try clearing a filter or raising the price limit to see more of this destination."
            />
            <!-- Results -->
            <template v-else>
              <HotelCard
                  v-for="result in pagedResults"
                  :key="result.hotel.id"
                  :hotel="result.hotel"
                  :rate="result.rate"
                  :nights="nights"
                  @select="viewHotel"
              />
              <HotelPagination
                  :page="page"
                  :page-count="pageCount"
                  :total="filteredResults.length"
                  :per-page="HOTELS_PER_PAGE"
                  @update:page="goToPage"
                  class="pt-2"
              />
            </template>
          </section>
        </div>
      </div>
    </main>
  </CustomerLayout>
</template>
