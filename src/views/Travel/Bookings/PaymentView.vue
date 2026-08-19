<script setup>
import {computed, ref, watch} from 'vue';
import {useRouter} from 'vue-router';
import CustomerLayout from '@/components/CustomerLayout.vue';
import Spinner from '@/components/Spinner.vue';
import Order from '@/models/travel/orders/order.js';
import PaymentMethod from '@/models/payment_method.js';
import {getCustomerMessage, reportUnexpectedError} from '@/composables/api_utils.js';
import {useOrderUtils} from '@/composables/travel/order_utils.js';
import {CheckCircleIcon, ExclamationTriangleIcon} from '@heroicons/vue/24/outline';

const props = defineProps({
  orderId: {
    type: String,
    required: true,
  },
});

const router = useRouter();

const {getOrder, paymentMethods, createPayment} = useOrderUtils();

/**
 * @type {import('vue').Ref<Order|null>}
 */
const order = ref(null);

/**
 * @type {import('vue').Ref<PaymentMethod[]>}
 */
const methods = ref([]);

const isLoading = ref(true);
const orderFailed = ref(false);
const methodsFailed = ref(false);
const failureMessage = ref(null);

const hasFailed = computed(() => orderFailed.value || methodsFailed.value);

// Naming which of the two went wrong, so nobody reads a booking that would not
// load as a payment configuration problem.
const failureTitle = computed(() => {
  if (orderFailed.value && methodsFailed.value) {
    return "We couldn't load this page";
  }

  return orderFailed.value ? "We couldn't load your booking" : "We couldn't load your payment options";
});

const selectedMethod = ref(null);
const isPaying = ref(false);
const paymentError = ref(null);

/**
 * The room is already held against this order, so nothing here decides whether
 * the booking survives — only how it gets paid for.
 *
 * The two calls fail for unrelated reasons and are reported separately. Rolling
 * them together once sent somebody hunting through payment configuration for a
 * fault that was not there: the methods call had answered 200 with a perfectly
 * good method on it, and it was the order that could not be read.
 */
async function load() {
  isLoading.value = true;
  orderFailed.value = false;
  methodsFailed.value = false;
  failureMessage.value = null;

  await Promise.all([
    getOrder(props.orderId).then((response) => {
      order.value = Order.getInstance(response.data);
    }).catch((error) => {
      reportUnexpectedError(error, 'travel payment: order');
      orderFailed.value = true;
      failureMessage.value = getCustomerMessage(error) ?? failureMessage.value;
    }),
    paymentMethods().then((response) => {
      // The same shape a transfer quote carries, already filtered to what this
      // customer may use.
      methods.value = (response.data.data ?? response.data.payment_methods ?? response.data ?? [])
          .map(method => PaymentMethod.getInstance(method));
    }).catch((error) => {
      reportUnexpectedError(error, 'travel payment: methods');
      methodsFailed.value = true;
      failureMessage.value = getCustomerMessage(error) ?? failureMessage.value;
    }),
  ]).finally(() => {
    isLoading.value = false;
  });

  selectedMethod.value = methods.value[0]?.id ?? null;
}

/**
 * Opens the payment with the provider and hands the customer over. Coming back
 * to a closed tab is the ordinary case — the payment settles either way — so
 * nothing here treats leaving as abandoning.
 */
async function pay() {
  if (!selectedMethod.value || isPaying.value) {
    return;
  }

  isPaying.value = true;
  paymentError.value = null;

  await createPayment(props.orderId, {payment_method_id: selectedMethod.value}).then((response) => {
    const url = response.data.payment_url ?? null;

    if (url) {
      window.location.href = url;

      return;
    }

    // A null payment_url is an ordinary answer, not a failed initialise, and it
    // is permanent rather than pending: Volume is sdk driven, so there is no
    // redirect for the api to give us and never was. The hand-off is a call into
    // window.Volume that takes the customer to their bank from inside our own
    // page — components/Payment/Volume.vue has done exactly that for money
    // transfers all along.
    //
    // That call is deliberately not made here. It wants a merchantPaymentId and
    // a paymentReference, and this response carries neither; both are missing on
    // the api side and ticketed. Wiring it now would fail as though the response
    // shape were wrong rather than the values absent.
    //
    // So this goes as far as the app can honestly get — the payment exists, and
    // the screen that watches it says so.
    router.push({name: 'travelPaymentStatus', params: {id: props.orderId}});
  }).catch((error) => {
    paymentError.value = getCustomerMessage(error) ?? 'We could not start this payment. Please try again in a moment.';
    isPaying.value = false;
  });
}

watch(() => props.orderId, load, {immediate: true});

const hasMethods = computed(() => methods.value.length > 0);

/**
 * The provider behind a method, named only when there is exactly one.
 *
 * Worth showing because these are redirect rails: the customer is about to land
 * on a page branded by somebody they have never heard of, and an unfamiliar name
 * at the moment money moves is where people stop. Naming several would imply a
 * choice they do not have — the api takes a method and picks the provider — so
 * where there is more than one this says nothing.
 *
 * @param {PaymentMethod} method
 * @returns {string|null}
 */
function providerName(method) {
  return method.providers?.length === 1 ? (method.providers[0].title ?? null) : null;
}
</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 bg-gray-50 pb-12">
      <div class="mx-auto max-w-3xl px-4 pt-8 sm:px-6 lg:px-8">
        <!-- Loading -->
        <div v-if="isLoading" class="animate-pulse space-y-4">
          <div class="h-28 rounded-3xl bg-white ring-1 ring-gray-200" />
          <div class="h-56 rounded-3xl bg-white ring-1 ring-gray-200" />
        </div>
        <!-- Failed -->
        <div v-else-if="hasFailed" class="flex flex-col items-center justify-center rounded-3xl bg-white px-8 py-16 text-center ring-1 ring-red-200">
          <div class="flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600">
            <ExclamationTriangleIcon class="size-7" aria-hidden="true" />
          </div>
          <h1 class="mt-6 text-base font-semibold text-gray-900">{{ failureTitle }}</h1>
          <p v-if="failureMessage" class="mt-2 max-w-md text-sm text-gray-500">{{ failureMessage }}</p>
          <p v-else class="mt-2 max-w-md text-sm text-gray-500">Something went wrong on our side. Your room is still booked — please try again in a moment.</p>
          <button
              type="button"
              @click="load"
              class="mt-6 cursor-pointer rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-0"
          >Try again</button>
        </div>
        <template v-else-if="order">
          <!-- The room is booked; this is only about paying for it. -->
          <div class="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
            <CheckCircleIcon class="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden="true" />
            <div>
              <p class="text-sm font-medium text-emerald-900">Your room is booked</p>
              <p class="mt-0.5 text-sm text-emerald-800">{{ order.hotel?.name }} — pay now to confirm it with the hotel.</p>
            </div>
          </div>
          <section class="mt-4 overflow-hidden rounded-3xl bg-white ring-1 ring-gray-200">
            <header class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-gray-100 px-5 py-4">
              <h1 class="text-sm font-semibold text-gray-900">How would you like to pay?</h1>
              <p class="text-base font-semibold text-gray-900 tabular-nums">{{ order.total.currencyPrefixed }}</p>
            </header>
            <div v-if="hasMethods" class="divide-y divide-gray-100">
              <label
                  v-for="method in methods"
                  :key="method.id"
                  :class="[
                    selectedMethod === method.id ? 'bg-brand-50/60' : 'hover:bg-gray-50/70',
                    'flex cursor-pointer items-start gap-3 px-5 py-4 transition',
                  ]"
              >
                <input
                    type="radio"
                    :value="method.id"
                    v-model="selectedMethod"
                    class="mt-0.5 size-4 shrink-0 cursor-pointer accent-brand-700"
                    name="payment-method"
                />
                <span class="min-w-0">
                  <span class="block text-sm font-medium text-gray-900">
                    {{ method.title }}
                    <span v-if="providerName(method)" class="font-normal text-gray-500">· via {{ providerName(method) }}</span>
                  </span>
                  <span v-if="method.description" class="mt-0.5 block text-xs text-gray-500">{{ method.description }}</span>
                </span>
              </label>
            </div>
            <!-- Cash at a branch and manual bank transfer are refused for travel:
            they are closed by a person rather than a timer, and a payment that
            never times out outlives the room it is holding. -->
            <p v-else class="px-5 py-8 text-center text-sm text-gray-500">
              There are no payment methods available for this booking. Please get in touch and we'll sort it out.
            </p>
            <div v-if="hasMethods" class="border-t border-gray-100 px-5 py-5">
              <div v-if="paymentError" class="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <ExclamationTriangleIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{{ paymentError }}</span>
              </div>
              <button
                  type="button"
                  :disabled="!selectedMethod || isPaying"
                  @click="pay"
                  class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-800 focus-visible:outline-0 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
              >
                <Spinner v-if="isPaying" class="size-4" />
                {{ isPaying ? 'Taking you to pay…' : `Pay ${order.total.currencyPrefixed}` }}
              </button>
              <p class="mt-3 text-center text-xs text-gray-400">You can close the payment page once it's done — we'll pick the result up either way.</p>
            </div>
          </section>
          <RouterLink
              :to="{name: 'travelBooking', params: {id: orderId}}"
              class="mt-4 block text-center text-sm font-medium text-gray-500 transition hover:text-gray-900"
          >View this booking</RouterLink>
        </template>
      </div>
    </main>
  </CustomerLayout>
</template>
