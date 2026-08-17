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
  getCriteria,
  getFacets,
  getFilteredResults,
  getFilters,
  getFiltersFromQuery,
  getFiltersQuery,
  getPageFromQuery,
  getPageQuery,
  getQuery,
  getSortedResults,
  getSortFromQuery,
  getSortQuery,
  hasFilters,
  HOTELS_PER_PAGE,
  REGION_QUERY_MIN,
  SORT_OPTIONS,
  useHotelUtils,
} from "@/composables/travel/hotels/hotel_utils.js";
import Hotel from "@/models/travel/hotels/hotel.js";
import HotelSearch from "@/models/travel/hotels/hotel_search.js";
import Region from "@/models/travel/region.js";
import {ExclamationTriangleIcon} from "@heroicons/vue/24/outline";

const route = useRoute();
const router = useRouter();

const {criteria, search, regions} = useHotelUtils();

const hotels = ref([]);
const isLoading = ref(false);
const hasFailed = ref(false);

// The api writes its failures for a customer to read — an expired search, a room
// that has gone, a supplier it could not reach. Ours is only the fallback for a
// failure that arrived without one.
const failureMessage = ref(null);

// Stated by the response rather than worked out from the dates, so the figure on
// the card and the one the price was divided by are the same.
const nights = ref(0);

// Opaque, minted by every real search and handed forward to the hotel page.
// Never read back out of the url or reconstructed — a fresh mount or a new
// tab always earns its own by searching again, never reuses an old one.
const searchId = ref(null);

const regionOptions = ref([]);
const isSearchingRegions = ref(false);

// Display text for the region kind codes, on the same terms as the search
// response's labels.
const regionLabels = ref({});

// Whether the list on screen is the operator's curated one rather than results
// for something typed, which the response states rather than us inferring it
// from whether we sent a query.
const regionsAreFeatured = ref(false);

// The supplier reports failures inside 200 bodies, so the backend raises rather
// than answering with an empty list — which means an empty list here really is
// "no matches" and a rejection really is an outage. Rendering both as "no
// destinations found" would tell a customer their city does not exist.
//
// A 404 is neither: with no travel licence every route answers one, so it means
// the product is absent rather than broken. Until there is a field to gate the
// entry point on, this is what keeps an outage and a boundary apart.
const regionsError = ref(null);

// Keystrokes can resolve out of order, so only the newest lookup may answer.
let regionLookup = 0;

// The curated list does not change between keystrokes, so it is fetched once and
// replayed. Otherwise deleting back to one character would re-request it, and the
// picker would flash the operator's list on the way to a search.
let featuredRegions = null;

// One currency and one set of decimal places for the whole response. Every
// amount below is an integer in that currency's minor units, so nothing can be
// rendered without this pair travelling alongside it.
const money = ref({currency: '', decimalPlaces: 2});

// Display text for every code the response carries, so no amenity or meal slug
// is ever prettified into something like "Non smoking" in front of a customer.
const labels = ref({});

// What the region holds before the supplier's cap, so a capped search can say
// so instead of presenting its slice as the whole destination.
const totalHotels = ref(0);

// The backend drops a hotel it cannot price before we see it, so this only
// guards the card against a rate that went missing between the two.
const results = computed(() => hotels.value.filter(hotel => hotel.cheapestRate !== null));

// Filters, sort and page are read from the url by applySearch below and never
// set directly, so a search replayed by the back button restores exactly what
// was on screen rather than whatever these happened to default to.
const filters = ref(getFilters());
const sort = ref(SORT_OPTIONS[0].value);
const page = ref(1);

const facets = computed(() => getFacets(results.value, money.value, labels.value));

const filteredResults = computed(() => getFilteredResults(results.value, filters.value));

const isFiltered = computed(() => hasFilters(filters.value));

const sortedResults = computed(() => getSortedResults(filteredResults.value, sort.value));

// The whole region is already here, so paging is a slice of what is on screen.
const pageCount = computed(() => Math.max(1, Math.ceil(sortedResults.value.length / HOTELS_PER_PAGE)));

// A stale or hand-edited url can ask for a page a filter has since ruled out.
const currentPage = computed(() => Math.min(page.value, pageCount.value));

const pagedResults = computed(() => {
  const start = (currentPage.value - 1) * HOTELS_PER_PAGE;

  return sortedResults.value.slice(start, start + HOTELS_PER_PAGE);
});

const resultsTop = ref(null);

/**
 * Everything but the criteria itself, folded into one url so a filter tweak,
 * a sort change or a page turn all replay the same way the search does.
 *
 * @param {object} patch
 * @returns {object}
 */
function getListQuery(patch = {}) {
  const nextFilters = patch.filters ?? filters.value;
  const nextSort = patch.sort ?? sort.value;
  const nextPage = patch.page ?? page.value;

  return {
    ...getQuery(criteria.value),
    ...getFiltersQuery(nextFilters),
    sort: getSortQuery(nextSort),
    page: getPageQuery(nextPage),
  };
}

/**
 * @param {object} update
 */
function updateFilters(update) {
  router.replace({query: getListQuery({filters: update, page: 1})});
}

/**
 * @param {string} value
 */
function updateSort(value) {
  router.replace({query: getListQuery({sort: value, page: 1})});
}

function goToPage(next) {
  router.replace({query: getListQuery({page: next})});

  resultsTop.value?.scrollIntoView({behavior: 'smooth', block: 'start'});
}

// There is nothing to filter while a search is in flight or came back with nothing.
const showFilters = computed(() => {
  return hasDestination.value && !isLoading.value && !hasFailed.value && results.value.length > 0;
});

// The search is by region id, so the name only becomes known from the results.
const region = computed(() => results.value[0]?.region ?? null);

// The supplier caps how much of a region it will price, so the count on screen
// is not always the count that exists.
const isCapped = computed(() => totalHotels.value > results.value.length);

// Destinations run to four figures, which is unreadable without a separator.
const totalHotelsLabel = computed(() => totalHotels.value.toLocaleString());

// Nothing can be priced until a destination is chosen.
const hasDestination = computed(() => criteria.value.region_id !== null);

async function getHotels() {
  isLoading.value = true;
  hasFailed.value = false;
  failureMessage.value = null;

  await search().then((response) => {
    hotels.value = Hotel.getCollection(response.data.hotels);
    money.value = {
      currency: response.data.currency ?? '',
      decimalPlaces: response.data.currency_decimal_places ?? 2,
    };
    labels.value = response.data.labels ?? {};
    totalHotels.value = response.data.total_hotels ?? hotels.value.length;

    const resolved = response.data.search ? HotelSearch.getInstance(response.data.search) : null;

    searchId.value = resolved?.id ?? null;
    nights.value = response.data.nights ?? resolved?.nights ?? 0;
  }).catch((error) => {
    hotels.value = [];
    totalHotels.value = 0;
    hasFailed.value = true;
    // A 404 without a message is the licence being absent rather than anything
    // going wrong, so it must not read as an outage somebody could wait out.
    failureMessage.value = error.response?.data?.message
        ?? (error.response?.status === 404 ? "Travel isn't available on this app." : null);
    searchId.value = null;
  }).finally(() => {
    isLoading.value = false;
  });
}

/**
 * @param {object} data
 */
function applyRegions(data) {
  regionOptions.value = Region.getCollection(data.regions ?? []);
  regionLabels.value = data.labels ?? {};
  regionsAreFeatured.value = data.is_featured ?? false;
  regionsError.value = null;
}

/**
 * Too short to search on means the curated list rather than nothing, so clearing
 * the box returns to what an operator chose instead of an empty panel.
 *
 * @param {string|null} query
 */
async function getRegions(query = null) {
  const lookup = ++regionLookup;
  const search = query && query.length >= REGION_QUERY_MIN ? query : null;

  if (search === null && featuredRegions !== null) {
    applyRegions(featuredRegions);
    isSearchingRegions.value = false;

    return;
  }

  isSearchingRegions.value = true;

  await regions(search).then((response) => {
    if (lookup !== regionLookup) {
      return;
    }

    if (search === null) {
      featuredRegions = response.data;
    }

    applyRegions(response.data);
  }).catch((error) => {
    if (lookup === regionLookup) {
      regionOptions.value = [];
      regionsAreFeatured.value = false;
      regionsError.value = error.response?.status === 404 ? 'unavailable' : 'failed';
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
 * Runs whatever the url asks for, including the back and forward buttons. The
 * view state is read every time regardless of the signature below, so a page
 * turn or a filter tweak is picked up without re-running the search itself.
 *
 * @param {object} query
 */
function applySearch(query) {
  filters.value = getFiltersFromQuery(query);
  sort.value = getSortFromQuery(query);
  page.value = getPageFromQuery(query);

  const signature = getSignature(query);

  if (signature === appliedSearch) {
    return;
  }

  appliedSearch = signature;
  criteria.value = getCriteria(query);

  if (!criteria.value.region_id) {
    hotels.value = [];
    totalHotels.value = 0;
    nights.value = 0;
    hasFailed.value = false;
    failureMessage.value = null;
    searchId.value = null;

    return;
  }

  getHotels();
}

/**
 * The url owns the criteria, so a new search is a navigation and applySearch
 * runs it from there. The fresh url carries none of the previous search's
 * filters, sort or page, since a price cap or an amenity from one destination
 * says nothing about the next.
 *
 * @param {object} update
 */
function updateSearch(update) {
  const query = getQuery({...criteria.value, ...update});

  // An unchanged url is never replayed, so a repeat search is run directly,
  // leaving whatever filters, sort and page were already in place.
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

// The curated list is what the picker opens on, so it is fetched before anyone
// types rather than in response to typing.
onMounted(() => {
  getRegions();
});

/**
 * The hotel page re-resolves its own stay from search_id, so the only thing
 * it needs from here is the id of the search that hotel was found under.
 *
 * @param {Hotel} hotel
 */
function viewHotel(hotel) {
  router.push({
    name: 'viewHotel',
    params: {id: hotel.id, slug: hotel.slug},
    // The criteria travel too, purely so the hotel page can offer a way back to
    // these results. It reads the stay itself from the search it resolves.
    query: {...getQuery(criteria.value), search: searchId.value ?? undefined},
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
            :region-labels="regionLabels"
            :regions-featured="regionsAreFeatured"
            :regions-error="regionsError"
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
              <!-- The count above is what we could price, which is not always
              what the supplier had. Deliberately silent on why the two differ:
              total_hotels has been described both as the destination's own count
              and as the supplier's count before our filtering, and the wording
              would have to change to suit whichever it turns out to be. -->
              <template v-else-if="isCapped">Showing {{ results.length }} of the {{ totalHotelsLabel }} hotels the supplier had for your dates.</template>
              <template v-else>Prices shown are the lowest available for your dates, for the whole stay.</template>
            </p>
          </div>
          <HotelSort v-if="showFilters" :model-value="sort" @update:model-value="updateSort" class="mt-3 sm:mt-0" />
        </div>
        <div class="mt-6 lg:grid lg:grid-cols-4 lg:items-start lg:gap-6">
          <!-- Filters, once there is a result set to filter -->
          <HotelFilters
              v-if="showFilters"
              :facets="facets"
              :filters="filters"
              :money="money"
              :match-count="filteredResults.length"
              :total-count="results.length"
              @update:filters="updateFilters"
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
              <p v-if="failureMessage" class="mt-2 max-w-md text-sm text-gray-500">{{ failureMessage }}</p>
              <p v-else class="mt-2 max-w-md text-sm text-gray-500">Something went wrong while contacting our travel partner. Please try your search again in a moment.</p>
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
                  v-for="hotel in pagedResults"
                  :key="hotel.id"
                  :hotel="hotel"
                  :money="money"
                  :labels="labels"
                  :nights="nights"
                  @select="viewHotel"
              />
              <HotelPagination
                  :page="currentPage"
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
