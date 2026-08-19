<script setup>
import {computed, onUnmounted, ref, watch} from 'vue';
import CustomerLayout from '@/components/CustomerLayout.vue';
import Processing from '@/components/Payment/State/Processing.vue';
import PaymentCompleted from '@/components/Payment/State/PaymentCompleted.vue';
import AwaitingPending from '@/components/Payment/State/AwaitingPending.vue';
import Failed from '@/components/Payment/State/Failed.vue';
import Order from '@/models/travel/orders/order.js';
import {getCustomerMessage, reportUnexpectedError} from '@/composables/api_utils.js';
import {PAYMENT_POLL_MS, useOrderUtils} from '@/composables/travel/order_utils.js';
import {ExclamationTriangleIcon} from '@heroicons/vue/24/outline';

const props = defineProps({
  orderId: {
    type: String,
    required: true,
  },
});

const {getOrder} = useOrderUtils();

/**
 * @type {import('vue').Ref<Order|null>}
 */
const order = ref(null);

const isLoading = ref(true);
const hasFailed = ref(false);
const failureMessage = ref(null);

const payment = computed(() => order.value?.latestPayment ?? null);

/**
 * Four states rather than every code the enum carries. A customer waiting on a
 * payment wants to know whether it worked, not which of five machine states it
 * passed through on the way.
 */
const status = computed(() => {
  if (!payment.value) {
    return 'waiting';
  }

  if (payment.value.isSuccessful) {
    return 'paid';
  }

  if (payment.value.hasFailed) {
    return 'failed';
  }

  return payment.value.state === 'REDIRECTED' ? 'processing' : 'waiting';
});

const heading = computed(() => {
  switch (status.value) {
    case 'paid':
      return 'Your payment has gone through';

    case 'failed':
      return "That payment didn't go through";

    case 'processing':
      return 'Finishing your payment';

    default:
      return 'Waiting for your payment';
  }
});

const note = computed(() => {
  switch (status.value) {
    case 'paid':
      return 'Your room is booked and paid for. The hotel confirms it separately, which can take a minute or two.';

    case 'failed':
      // The room outlives the payment, which is the one thing worth saying here.
      return "You haven't been charged. Your room is still booked, so you can try paying again.";

    case 'processing':
      return "We're waiting for your bank to finish. You can leave this page open — it updates on its own.";

    default:
      return "This updates on its own once your payment settles. You don't need to do anything.";
  }
});

// Polling only, for now. The transfer flow watches a payment settle over a
// broadcast, but the channel travel payments publish on has not been given to us
// and a guessed channel name fails silently — it subscribes, is refused, and
// waits for ever. Asking works today and the socket can shorten it later.
let pollTimer = null;

function stopPolling() {
  clearTimeout(pollTimer);
  pollTimer = null;
}

function schedulePoll() {
  stopPolling();

  if (payment.value?.isSettled) {
    return;
  }

  pollTimer = setTimeout(() => load(true), PAYMENT_POLL_MS);
}

/**
 * @param {boolean} quiet A poll leaves the screen alone rather than flashing it
 * back to a skeleton every few seconds.
 */
async function load(quiet = false) {
  if (!quiet) {
    isLoading.value = true;
  }

  hasFailed.value = false;
  failureMessage.value = null;

  await getOrder(props.orderId).then((response) => {
    order.value = Order.getInstance(response.data);
  }).catch((error) => {
    reportUnexpectedError(error, 'travel payment status');

    // A poll that fails is not worth tearing the page down for — the payment is
    // settling regardless of whether this tab can see it.
    if (quiet) {
      return;
    }

    hasFailed.value = true;
    failureMessage.value = getCustomerMessage(error);
  }).finally(() => {
    isLoading.value = false;
    schedulePoll();
  });
}

watch(() => props.orderId, () => load(), {immediate: true});

onUnmounted(stopPolling);
</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 bg-gray-50 pb-12">
      <div class="mx-auto max-w-2xl px-4 pt-8 sm:px-6 lg:px-8">
        <!-- Loading -->
        <div v-if="isLoading" class="h-80 animate-pulse rounded-3xl bg-white ring-1 ring-gray-200" />
        <!-- Failed -->
        <div v-else-if="hasFailed" class="flex flex-col items-center justify-center rounded-3xl bg-white px-8 py-16 text-center ring-1 ring-red-200">
          <div class="flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600">
            <ExclamationTriangleIcon class="size-7" aria-hidden="true" />
          </div>
          <h1 class="mt-6 text-base font-semibold text-gray-900">We couldn't check your payment</h1>
          <p v-if="failureMessage" class="mt-2 max-w-md text-sm text-gray-500">{{ failureMessage }}</p>
          <p v-else class="mt-2 max-w-md text-sm text-gray-500">Your booking and any payment you made are unaffected. Please try again in a moment.</p>
          <button
              type="button"
              @click="load()"
              class="mt-6 cursor-pointer rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-0"
          >Try again</button>
        </div>
        <template v-else>
          <div class="flex flex-col items-center rounded-3xl bg-white px-8 pt-6 pb-10 text-center ring-1 ring-gray-200">
            <!-- The animations carry their own whitespace, which the crop removes. -->
            <PaymentCompleted v-if="status === 'paid'" class="-my-12" />
            <Failed v-else-if="status === 'failed'" class="-my-12" />
            <Processing v-else-if="status === 'processing'" class="-my-12" />
            <AwaitingPending v-else class="-my-12" />
            <h1 class="mt-6 text-lg font-semibold tracking-tight text-gray-900">{{ heading }}</h1>
            <p class="mt-2 max-w-md text-sm text-gray-500">{{ note }}</p>
            <p v-if="payment" class="mt-4 text-sm text-gray-700">
              <span class="font-medium">{{ payment.amount.currencyPrefixed }}</span>
              <span v-if="payment.method" class="text-gray-400"> · {{ payment.method }}</span>
            </p>
            <div class="mt-8 flex flex-col gap-2 sm:flex-row-reverse">
              <RouterLink
                  :to="{name: 'travelBooking', params: {id: orderId}}"
                  class="cursor-pointer rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-0"
              >View your booking</RouterLink>
              <RouterLink
                  v-if="status === 'failed'"
                  :to="{name: 'travelBookingPayment', params: {id: orderId}}"
                  class="cursor-pointer rounded-xl px-5 py-2.5 text-sm font-medium text-gray-600 ring-1 ring-gray-200 transition hover:text-gray-900 focus-visible:outline-0"
              >Try paying again</RouterLink>
            </div>
          </div>
        </template>
      </div>
    </main>
  </CustomerLayout>
</template>
