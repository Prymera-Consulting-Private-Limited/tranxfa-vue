<script setup>
import {useI18n} from "vue-i18n";

const {t} = useI18n();

import {computed, ref, watch} from 'vue';
import {useRouter} from 'vue-router';
import CustomerLayout from '@/components/CustomerLayout.vue';
import Spinner from '@/components/Spinner.vue';
import Order from '@/models/travel/orders/order.js';
import OrderPayment from '@/models/travel/orders/order_payment.js';
import PaymentMethod from '@/models/payment_method.js';
import VolumePayment from '@/views/Travel/Bookings/Partials/VolumePayment.vue';
import DepositAccountDetails from '@/views/Travel/Bookings/Partials/DepositAccountDetails.vue';
import CancelPaymentAction from '@/views/Travel/Bookings/Partials/CancelPaymentAction.vue';
import HeldByAction from '@/components/Payment/HeldByAction.vue';
import DepositHolder from '@/models/deposit_holder.js';
import OrderPaymentRefusalType from '@/enums/order_payment_refusal_type.js';
import {getCustomerMessage, reportUnexpectedError} from '@/composables/api_utils.js';
import {useOrderUtils} from '@/composables/travel/order_utils.js';
import {CheckCircleIcon, ClockIcon, ExclamationTriangleIcon} from '@heroicons/vue/24/outline';

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
    return t('travel.couldNotLoadThisPage');
  }

  return orderFailed.value ? t('travel.weCouldntLoadYour5') : t('travel.weCouldntLoadYour4');
});

const selectedMethod = ref(null);
const isPaying = ref(false);
const paymentError = ref(null);

/**
 * The other payment holding the customer's deposit account, when that is why
 * this one was refused. The message says to pay or cancel it; this is how they
 * find it.
 *
 * @type {import('vue').Ref<DepositHolder|null>}
 */
const heldBy = ref(null);

// Said once, after the customer cancels a waiting payment and the methods come
// back: without it the picker reappearing looks like the page has reset itself.
const cancelledNotice = ref(null);

/**
 * Methods the api has refused for this order since the page loaded, because
 * nothing is switched on to take the money or only a person could settle it.
 * They stay listed but cannot be chosen again, so the customer is not walked
 * into the same refusal twice.
 *
 * @type {import('vue').Ref<string[]>}
 */
const refusedMethods = ref([]);

/**
 * The order has ended, so there is nothing left to pay. The picker gives way
 * to the api's own explanation and the order's state.
 */
const isNotPayable = ref(false);

/**
 * Set once a payment exists that the customer completes here rather than
 * somewhere else. While it holds a payment the picker is gone — they have chosen,
 * and offering the choice again would only invite a second payment.
 *
 * Volume completes in its widget; a deposit rail completes by the customer
 * sending money to the account the payment carries.
 *
 * @type {import('vue').Ref<OrderPayment|null>}
 */
const activePayment = ref(null);

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

  await Promise.all([loadOrder(), loadMethods()]).finally(() => {
    isLoading.value = false;
  });
}

async function loadOrder() {
  await getOrder(props.orderId).then((response) => {
    order.value = Order.getInstance(response.data);

    // A customer who comes back to pay while a deposit payment is still open is
    // shown where to send the money, not offered a second payment the api would
    // refuse.
    const latest = order.value.latestPayment;
    activePayment.value = latest?.hasAccountDetails ? latest : null;
  }).catch((error) => {
    reportUnexpectedError(error, t('travel.travelPaymentOrder'));
    orderFailed.value = true;
    failureMessage.value = getCustomerMessage(error) ?? failureMessage.value;
  });
}

async function loadMethods() {
  await paymentMethods().then((response) => {
    // The same shape a transfer quote carries, already filtered to what this
    // customer may use.
    methods.value = (response.data.data ?? response.data.payment_methods ?? response.data ?? [])
        .map(method => PaymentMethod.getInstance(method));
    selectedMethod.value = methods.value[0]?.id ?? null;
  }).catch((error) => {
    reportUnexpectedError(error, t('travel.travelPaymentMethods'));
    methodsFailed.value = true;
    failureMessage.value = getCustomerMessage(error) ?? failureMessage.value;
  });
}

/**
 * Opens the payment with the provider. How the customer then pays depends on the
 * provider and there is no flag for it — the code is the contract, the way the
 * transfer flow has always read it.
 *
 * Coming back to a closed tab is the ordinary case, because the payment settles
 * from the provider's webhook either way, so nothing here treats leaving as
 * abandoning.
 *
 * What to do next is read from the answer rather than the method chosen: a url
 * means a redirect, an account means the customer sends money to it. The same
 * rule a transfer's payment follows.
 */
async function pay() {
  if (!selectedMethod.value || isPaying.value) {
    return;
  }

  isPaying.value = true;
  paymentError.value = null;
  cancelledNotice.value = null;
  heldBy.value = null;

  await createPayment(props.orderId, {payment_method_id: selectedMethod.value}).then((response) => {
    const payment = OrderPayment.getInstance(response.data);

    // A provider that hands the customer over. Volume never does, and a null url
    // from it is correct rather than a failed initialise.
    if (payment.paymentUrl) {
      window.location.href = payment.paymentUrl;

      return;
    }

    // A PayID or bank transfer rail: nothing to redirect to, somewhere to send
    // the money instead.
    if (payment.hasAccountDetails) {
      activePayment.value = payment;
      isPaying.value = false;

      return;
    }

    // CREATED and INITIALIZED mean the provider has not answered yet, so there is
    // nothing to put in front of the customer. The screen that waits owns it, and
    // will show them the outcome whenever it arrives — including the account to
    // pay into, on a deposit rail whose account is still being opened.
    if (!payment.isReadyToPay) {
      router.push({name: 'travelPaymentStatus', params: {id: props.orderId}});

      return;
    }

    if (payment.isVolume) {
      activePayment.value = payment;

      return;
    }

    // A provider with no url, no sdk we know of, and nothing for us to render.
    // Rather than leave the customer on a dead page, hand them to the screen that
    // at least tells them the truth about where the payment got to.
    router.push({name: 'travelPaymentStatus', params: {id: props.orderId}});
  }).catch(async (error) => {
    paymentError.value = getCustomerMessage(error) ?? t('travel.weCouldNotStart2');
    isPaying.value = false;

    if (error.response?.status === 409) {
      // Only an account_held or same_amount refusal carries it, and it is
      // null from a console older than SD-1261.
      heldBy.value = DepositHolder.getInstance(error.response.data?.held_by);
      await refused(error.response.data?.type);
    }
  });
}

/**
 * A 409 means the request was fine and the order cannot take it. The message is
 * already on screen as the api wrote it; this only decides what the customer can
 * do next, and it branches on the type, never on the wording.
 *
 * A type this does not know — or none, from a console older than SD-1248 —
 * leaves the message and the picker as they are.
 *
 * @param {string|undefined} type
 */
async function refused(type) {
  switch (type) {
    case OrderPaymentRefusalType.ORDER_NOT_PAYABLE:
      isNotPayable.value = true;
      await loadOrder();
      break;

    case OrderPaymentRefusalType.ORDER_ALREADY_PAID:
      router.push({name: 'travelPaymentStatus', params: {id: props.orderId}});
      break;

    // The open payment is on the order. If it is waiting for money to be sent,
    // its account is shown here; if it is still being set up, the screen that
    // polls takes over.
    case OrderPaymentRefusalType.PAYMENT_WAITING:
      await loadOrder();

      if (activePayment.value) {
        paymentError.value = null;
      } else if (order.value?.latestPayment && !order.value.latestPayment.isSettled) {
        router.push({name: 'travelPaymentStatus', params: {id: props.orderId}});
      }
      break;

    case OrderPaymentRefusalType.METHOD_NOT_OFFERED:
      await loadMethods();
      break;

    case OrderPaymentRefusalType.METHOD_UNAVAILABLE:
    case OrderPaymentRefusalType.METHOD_SETTLED_BY_HAND:
      refusedMethods.value = [...refusedMethods.value, selectedMethod.value];
      selectedMethod.value = methods.value.find(method => !refusedMethods.value.includes(method.id))?.id ?? null;
      break;

    // ACCOUNT_HELD and SAME_AMOUNT: the message says what clears it, which is
    // paying or cancelling the other payment. Nothing on this order can, and a
    // hotel price cannot change to get round it.
    default:
      break;
  }
}

/**
 * The customer says they have sent the money. Nothing is posted — the money is
 * matched when it arrives — so this only moves them to the screen that waits
 * for it, which tells them how long that usually takes.
 */
function paid() {
  router.push({name: 'travelPaymentStatus', params: {id: props.orderId}, query: {sent: '1'}});
}

/**
 * The customer let the waiting payment go. Their account is free at once, so
 * the methods come back and they can pay another way. The order is re-read
 * rather than patched, because it is what decides whether a payment is active.
 */
async function paymentCancelled() {
  paymentError.value = null;
  cancelledNotice.value = t('travel.thatPaymentIsCancelled');
  await loadOrder();
}

/**
 * Too late to cancel: it was paid, failed or cancelled while this page was
 * open. The api's message says so, and the re-read order shows which.
 *
 * @param {string} message
 */
async function cancelRefused(message) {
  cancelledNotice.value = null;
  paymentError.value = message;
  await loadOrder();
}

/**
 * The sdk has taken the customer to their bank. It settles from the provider's
 * webhook from here, so this stops watching the widget and starts watching the
 * payment.
 */
function paymentInitiated() {
  router.push({name: 'travelPaymentStatus', params: {id: props.orderId}});
}

/**
 * The widget could not be opened. The payment exists either way — it just has no
 * way to be completed in this tab — so the picker comes back rather than the
 * customer being told their booking is in trouble.
 */
function paymentFailed() {
  activePayment.value = null;
  isPaying.value = false;
  paymentError.value = t('travel.weCouldNotOpen');
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
        <div v-else-if="hasFailed" class="flex flex-col items-center justify-center rounded-3xl bg-white px-8 py-16 text-center ring-1 ring-danger-200">
          <div class="flex size-14 items-center justify-center rounded-full bg-danger-50 text-danger-600">
            <ExclamationTriangleIcon class="size-7" aria-hidden="true" />
          </div>
          <h1 class="mt-6 text-base font-semibold text-gray-900">{{ failureTitle }}</h1>
          <p v-if="failureMessage" class="mt-2 max-w-md text-sm/6 text-gray-500">{{ failureMessage }}</p>
          <p v-else class="mt-2 max-w-md text-sm/6 text-gray-500">{{ $t('travel.somethingWentWrongOnOur2') }}</p>
          <button
              type="button"
              @click="load"
              class="mt-6 cursor-pointer rounded-xl bg-brand-700 px-5 py-2.5 text-sm/6 font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-0"
          >{{ $t('common.tryAgain') }}</button>
        </div>
        <template v-else-if="order">
          <!-- The order has ended, so the api's own explanation replaces the
          picker. Nothing here would be true of a room that is no longer held. -->
          <section v-if="isNotPayable" class="flex flex-col items-center rounded-3xl bg-white px-8 py-12 text-center ring-1 ring-gray-200">
            <h1 class="text-base font-semibold text-gray-900">{{ $t('travel.bookingCannotBePaid') }}</h1>
            <p v-if="paymentError" class="mt-2 max-w-md text-sm/6 text-gray-500">{{ paymentError }}</p>
            <p v-if="order.stateLabel" class="mt-3 text-sm/6 font-medium text-gray-700">{{ $t('travel.bookingStatusIs', {state: order.stateLabel}) }}</p>
          </section>
          <template v-else>
          <!-- The price is held; this is only about paying for it. Amber, as
          "Price Locked" is everywhere else: green would read as done, and
          nothing is paid yet. -->
          <div class="flex items-start gap-3 rounded-2xl border border-warning-200 bg-warning-50 px-5 py-4">
            <ClockIcon class="mt-0.5 size-5 shrink-0 text-warning-700" aria-hidden="true" />
            <div>
              <p class="text-sm/6 font-medium text-warning-900">{{ $t('travel.thePriceYouPayIsLocked') }}</p>
              <p class="mt-0.5 text-sm/6 text-warning-800">{{ $t('travel.namePayNowToComplete', {name: order.hotel?.name}) }}</p>
            </div>
          </div>
          <!-- A deposit rail is paid by sending money to the customer's own
          account, so its details replace the method list. -->
          <DepositAccountDetails
              v-if="activePayment?.hasAccountDetails"
              :payment="activePayment"
              class="mt-4"
              @paid="paid"
          />
          <!-- Volume builds its bank picker in the page rather than sending the
          customer anywhere, so it replaces the method list instead of following
          it. -->
          <VolumePayment
              v-else-if="activePayment"
              :payment="activePayment"
              class="mt-4"
              @initiated="paymentInitiated"
              @failed="paymentFailed"
          />
          <!-- A waiting payment holds the customer's deposit account, so the way
          out of it sits beside it rather than on another screen. -->
          <CancelPaymentAction
              v-if="activePayment"
              :order-id="orderId"
              :payment="activePayment"
              class="mt-4 text-center"
              @cancelled="paymentCancelled"
              @refused="cancelRefused"
          />
          <section v-if="!activePayment" class="mt-4 overflow-hidden rounded-3xl bg-white ring-1 ring-gray-200">
            <header class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-gray-100 px-5 py-4">
              <h1 class="text-sm/6 font-semibold text-gray-900">{{ $t('travel.howWouldYouLikeTo') }}</h1>
              <p class="text-base font-semibold text-gray-900 tabular-nums">{{ order.total.currencyPrefixed }}</p>
            </header>
            <div v-if="hasMethods" class="divide-y divide-gray-100">
              <label
                  v-for="method in methods"
                  :key="method.id"
                  :class="[
                    refusedMethods.includes(method.id)
                      ? 'cursor-not-allowed opacity-50'
                      : (selectedMethod === method.id ? 'cursor-pointer bg-brand-50/60' : 'cursor-pointer hover:bg-gray-50/70'),
                    'flex items-start gap-3 px-5 py-4 transition',
                  ]"
              >
                <input
                    type="radio"
                    :value="method.id"
                    v-model="selectedMethod"
                    :disabled="refusedMethods.includes(method.id)"
                    :aria-labelledby="`payment-method-${method.id}-title`"
                    :aria-describedby="`payment-method-${method.id}-detail`"
                    class="mt-0.5 size-4 shrink-0 cursor-pointer accent-brand-700 disabled:cursor-not-allowed"
                    name="payment-method"
                />
                <!-- The radio is named by the method's title alone, and the
                provider and description are read after it as its description. -->
                <span class="min-w-0">
                  <span class="block text-sm/6 font-medium text-gray-900">
                    <span :id="`payment-method-${method.id}-title`">{{ method.title }}</span>
                    <span :id="`payment-method-${method.id}-detail`">
                      <span v-if="providerName(method)" class="font-normal text-gray-500"> · {{ $t('travel.viaProvider', {provider: providerName(method)}) }}</span>
                      <span v-if="method.description" class="mt-0.5 block text-xs/5 font-normal text-gray-500">{{ method.description }}</span>
                    </span>
                  </span>
                </span>
              </label>
            </div>
            <!-- Cash at a branch and a bank transfer a person settles by hand are
            refused for travel: they are closed by a person rather than a timer,
            and a payment that never times out outlives the room it is holding.
            A PayID or bank transfer into the customer's own deposit account is
            offered, because it is matched automatically and expires. -->
            <p v-else class="px-5 py-8 text-center text-sm/6 text-gray-500">{{ $t('travel.thereAreNoPaymentMethods') }}</p>
            <div v-if="hasMethods" class="border-t border-gray-100 px-5 py-5">
              <div v-if="cancelledNotice" class="mb-3 flex items-start gap-2 rounded-xl border border-success-200 bg-success-50 p-3 text-sm/6 text-success-800">
                <CheckCircleIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{{ cancelledNotice }}</span>
              </div>
              <div v-if="paymentError" class="mb-3 flex items-start gap-2 rounded-xl border border-danger-200 bg-danger-50 p-3 text-sm/6 text-danger-700">
                <ExclamationTriangleIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{{ paymentError }}</span>
              </div>
              <HeldByAction v-if="paymentError" :holder="heldBy" class="mb-3" />
              <button
                  type="button"
                  :disabled="!selectedMethod || isPaying"
                  @click="pay"
                  class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3.5 text-sm/6 font-semibold text-white shadow-xs transition hover:bg-brand-800 focus-visible:outline-0 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
              >
                <Spinner v-if="isPaying" class="size-4" />
                {{ isPaying ? $t('travel.takingYouToPay') : `Pay ${order.total.currencyPrefixed}` }}
              </button>
              <p class="mt-3 text-center text-xs/5 text-gray-500">{{ $t('travel.youCanCloseThePayment') }}</p>
            </div>
          </section>
          </template>
          <RouterLink
              :to="{name: 'travelBooking', params: {id: orderId}}"
              class="mt-4 block text-center text-sm/6 font-medium text-gray-500 transition hover:text-gray-900"
          >{{ $t('travel.viewThisBooking') }}</RouterLink>
        </template>
      </div>
    </main>
  </CustomerLayout>
</template>
