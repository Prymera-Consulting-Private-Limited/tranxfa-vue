<script setup>
import Transaction from "@/models/transaction.js";
import {onMounted, onUnmounted, watch, watchEffect} from "vue";
import PaymentTransactionState from "@/models/payment_transaction_state.js";
import PaymentState from "@/enums/payment_state.js";
import AwaitingPending from "@/components/Payment/State/AwaitingPending.vue";
import PendingReceived from "@/components/Payment/State/PendingReceived.vue";
import PaymentCompleted from "@/components/Payment/State/PaymentCompleted.vue";
import router from "@/router/index.js";

const props = defineProps({
  transaction: {
    type: Object(Transaction),
    required: true
  }
})

onMounted(async () => {
  Echo.channel(`client-payment.${props.transaction.payment.id}`)
      .listen('PaymentTransactionStateUpdated', (e) => {
        props.transaction.payment.state = PaymentTransactionState.getInstance(e.state);
      });
  if (props.transaction.payment.state.code === PaymentState.PENDING) {
    props.transaction.payment.state.code = PaymentState.REDIRECTED;
  } else if (props.transaction.payment.state.code === PaymentState.AUTHORIZED || props.transaction.payment.state.code === PaymentState.CAPTURED) {
    await router.push({name: 'viewTransaction', params: {transactionId: props.transaction.id}});
  }
})

watchEffect(() => {
  if (props.transaction.payment.state.code === PaymentState.PENDING) {
    props.transaction.payment.state.code = PaymentState.REDIRECTED;
  }
  if (props.transaction.payment.state.code === PaymentState.AUTHORIZED ||  props.transaction.payment.state.code === PaymentState.CAPTURED) {
    router.push({name: 'viewTransaction', params: {transactionId: props.transaction.id}});
  }
})

onUnmounted(async () => {
  Echo.leaveChannel(`client-payment.${props.transaction.payment.id}`);
})

</script>

<template>
  <template v-if="transaction.payment.state.code === PaymentState.REDIRECTED">
    <PendingReceived class="-mt-10" />
    <h2 class="text-2xl font-semibold text-gray-900 mb-5 -mt-10">Payment in Progress</h2>
    <p class="text-base text-gray-600">Please make a bank transfer of {{ transaction.payment.totalPaymentAmountCurrencyPrefixed }} to our following bank account.</p>
  </template>

  <template v-else-if="transaction.payment.state.code === PaymentState.AUTHORIZED || transaction.payment.state.code === PaymentState.CAPTURED">
    <PaymentCompleted class="-mt-10" />
    <h2 class="text-2xl font-semibold text-green-700 mb-5 -mt-10">Payment Successful</h2>
    <p class="text-base text-gray-600">Your payment has been successfully received.</p>
  </template>

  <template v-else>
    <AwaitingPending class="-mt-10" />
    <h2 class="text-2xl font-semibold text-gray-900 mb-5 -mt-10">Please wait...</h2>
    <p class="text-base text-gray-600">Please wait while we are setting up the payment.</p>
  </template>
</template>