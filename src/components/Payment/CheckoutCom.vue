<script setup>
import Transaction from "@/models/transaction.js";
import {computed, onMounted, onUnmounted, ref} from "vue";
import moment from "moment";
import PaymentState from "@/enums/payment_state.js";
import PaymentCompleted from "@/components/Payment/State/PaymentCompleted.vue";
import Processing from "@/components/Payment/State/Processing.vue";
import AwaitingPending from "@/components/Payment/State/AwaitingPending.vue";
import Failed from "@/components/Payment/State/Failed.vue";
import {usePaymentWatch} from "@/composables/payment_watch.js";
import router from "@/router/index.js";

/**
 * Checkout.com: a hosted payment page, same tab (SD-1574).
 *
 * The customer pays on Checkout.com's page by card, Apple Pay or Google Pay
 * and comes back through /payment/cb. Checkout.com does not allow the page in
 * an iframe, and the session lasts 24 hours, which is the payment's
 * expires_at.
 *
 * Simpler than Belmoney: once PENDING there is always a payment_url, so
 * PENDING without one is only the page still being set up, and the "taking
 * longer" notice is right after a minute. A declined card stays on
 * Checkout.com's page for another try and never reaches us as FAILED.
 * Leaving the page unpaid keeps the payment PENDING with the same URL, so
 * the Pay button is simply shown again.
 *
 * Nothing marks the payment REDIRECTED on Pay: the link leaves this page, and
 * a browser back to it must still show Pay, not a confirmation in progress.
 * The customer cannot cancel it either (Transaction.canCancelPayment), because
 * the page stays payable at Checkout.com after a cancel here.
 */

const FINAL_STATES = [
  PaymentState.AUTHORIZED, PaymentState.CAPTURED, PaymentState.FAILED,
  PaymentState.TIMED_OUT, PaymentState.CANCELLED, PaymentState.REFUNDED, PaymentState.PART_REFUNDED,
];

const props = defineProps({
  transaction: {
    type: Object(Transaction),
    required: true
  },
  showViewTransfer: {
    type: Boolean,
    required: false,
    default: true,
  }
})

let onStateRedirectId = null;

const {stopPolling, isSlow} = usePaymentWatch(props.transaction, {
  isReady: () => isReadyToPay(),
  isFinal: () => FINAL_STATES.includes(props.transaction.payment.state.code),
  intervalMs: 10000,
  onState: (code) => {
    // AUTHORIZED is never sent for this provider; it is treated as paid in
    // case that changes, as every other provider does.
    if (code === PaymentState.AUTHORIZED || code === PaymentState.CAPTURED) {
      stopPolling();
      onStateRedirectId = setTimeout(() => {
        router.push({name: 'viewTransaction', params: {transactionId: props.transaction.id}});
      }, 1500);
    }
  },
});

const tick = ref(0);
let tickIntervalId = null;

onMounted(() => {
  tickIntervalId = setInterval(() => { tick.value++; }, 30_000);
});

onUnmounted(() => {
  clearInterval(tickIntervalId);
  clearTimeout(onStateRedirectId);
});

const isExpiryPassed = computed(() => {
  tick.value;
  return props.transaction.payment.expiresAt ? moment(props.transaction.payment.expiresAt).isSameOrBefore(moment()) : false;
});

const expiresIn = computed(() => {
  tick.value;
  return moment(props.transaction.payment.expiresAt).fromNow(true);
});

const expiresAtFormatted = computed(() => {
  return props.transaction.payment.expiresAt ? moment(props.transaction.payment.expiresAt).format('lll') : '';
});

const isReadyToPay = () => {
  return props.transaction.payment.state.code === PaymentState.PENDING && !! props.transaction.payment.paymentUrl;
}

const status = computed(() => {
  const code = props.transaction.payment.state.code;
  if (code === PaymentState.PENDING || code === PaymentState.INITIALIZED || code === PaymentState.CREATED) {
    return 'pending';
  } else if (code === PaymentState.REDIRECTED) {
    return 'processing';
  } else if (code === PaymentState.AUTHORIZED || code === PaymentState.CAPTURED) {
    return 'completed';
  } else if (code === PaymentState.FAILED) {
    return 'failed';
  } else if (code === PaymentState.TIMED_OUT || code === PaymentState.CANCELLED) {
    return 'cancelled';
  } else if (code === PaymentState.REFUNDED || code === PaymentState.PART_REFUNDED) {
    return 'refunded';
  }
  return 'unknown';
})

const emits = defineEmits(['retryPayment']);

const retryPayment = async () => {
  emits('retryPayment');
}
</script>

<template>
  <template v-if="transaction.payment.state.code === PaymentState.PENDING && transaction.payment.paymentUrl">
    <div>
      <h2 class="text-lg font-semibold text-gray-900 mb-5 pr-10 text-left">{{ $t('payment.card.completeYourPayment') }}</h2>
      <p class="text-sm/6 text-gray-600 mb-6 text-left">{{ $t('payment.card.yourTransferIsWaitingFor') }}</p>
      <a :href="transaction.payment.paymentUrl" class="block w-full px-4 md:px-6 lg:px-8 bg-success-700 text-white text-center py-3 rounded-md font-medium hover:bg-success-800 transition cursor-pointer text-sm/6 outline-none ring-0 tracking-wider focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">{{ $t('payment.card.payTotalpaymentamountcurrencyprefixed', {totalPaymentAmountCurrencyPrefixed: transaction.payment.totalPaymentAmountCurrencyPrefixed}) }}</a>
      <p class="text-sm/6 text-gray-600 mt-4 text-left">{{ $t('payment.checkoutCom.youllPayOnCheckoutComs') }}</p>
      <p v-if="transaction.payment.expiresAt" class="mt-3 text-xs/5 text-gray-500 text-left">
        <template v-if="! isExpiryPassed">{{ $t('payment.card.payableForAnotherExpiresinExpiresatformatted', {expiresIn: expiresIn, expiresAtFormatted: expiresAtFormatted}) }}</template>
        <template v-else>{{ $t('payment.card.thePaymentWindowHasPassed') }}</template>
      </p>
      <p v-if="transaction.payment.paymentTerms" class="mt-4 text-xs/5 text-gray-500 text-left whitespace-pre-line">{{ transaction.payment.paymentTerms }}</p>
    </div>
  </template>

  <template v-else-if="status === 'pending'">
    <AwaitingPending class="-mt-10" />
    <h2 class="text-xl font-semibold text-gray-900 mb-5 -mt-10">{{ $t('transfer.payment.pleaseWait') }}</h2>
    <p class="text-base text-gray-600 mb-6">{{ $t('payment.card.pleaseWaitWhileWeAre') }}</p>
    <i18n-t v-if="isSlow" keypath="payment.card.takingLongerTryAgain" tag="p" scope="global" role="status" class="mt-2 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-left text-sm/6 text-warning-800">
      <template #link><router-link :to="{name: 'viewTransaction', params: {transactionId: transaction.id}}" class="font-semibold underline underline-offset-2">{{ $t('payment.card.goToYourTransfer') }}</router-link></template>
    </i18n-t>
  </template>

  <template v-else-if="status === 'processing'">
    <Processing class="-mt-10" />
    <h2 class="text-xl font-semibold text-gray-900 mb-5 -mt-10">{{ $t('transfer.payment.wereWatchingForYourPayment') }}</h2>
    <p class="text-base text-gray-600 mb-6">{{ $t('payment.card.weAreConfirmingYourCard') }}</p>
    <div v-if="showViewTransfer" class="mb-6 text-center text-gray-900 hover:text-brand-800 font-semibold text-sm/6">
      <router-link :to="{name: 'viewTransaction', params: {transactionId: transaction.id}}">{{ $t('payment.card.viewTransfer') }}</router-link>
    </div>
  </template>

  <template v-else-if="status === 'completed'">
    <PaymentCompleted class="-mt-10" />
    <h2 class="text-xl font-semibold text-success-700 mb-5 -mt-10">{{ $t('transfer.payment.paymentReceived') }}</h2>
    <p class="text-lg text-gray-600 mb-6">{{ $t('transfer.payment.yourPaymentHasBeenSuccessfully') }}</p>
  </template>

  <template v-else-if="status === 'failed'">
    <Failed class="-mt-20" />
    <h2 class="text-2xl font-semibold text-danger-600 mb-5 -mt-10">{{ $t('transfer.payment.paymentFailed') }}</h2>
    <p class="text-base text-danger-600">{{ $t('payment.checkoutCom.weCouldntTakeYourPayment') }}</p>
    <button @click="retryPayment" class="mt-5 px-4 md:px-6 lg:px-8 bg-brand-700 text-white text-center py-2.5 rounded-xl font-medium hover:bg-brand-800 transition cursor-pointer text-sm/6 outline-none ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">{{ $t('transfer.payment.tryThePaymentAgain') }}</button>
  </template>

  <template v-else-if="status === 'cancelled'">
    <Failed class="-mt-20" />
    <h2 class="text-2xl font-semibold text-gray-900 mb-5 -mt-10">{{ transaction.payment.state.code === PaymentState.TIMED_OUT ? $t('payment.provider.thisPaymentHasExpired') : $t('payment.provider.thisPaymentWasCancelled') }}</h2>
    <p class="text-base text-gray-600 mb-6">{{ $t('transfer.payment.noMoneyHasMovedYou') }}</p>
    <div class="mb-6 text-center text-gray-900 hover:text-brand-800 font-semibold text-sm/6">
      <router-link :to="{name: 'viewTransaction', params: {transactionId: transaction.id}}">{{ $t('payment.card.viewTransfer') }}</router-link>
    </div>
  </template>

  <template v-else-if="status === 'refunded'">
    <h2 class="text-xl font-semibold text-gray-900 mb-5">{{ $t('transfer.payment.paymentRefunded') }}</h2>
    <p class="text-base text-gray-600 mb-6">{{ $t('transfer.payment.thisPaymentWasReturnedTo') }}</p>
    <div class="mb-6 text-center text-gray-900 hover:text-brand-800 font-semibold text-sm/6">
      <router-link :to="{name: 'viewTransaction', params: {transactionId: transaction.id}}">{{ $t('payment.card.viewTransfer') }}</router-link>
    </div>
  </template>
</template>
