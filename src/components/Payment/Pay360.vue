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

// Cleared on unmount: a customer who closed the modal was pulled to the
// transaction page seconds later.
let onStateRedirectId = null;

const {stopPolling, isSlow} = usePaymentWatch(props.transaction, {
  isReady: () => isReadyToPay(),
  isFinal: () => FINAL_STATES.includes(props.transaction.payment.state.code),
  intervalMs: 10000,
  onState: (code) => {
    if (code === PaymentState.AUTHORIZED || code === PaymentState.CAPTURED) {
      stopPolling();
      onStateRedirectId = setTimeout(() => {
        router.push({name: 'viewTransaction', params: {transactionId: props.transaction.id}});
      }, 1500);
    }
  },
});



// 30-second tick so the expiry line re-renders as time passes. The clock only
// informs the copy — the Pay button is ruled by the payment state alone.
const tick = ref(0);
let tickIntervalId = null;

onMounted(() => {
  tickIntervalId = setInterval(() => { tick.value++; }, 30_000);
});

onUnmounted(() => clearInterval(tickIntervalId));

const isExpiryPassed = computed(() => {
  tick.value;
  return props.transaction.payment.expiresAt ? moment(props.transaction.payment.expiresAt).isSameOrBefore(moment()) : false;
});

const expiresIn = computed(() => {
  tick.value;
  return moment(props.transaction.payment.expiresAt).fromNow(true);
});

const expiresAtFormatted = computed(() => {
  return props.transaction.payment.expiresAt ? moment(props.transaction.payment.expiresAt).format('MMM D, YYYY h:mm A') : '';
});

// PENDING alone is not payable — the hosted payment URL can arrive later than
// the state, so keep polling until both are here.
const isReadyToPay = () => {
  return props.transaction.payment.state.code === PaymentState.PENDING && !! props.transaction.payment.paymentUrl;
}






const status = computed(() => {
  if (
      (
        props.transaction.payment.state.code === PaymentState.PENDING ||
        props.transaction.payment.state.code === PaymentState.INITIALIZED ||
        props.transaction.payment.state.code === PaymentState.CREATED
      )
  ) {
    return 'pending';
  } else if (props.transaction.payment.state.code === PaymentState.REDIRECTED) {
    return 'processing';
  } else if (props.transaction.payment.state.code === PaymentState.AUTHORIZED || props.transaction.payment.state.code === PaymentState.CAPTURED) {
    return 'completed';
  } else if (props.transaction.payment.state.code === PaymentState.FAILED) {
    return 'failed';
  } else if (props.transaction.payment.state.code === PaymentState.TIMED_OUT || props.transaction.payment.state.code === PaymentState.CANCELLED) {
    return 'cancelled';
  } else if (props.transaction.payment.state.code === PaymentState.REFUNDED || props.transaction.payment.state.code === PaymentState.PART_REFUNDED) {
    return 'refunded';
  }
})

const emits = defineEmits(['retryPayment']);

const retryPayment = async () => {
  emits('retryPayment');
}
onUnmounted(() => clearTimeout(onStateRedirectId));
</script>

<template>
  <template v-if="transaction.payment.state.code === PaymentState.PENDING && transaction.payment.paymentUrl">
    <div>
      <h2 class="text-lg font-semibold text-gray-900 mb-5 pr-10 text-left">{{ $t('payment.card.completeYourPayment') }}</h2>
      <p class="text-sm/6 text-gray-600 mb-6 text-left">{{ $t('payment.provider.yourTransferIsWaitingFor') }}</p>
      <a :href="transaction.payment.paymentUrl" class="block w-full px-4 md:px-6 lg:px-8 bg-success-700 text-white text-center py-3 rounded-md font-medium hover:bg-success-800 transition cursor-pointer text-sm/6 outline-none ring-0 tracking-wider focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">Pay {{ transaction.payment.totalPaymentAmountCurrencyPrefixed }}</a>
      <p class="text-sm/6 text-gray-600 mt-4 text-left">{{ $t('payment.provider.youWillBeRedirectedTo2') }}</p>
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
    <p v-if="isSlow" role="status" class="mt-2 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-left text-sm/6 text-warning-800"><i18n-t keypath="payment.provider.thisIsTakingLongerThan4" scope="global"><template #value><router-link :to="{name: 'viewTransaction', params: {transactionId: transaction.id}}" class="font-semibold underline underline-offset-2">{{ $t('payment.card.goToYourTransfer') }}</router-link></template></i18n-t></p>
  </template>

  <template v-else-if="status === 'processing'">
    <Processing class="-mt-10" />
    <h2 class="text-xl font-semibold text-gray-900 mb-5 -mt-10">{{ $t('transfer.payment.wereWatchingForYourPayment') }}</h2>
    <p class="text-base text-gray-600 mb-6">{{ transaction.payment.clientPaymentAccount?.waitTimeMessage || 'This usually takes under a minute. You can close this page; we will email you when it is done.' }}</p>
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
    <p class="text-base text-danger-600">{{ $t('transfer.payment.weCouldntTakeYourPayment') }}</p>
    <button @click="retryPayment" class="mt-5 px-4 md:px-6 lg:px-8 bg-brand-700 text-white text-center py-2.5 rounded-xl font-medium hover:bg-brand-800 transition cursor-pointer text-sm/6 outline-none ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">{{ $t('transfer.payment.tryThePaymentAgain') }}</button>
  </template>

  <template v-else-if="status === 'cancelled'">
    <Failed class="-mt-20" />
    <h2 class="text-2xl font-semibold text-gray-900 mb-5 -mt-10">{{ transaction.payment.state.code === PaymentState.TIMED_OUT ? 'This payment has expired' : 'This payment was cancelled' }}</h2>
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