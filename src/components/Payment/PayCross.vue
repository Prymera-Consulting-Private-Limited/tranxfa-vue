<script setup>
import Transaction from "@/models/transaction.js";
import {computed, onMounted, onUnmounted, ref} from "vue";
import moment from "moment";
import PaymentTransactionState from "@/models/payment_transaction_state.js";
import PaymentState from "@/enums/payment_state.js";
import PaymentCompleted from "@/components/Payment/State/PaymentCompleted.vue";
import Processing from "@/components/Payment/State/Processing.vue";
import AwaitingPending from "@/components/Payment/State/AwaitingPending.vue";
import Failed from "@/components/Payment/State/Failed.vue";
import {useTransactionUtils} from "@/composables/transaction_utils.js";
import router from "@/router/index.js";

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

const terminalStates = [PaymentState.TIMED_OUT, PaymentState.CANCELLED, PaymentState.REFUNDED, PaymentState.PART_REFUNDED];

// 30-second tick so the expiry line re-renders as time passes. The clock only
// informs the copy — the Pay button is ruled by the payment state alone.
const tick = ref(0);
let tickIntervalId = null;

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

const getTransaction = async () => {
  transactionUtils.getTransaction(props.transaction.id).then((response) => {
    const transaction = Transaction.getInstance(response.data);
    props.transaction.payment = transaction.payment;
    if (isReadyToPay() || terminalStates.includes(props.transaction.payment.state.code)) {
      clearPullInterval();
    }
  });
}

let intervalId = null;

onMounted(async () => {
  Echo.channel(`client-payment.${props.transaction.payment.id}`)
      .listen('PaymentTransactionStateUpdated', (e) => {
        props.transaction.payment.state = PaymentTransactionState.getInstance(e.state);
        props.transaction.payment.sharedReference = e.shared_reference;
        props.transaction.payment.paymentUrl = e.payment_url;
        if (isReadyToPay() || terminalStates.includes(props.transaction.payment.state.code)) {
          clearPullInterval();
        } else if (props.transaction.payment.state.code === PaymentState.AUTHORIZED || props.transaction.payment.state.code === PaymentState.CAPTURED) {
          setTimeout(() => {
            router.push({
              name: 'viewTransaction',
              params: {
                transactionId: props.transaction.id
              }
            });
          }, 1500)
        }
      });
  if (! isReadyToPay() && ! terminalStates.includes(props.transaction.payment.state.code)) {
    intervalId = setInterval(getTransaction, 10000);
  }
  tickIntervalId = setInterval(() => {
    tick.value++;
  }, 30000);
})

const clearPullInterval = async () => {
  if (intervalId) {
    await clearInterval(intervalId);
    intervalId = null;
  }
}

onUnmounted(async () => {
  Echo.leaveChannel(`client-payment.${props.transaction.payment.id}`);
  await clearPullInterval();
  if (tickIntervalId) {
    clearInterval(tickIntervalId);
    tickIntervalId = null;
  }
})

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
</script>

<template>
  <template v-if="transaction.payment.state.code === PaymentState.PENDING && transaction.payment.paymentUrl">
    <div class="">
      <h2 class="text-lg font-semibold text-gray-900 mb-5 text-left">Complete Your Payment</h2>
      <p class="text-sm/6 text-gray-600 mb-6 text-left">
        Your transaction is awaiting payment. Please proceed by clicking the button below to securely complete your payment.
      </p>
      <a :href="transaction.payment.paymentUrl" class="block w-full px-4 md:px-6 lg:px-8 bg-green-600 text-white text-center py-3 rounded-md font-medium hover:bg-green-700 transition cursor-pointer text-sm outline-none ring-0 tracking-wider">Pay {{ transaction.payment.totalPaymentAmountCurrencyPrefixed }}</a>
      <p class="text-sm/6 text-gray-600 mt-4 text-left">You will be redirected to the secure site to finalize your payment.</p>
      <p v-if="transaction.payment.expiresAt" class="mt-3 text-xs text-gray-500 text-left">
        <template v-if="! isExpiryPassed">Payable for another {{ expiresIn }} · {{ expiresAtFormatted }}</template>
        <template v-else>The payment window has passed — checking with the payment provider…</template>
      </p>
      <p v-if="transaction.payment.paymentTerms" class="mt-4 text-xs text-gray-500 text-left whitespace-pre-line">{{ transaction.payment.paymentTerms }}</p>
    </div>
  </template>

  <template v-else-if="status === 'pending'">
    <AwaitingPending class="-mt-10" />
    <h2 class="text-xl font-semibold text-gray-900 mb-5 -mt-10">Please wait...</h2>
    <p class="text-base text-gray-600 mb-6">Please wait while we are setting up the payment.</p>
  </template>

  <template v-else-if="status === 'processing'">
    <Processing class="-mt-10" />
    <h2 class="text-xl font-semibold text-gray-900 mb-5 -mt-10">Awaiting Payment Update</h2>
    <p class="text-base text-gray-600 mb-6">{{ transaction.payment.clientPaymentAccount?.waitTimeMessage }}</p>
    <div v-if="showViewTransfer" class="mb-6 leading-6 text-center text-gray-900 hover:text-brand-700 font-semibold text-sm">
      <router-link :to="{name: 'viewTransaction', params: {transactionId: transaction.id}}">View Transaction</router-link>
    </div>
  </template>

  <template v-else-if="status === 'completed'">
    <PaymentCompleted class="-mt-10" />
    <h2 class="text-xl font-semibold text-green-700 mb-5 -mt-10">Payment Successful</h2>
    <p class="text-lg text-gray-600 mb-6">Your payment has been successfully received.</p>
  </template>

  <template v-else-if="status === 'failed'">
    <Failed class="-mt-20" />
    <h2 class="text-2xl font-semibold text-red-500 mb-5 -mt-10">Payment Failed</h2>
    <p class="text-base text-red-600">Your payment has been failed. Please try again</p>
    <button @click="retryPayment" class="mt-5 px-4 md:px-6 lg:px-8 bg-blue-600 text-white text-center py-3 rounded-md font-medium hover:bg-blue-700 transition cursor-pointer text-sm outline-none ring-0">Retry Payment</button>
  </template>

  <template v-else-if="status === 'cancelled'">
    <Failed class="-mt-20" />
    <h2 class="text-2xl font-semibold text-gray-900 mb-5 -mt-10">{{ transaction.payment.state.code === PaymentState.TIMED_OUT ? 'This payment has expired' : 'This payment was cancelled' }}</h2>
    <p class="text-base text-gray-600 mb-6">No money has moved. You can start the transfer again whenever you're ready.</p>
    <div class="mb-6 leading-6 text-center text-gray-900 hover:text-brand-700 font-semibold text-sm">
      <router-link :to="{name: 'viewTransaction', params: {transactionId: transaction.id}}">View Transaction</router-link>
    </div>
  </template>

  <template v-else-if="status === 'refunded'">
    <h2 class="text-xl font-semibold text-gray-900 mb-5">Payment Refunded</h2>
    <p class="text-base text-gray-600 mb-6">This payment was returned to you. Check the transaction for details.</p>
    <div class="mb-6 leading-6 text-center text-gray-900 hover:text-brand-700 font-semibold text-sm">
      <router-link :to="{name: 'viewTransaction', params: {transactionId: transaction.id}}">View Transaction</router-link>
    </div>
  </template>
</template>