<script setup>
import Transaction from "@/models/transaction.js";
import {computed, onMounted, onUnmounted, watch} from "vue";
import PaymentTransactionState from "@/models/payment_transaction_state.js";
import PaymentState from "@/enums/payment_state.js";
import PaymentCompleted from "@/components/Payment/State/PaymentCompleted.vue";
import Processing from "@/components/Payment/State/Processing.vue";
import Failed from "@/components/Payment/State/Failed.vue";
import {useTransactionUtils} from "@/composables/transaction_utils.js";
import router from "@/router/index.js";

const props = defineProps({
  transaction: {
    type: Object(Transaction),
    required: true
  },
})

const emit = defineEmits([
  'retryPayment',
]);

const transactionUtils = useTransactionUtils();

const getTransaction = async () => {
  transactionUtils.getTransaction(props.transaction.id).then((response) => {
    const transaction = Transaction.getInstance(response.data);
    props.transaction.payment = transaction.payment;
  });
}

let intervalId = null;
let redirectTimeoutId = null;

const clearPullInterval = async () => {
  if (intervalId) {
    await clearInterval(intervalId);
    intervalId = null;
  }
}

onMounted(async () => {
  Echo.channel(`client-payment.${props.transaction.payment.id}`)
      .listen('PaymentTransactionStateUpdated', (e) => {
        props.transaction.payment.state = PaymentTransactionState.getInstance(e.state);
        props.transaction.payment.sharedReference = e.shared_reference;
      });
  if (status.value !== 'completed' && status.value !== 'failed') {
    intervalId = setInterval(getTransaction, 5000);
  }
})

onUnmounted(async () => {
  Echo.leaveChannel(`client-payment.${props.transaction.payment.id}`);
  await clearPullInterval();
  if (redirectTimeoutId) {
    clearTimeout(redirectTimeoutId);
    redirectTimeoutId = null;
  }
})

const status = computed(() => {
  if (props.transaction.payment.state.code === PaymentState.AUTHORIZED || props.transaction.payment.state.code === PaymentState.CAPTURED) {
    return 'completed';
  } else if (props.transaction.payment.state.code === PaymentState.FAILED) {
    return 'failed';
  }
  return 'pending';
})

watch(status, (value) => {
  if (value === 'completed') {
    clearPullInterval();
    if (! redirectTimeoutId) {
      redirectTimeoutId = setTimeout(() => {
        router.push({
          name: 'viewTransaction',
          params: {
            transactionId: props.transaction.id
          }
        });
      }, 4000);
    }
  } else if (value === 'failed') {
    clearPullInterval();
  }
}, {immediate: true});
</script>

<template>
  <template v-if="status === 'pending'">
    <Processing class="-mt-10" />
    <h2 class="text-xl font-semibold text-gray-900 mb-5 -mt-10">Completing your payment</h2>
    <p class="text-base text-gray-600 mb-6">We're taking {{ transaction.payment.totalPaymentAmountCurrencyPrefixed }} from your wallet — this only takes a moment.</p>
  </template>

  <template v-else-if="status === 'completed'">
    <PaymentCompleted class="-mt-10" />
    <h2 class="text-xl font-semibold text-green-700 mb-5 -mt-10">Payment Successful</h2>
    <p class="text-lg text-gray-600 mb-2">Paid from your wallet. Your transfer is on its way.</p>
    <p class="text-sm text-gray-400 mb-6">Taking you to your transfer&hellip;</p>
  </template>

  <template v-else-if="status === 'failed'">
    <Failed class="-mt-20" />
    <h2 class="text-2xl font-semibold text-red-500 mb-5 -mt-10">Payment Failed</h2>
    <p class="text-base text-red-600 mb-6">Your wallet payment could not be completed. Please try again.</p>
    <button @click="emit('retryPayment')" type="button" class="rounded-md w-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-brand-500 cursor-pointer">Retry Payment</button>
  </template>
</template>
