<script setup>
import Transaction from "@/models/transaction.js";
import {computed, onUnmounted, watch} from "vue";
import PaymentState from "@/enums/payment_state.js";
import PaymentCompleted from "@/components/Payment/State/PaymentCompleted.vue";
import Processing from "@/components/Payment/State/Processing.vue";
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
})

const {stopPolling} = usePaymentWatch(props.transaction, {
  isReady: () => props.transaction.payment.state.code === PaymentState.PENDING,
  isFinal: () => FINAL_STATES.includes(props.transaction.payment.state.code),
});

const emit = defineEmits([
  'retryPayment',
]);



let redirectTimeoutId = null;




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
    stopPolling();
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
    stopPolling();
  }
}, {immediate: true});

onUnmounted(() => clearTimeout(redirectTimeoutId));
</script>

<template>
  <template v-if="status === 'pending'">
    <Processing class="-mt-10" />
    <h2 class="text-xl font-semibold text-gray-900 mb-5 -mt-10">Completing your payment</h2>
    <p class="text-base text-gray-600 mb-6">We're taking {{ transaction.payment.totalPaymentAmountCurrencyPrefixed }} from your wallet – this only takes a moment.</p>
  </template>

  <template v-else-if="status === 'completed'">
    <PaymentCompleted class="-mt-10" />
    <h2 class="text-xl font-semibold text-success-700 mb-5 -mt-10">Payment received</h2>
    <p class="text-lg text-gray-600 mb-2">Paid from your wallet. Your transfer is on its way.</p>
    <p class="text-sm/6 text-gray-500 mb-6">Taking you to your transfer&hellip;</p>
  </template>

  <template v-else-if="status === 'failed'">
    <Failed class="-mt-20" />
    <h2 class="text-2xl font-semibold text-danger-600 mb-5 -mt-10">Payment failed</h2>
    <p class="text-base text-danger-600 mb-6">Your wallet payment could not be completed. Please try again.</p>
    <button @click="emit('retryPayment')" type="button" class="rounded-xl w-full bg-brand-700 px-6 py-2.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-brand-800 cursor-pointer">Reintentar el pago</button>
  </template>
</template>
