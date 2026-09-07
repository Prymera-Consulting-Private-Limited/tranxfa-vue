<script setup>
import {computed, onUnmounted, ref, watch} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import CustomerLayout from '@/components/CustomerLayout.vue';
import Pagination from '@/components/Pagination.vue';
import BookingCard from '@/views/Travel/Bookings/Partials/BookingCard.vue';
import BookingSkeleton from '@/views/Travel/Bookings/Partials/BookingSkeleton.vue';
import Order from '@/models/travel/orders/order.js';
import {getCustomerMessage, reportUnexpectedError} from '@/composables/api_utils.js';
import {CONFIRMATION_POLL_MS, ORDER_STATES, useOrderUtils} from '@/composables/travel/order_utils.js';
import {BuildingOffice2Icon, ExclamationTriangleIcon} from '@heroicons/vue/24/outline';

const route = useRoute();
const router = useRouter();

const {orders} = useOrderUtils();

const bookings = ref([]);
const pagination = ref(null);
const isLoading = ref(true);
const hasFailed = ref(false);
const failureMessage = ref(null);

// The url owns the view, so a filtered page survives a refresh and can be shared.
const page = computed(() => {
  const value = Number.parseInt(route.query.page, 10);

  return Number.isInteger(value) && value > 0 ? value : 1;
});

const upcoming = computed(() => route.query.upcoming === '1');

const state = computed(() => {
  const value = typeof route.query.state === 'string' ? route.query.state.toUpperCase() : null;

  return ORDER_STATES.some(option => option.value === value) ? value : null;
});

// A booking is confirmed by the hotel answering our status check, which happens
// after the booking call has already returned. Until the confirmation broadcast
// lost in the hotels rewrite is restored, asking again is the only way to learn
// it happened.
let pollTimer = null;

const isAwaitingConfirmation = computed(() => bookings.value.some(order => order.isAwaitingHotel));

function stopPolling() {
  clearTimeout(pollTimer);
  pollTimer = null;
}

function schedulePoll() {
  stopPolling();

  if (!isAwaitingConfirmation.value) {
    return;
  }

  pollTimer = setTimeout(() => getBookings({quiet: true}), CONFIRMATION_POLL_MS);
}

/**
 * @param {{quiet: boolean}} options A poll leaves the list on screen rather than
 * replacing it with skeletons every few seconds.
 */
async function getBookings({quiet = false} = {}) {
  if (!quiet) {
    isLoading.value = true;
  }

  hasFailed.value = false;
  failureMessage.value = null;

  await orders({page: page.value, upcoming: upcoming.value, state: state.value}).then((response) => {
    bookings.value = Order.getCollection(response.data.data ?? []);
    pagination.value = response.data.pagination ?? null;
  }).catch((error) => {
    reportUnexpectedError(error, 'travel bookings');

    // Without the travel licence every route answers 404, which is the product
    // being absent rather than anything going wrong.
    bookings.value = [];
    pagination.value = null;
    hasFailed.value = true;
    failureMessage.value = getCustomerMessage(error)
        ?? (error.response?.status === 404 ? "Travel isn't available on this app." : null);
  }).finally(() => {
    isLoading.value = false;
    schedulePoll();
  });
}

function updateQuery(patch) {
  router.replace({
    query: {
      ...route.query,
      page: undefined,
      ...patch,
    },
  });
}

function goToPage(next) {
  router.replace({query: {...route.query, page: next > 1 ? String(next) : undefined}});
}

watch(() => route.query, () => getBookings(), {immediate: true});

onUnmounted(stopPolling);

const hasBookings = computed(() => bookings.value.length > 0);

const isFiltered = computed(() => upcoming.value || state.value !== null);
</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 bg-gray-50 pb-12">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-5xl lg:px-8">
        <!-- Heading -->
        <div class="pt-8 sm:flex sm:items-end sm:justify-between sm:gap-4">
          <div>
            <h1 class="text-base font-semibold text-gray-900">Your bookings</h1>
            <p class="mt-1 text-sm text-gray-500">Every hotel stay you've booked with us, newest first.</p>
          </div>
          <!-- Filters -->
          <div class="mt-4 flex flex-wrap items-center gap-2 sm:mt-0">
            <button
                type="button"
                @click="updateQuery({upcoming: upcoming ? undefined : '1'})"
                :class="[
                  upcoming ? 'border-brand-700 bg-brand-50 text-brand-800' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
                  'cursor-pointer rounded-xl border px-3 py-2 text-sm font-medium transition focus-visible:outline-0',
                ]"
            >Upcoming only</button>
            <select
                :value="state ?? ''"
                @change="updateQuery({state: $event.target.value || undefined})"
                class="cursor-pointer rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 focus-visible:outline-0"
                aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              <option v-for="option in ORDER_STATES" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>
        </div>
        <div class="mt-6 space-y-4">
          <!-- Loading -->
          <template v-if="isLoading">
            <BookingSkeleton v-for="index in 3" :key="index" />
          </template>
          <!-- Failed -->
          <div v-else-if="hasFailed" class="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-white px-8 py-16 text-center">
            <div class="flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <ExclamationTriangleIcon class="size-7" aria-hidden="true" />
            </div>
            <h2 class="mt-6 text-base font-semibold text-gray-900">We couldn't load your bookings</h2>
            <p v-if="failureMessage" class="mt-2 max-w-md text-sm text-gray-500">{{ failureMessage }}</p>
            <p v-else class="mt-2 max-w-md text-sm text-gray-500">Something went wrong on our side. Please try again in a moment.</p>
          </div>
          <!-- Empty -->
          <div v-else-if="!hasBookings" class="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-8 py-16 text-center">
            <div class="flex size-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <BuildingOffice2Icon class="size-7" aria-hidden="true" />
            </div>
            <h2 class="mt-6 text-base font-semibold text-gray-900">
              {{ isFiltered ? 'No bookings match these filters' : 'No bookings yet' }}
            </h2>
            <p class="mt-2 max-w-md text-sm text-gray-500">
              {{ isFiltered ? 'Try clearing a filter to see the rest of your bookings.' : "When you book a hotel with us it will appear here, along with everything you'll need for your stay." }}
            </p>
            <RouterLink
                v-if="!isFiltered"
                :to="{name: 'hotels'}"
                class="mt-6 cursor-pointer rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-800 focus-visible:outline-0"
            >Find a hotel</RouterLink>
          </div>
          <!-- Results -->
          <template v-else>
            <BookingCard v-for="order in bookings" :key="order.id" :order="order" />
            <Pagination
                v-if="pagination && pagination.total_pages > 1"
                :pagination="pagination"
                @pageClicked="goToPage"
                class="pt-2"
            />
          </template>
        </div>
      </div>
    </main>
  </CustomerLayout>
</template>
