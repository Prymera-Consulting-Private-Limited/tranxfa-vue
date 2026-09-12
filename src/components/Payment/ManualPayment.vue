<script setup>
import moment from "moment";
import InlineFailure from "@/components/InlineFailure.vue";
import Transaction from "@/models/transaction.js";
import {computed, onUnmounted, ref} from "vue";
import {useTransactionUtils} from "@/composables/transaction_utils.js";
import {failureMessage, reportUnexpectedError} from "@/composables/api_utils.js";
import PaymentState from "@/enums/payment_state.js";
import PaymentCompleted from "@/components/Payment/State/PaymentCompleted.vue";
import Processing from "@/components/Payment/State/Processing.vue";
import AwaitingPending from "@/components/Payment/State/AwaitingPending.vue";
import Failed from "@/components/Payment/State/Failed.vue";
import {usePaymentWatch} from "@/composables/payment_watch.js";
import ClientPaymentAccount from "@/components/ClientPaymentAccount.vue";
import {ClipboardIcon} from "@heroicons/vue/24/outline/index.js";
import {UseClipboard} from "@vueuse/components";
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

const transactionUtils = useTransactionUtils();

// Cleared on unmount: a customer who closed the modal was pulled to the
// transaction page seconds later.
let onStateRedirectId = null;

const {stopPolling} = usePaymentWatch(props.transaction, {
  isReady: () => props.transaction.payment.state.code === PaymentState.PENDING,
  isFinal: () => FINAL_STATES.includes(props.transaction.payment.state.code),
  onState: (code) => {
    if (code === PaymentState.AUTHORIZED || code === PaymentState.CAPTURED) {
      stopPolling();
      onStateRedirectId = setTimeout(() => {
        router.push({name: 'viewTransaction', params: {transactionId: props.transaction.id}});
      }, 1500);
    }
  },
});







let redirectTimeoutId = null;
const isConfirmingPayment = ref(false);
const confirmFailure = ref(null);

// The customer says they have paid: tell the server, then show the waiting
// state. The optimistic flip happens first so the button cannot be clicked
// twice, and is reverted if the request fails so they can try again.
const iHaveMadePayment = async () => {
  if (isConfirmingPayment.value) return;
  isConfirmingPayment.value = true;
  confirmFailure.value = null;
  const previousState = props.transaction.payment.state.code;
  stopPolling();
  props.transaction.payment.state.code = PaymentState.REDIRECTED;
  try {
    await transactionUtils.iHaveMadePayment(props.transaction.payment.id);
    props.transaction.payment.customerConfirmedPayment = true;
    redirectTimeoutId = setTimeout(() => {
      router.push({name: 'viewTransaction', params: {transactionId: props.transaction.id}});
    }, 3000);
  } catch (e) {
    props.transaction.payment.state.code = previousState;
    reportUnexpectedError(e, 'payment-sent');
    confirmFailure.value = failureMessage(e, "We couldn't record that you've paid. Your transfer is still open, so please try again.");
  } finally {
    isConfirmingPayment.value = false;
  }
}

onUnmounted(() => clearTimeout(redirectTimeoutId));

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
  return 'unknown';
})
onUnmounted(() => clearTimeout(onStateRedirectId));

// Only the api knows whether this payment has a deadline; null means it
// does not, and the line is left out rather than guessed.
const payByFormatted = computed(() => {
  return props.transaction.payment.expiresAt ? moment(props.transaction.payment.expiresAt).format('MMM D, YYYY h:mm A') : '';
});
</script>

<template>
  <template v-if="transaction.payment.state.code === PaymentState.PENDING">
    <div>
      <h2 class="text-lg font-semibold text-gray-900 mb-5 pr-10 text-left">{{ $t('payment.card.completeYourPayment') }}</h2>
      <p v-if="transaction.payment.clientPaymentAccount" class="text-base font-normal text-sm/6 text-gray-600 mb-6 text-left">{{ transaction.payment.clientPaymentAccount?.instruction }}</p>
      <div v-if="transaction.payment.clientPaymentAccount" class="mb-6 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-left text-sm/6 text-warning-800">
        <p v-if="transaction.payment.clientPaymentAccount.paymentReference"><i18n-t keypath="payment.provider.putTheInTheReference" scope="global"><template #value><strong>{{ $t('account.paymentReference') }}</strong></template></i18n-t></p>
        <i18n-t keypath="payment.provider.sendExactlyAmount" tag="p" scope="global"><template #amount><strong>{{ transaction.payment.totalPaymentAmountCurrencyPrefixed }}</strong></template></i18n-t>
        <i18n-t v-if="payByFormatted" keypath="payment.provider.pleasePayByTime" tag="p" scope="global"><template #time><strong>{{ payByFormatted }}</strong></template></i18n-t>
      </div>
      <template v-if="transaction.payment.clientPaymentAccount">
        <ClientPaymentAccount v-bind:account="transaction.payment.clientPaymentAccount" /><div class="text-left my-5">
        <label :for="`payment-amount`" class="block text-sm/6 font-medium text-gray-900">{{ $t('payment.provider.paymentAmount') }}</label>
        <UseClipboard v-slot="{ copy, copied }" :source="transaction.payment.totalPaymentAmountFormatted">
          <div class="mt-2 flex">
            <div class="-mr-px grid grow grid-cols-1 focus-within:relative">
              <input type="text" readonly :value="transaction.payment.totalPaymentAmountCurrencyPrefixed" :id="`payment-amount`" class="col-start-1 row-start-1 block w-full rounded-l-md bg-gray-50 py-2.5 px-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-brand-600 sm:text-sm/6" />
            </div>
            <button @click="copy()" type="button" class="flex shrink-0 items-center gap-x-1.5 rounded-r-md bg-gray-100 px-3 py-2 text-sm/6 font-semibold text-gray-900 outline-1 -outline-offset-1 outline-gray-300 hover:bg-gray-50 focus:relative focus:outline-2 focus:-outline-offset-2 focus:outline-brand-600 cursor-pointer">
              <ClipboardIcon class="-ml-0.5 size-4 text-gray-400" aria-hidden="true" />
            </button>
          </div>
          <p v-if="copied" class="text-success-700 mt-2 font-normal text-xs/5">{{ $t('account.copied') }}</p>
        </UseClipboard>
      </div>
        <div v-if="!transaction.payment.customerConfirmedPayment" class="my-6">
          <button @click="iHaveMadePayment" :disabled="isConfirmingPayment" type="button" class="rounded-xl w-full bg-brand-700 px-6 py-2.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 cursor-pointer">{{ $t('payment.provider.iveMadePayment') }}</button>
          <InlineFailure :message="confirmFailure" />
        </div>
        <div v-if="showViewTransfer" class="mb-6 text-center text-gray-900 hover:text-brand-800 font-semibold text-sm/6">
          <router-link :to="{name: 'viewTransaction', params: {transactionId: transaction.id}}">{{ $t('payment.card.viewTransfer') }}</router-link>
        </div>
      </template>
    </div>
  </template>

  <template v-else-if="status === 'pending'">
    <AwaitingPending class="-mt-10" />
    <h2 class="text-xl font-semibold text-gray-900 mb-5 -mt-10">{{ $t('transfer.payment.pleaseWait') }}</h2>
    <p class="text-base text-gray-600 mb-6">{{ $t('payment.card.pleaseWaitWhileWeAre') }}</p>
  </template>

  <template v-else-if="status === 'processing'">
    <Processing class="-mt-10" />
    <h2 class="text-xl font-semibold text-gray-900 mb-5 -mt-10">{{ $t('transfer.payment.wereWatchingForYourPayment') }}</h2>
    <p class="text-base text-gray-600 mb-2">{{ $t('payment.provider.thanksForLettingUsKnow') }}</p>
    <p v-if="transaction.payment.clientPaymentAccount?.waitTimeMessage" class="text-sm/6 text-gray-500 mb-6">{{ transaction.payment.clientPaymentAccount.waitTimeMessage }}</p>
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
  </template>

  <!-- Expired, cancelled and refunded payments rendered an empty modal here. -->
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
