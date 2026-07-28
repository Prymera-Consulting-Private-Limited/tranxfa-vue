<script setup>
import {computed, ref, watch} from 'vue';
import {RouterLink} from 'vue-router';
import CustomerLayout from "@/components/CustomerLayout.vue";
import HotelGallery from "@/views/Travel/Hotels/Partials/HotelGallery.vue";
import HotelHeading from "@/views/Travel/Hotels/Partials/HotelHeading.vue";
import HotelRooms from "@/views/Travel/Hotels/Partials/HotelRooms.vue";
import HotelStayCard from "@/views/Travel/Hotels/Partials/HotelStayCard.vue";
import HotelFacilities from "@/views/Travel/Hotels/Partials/HotelFacilities.vue";
import HotelFacts from "@/views/Travel/Hotels/Partials/HotelFacts.vue";
import HotelDetailSkeleton from "@/views/Travel/Hotels/Partials/HotelDetailSkeleton.vue";
import {getCheapestSelectionRate, getCriteriaFromSearch, getQuery, getSelectionRateKey, useHotelUtils} from "@/composables/travel/hotels/hotel_utils.js";
import CatalogHotel from "@/models/travel/hotels/catalog_hotel.js";
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

const {criteria, nights, stayLabel, guestBreakdown, getHotelView} = useHotelUtils();

/**
 * @type {import('vue').Ref<CatalogHotel|null>}
 */
const hotel = ref(null);

const isLoading = ref(false);
const hasFailed = ref(false);

// Stored per the contract, opaque and forwarded when there is a booking step
// to hand it to. Nothing reads it yet.
const hotelViewId = ref(null);

/**
 * The rate the customer picked, kept as the rate itself so a booking step can
 * be handed its id without looking it up again.
 *
 * @type {import('vue').Ref<HotelSelectionRate|null>}
 */
const selectedRate = ref(null);

const selectedKey = computed(() => (selectedRate.value ? getSelectionRateKey(selectedRate.value) : null));

const cheapestRate = computed(() => (hotel.value ? getCheapestSelectionRate(hotel.value) : null));

// The results this hotel was opened from, replayed through the same query contract.
const resultsLink = computed(() => ({name: 'hotels', query: getQuery(criteria.value)}));

// Nothing past search/region ever carries raw criteria again, so without a
// search_id there is no request this page is allowed to make.
const searchId = computed(() => (typeof props.search === 'string' && props.search.length ? props.search : null));

async function getHotelDetails() {
  if (!searchId.value) {
    hotel.value = null;
    hasFailed.value = true;

    return;
  }

  isLoading.value = true;
  hasFailed.value = false;

  // Rates are priced for a stay, so a room chosen for the previous one is void.
  selectedRate.value = null;

  await getHotelView(searchId.value, props.id).then((response) => {
    hotel.value = CatalogHotel.getInstance(response.data);
    criteria.value = getCriteriaFromSearch(hotel.value.selection.search);
    hotelViewId.value = hotel.value.selection?.id ?? null;

    // The stay card should never sit on a bare "from" price when there is
    // already a bookable room, so the cheapest one is picked for the customer.
    selectedRate.value = getCheapestSelectionRate(hotel.value);
  }).catch(() => {
    hotel.value = null;
    hasFailed.value = true;
  }).finally(() => {
    isLoading.value = false;
  });
}

// A different hotel or a different search both mean a new view, the same way
// the router reuses this page when one result is opened straight after another.
watch([() => props.id, searchId], getHotelDetails, {immediate: true});
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
          <!-- Stay -->
          <aside class="mt-6 space-y-4 lg:col-span-1 lg:mt-0 lg:sticky lg:top-6">
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
          </aside>
        </div>
      </div>
    </main>
  </CustomerLayout>
</template>
